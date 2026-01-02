import makeWASocket, {
    DisconnectReason,
    Browsers,
    makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";
import Pino from "pino";
import readline from "readline";
import chalk from "chalk";
import fs from "fs";
import util from "util";
import { exec } from "child_process";
import { serializeMessage } from "./Serializer.js";
import { Logger } from "./Logger.js";
import { GroupCache } from "./GroupCache.js";
import { RateLimiter } from "./RateLimiter.js";
import { MemoryMonitor } from "./MemoryMonitor.js";
import { QueueManager } from "./QueueManager.js";
import { useTursoAuthState } from "./TursoAuth.js";

export class Connection {
    constructor(config, handler, loader, store) {
        if (!config) throw new Error("Config object is missing!");
        
        this.config = config;
        this.handler = handler;
        this.loader = loader;
        this.store = store;
        this.sock = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.maxReconnectDelay = 60000;
        this.isReconnecting = false;
        
        this.groupCache = config.groupCache.enabled 
            ? new GroupCache(config.groupCache.ttl) 
            : null;

        this.rateLimiter = config.rateLimiter.enabled
            ? new RateLimiter(config)
            : null;
            
        this.memoryMonitor = config.memoryMonitor.enabled
            ? new MemoryMonitor(config.memoryMonitor)
            : null;
            
        this.queueManager = config.queueManager.enabled
            ? new QueueManager(config.queueManager)
            : null;
    }

    async askNumber() {
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(
                chalk.yellow("📱 Enter WhatsApp number (e.g. 628xxx): "),
                answer => {
                    rl.close();
                    resolve(answer.trim());
                }
            );
        });
    }

    calculateBackoff() {
        return Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );
    }

    async start() {
        try {
            if (this.reconnectAttempts === 0) {
                await this.loader.load();
            }

            let authState, saveCreds;
            if (this.config.turso?.enabled) {
                Logger.logInfo("Using Turso Cloud Database for Session");
                const auth = await useTursoAuthState(this.config);
                authState = auth.state;
                saveCreds = auth.saveCreds;
            } else {
                const databaseDir = this.config.databaseDir || "database";
                if (!fs.existsSync(databaseDir)) {
                    fs.mkdirSync(databaseDir, { recursive: true });
                }
                const { useSQLiteAuthState } = await import("./SQLiteAuth.js");
                const auth = await useSQLiteAuthState(databaseDir);
                authState = auth.state;
                saveCreds = auth.saveCreds;
            }

            const sock = makeWASocket({
                auth: {
                    creds: authState.creds,
                    keys: makeCacheableSignalKeyStore(
                        authState.keys,
                        Pino({ level: "silent" })
                    )
                },
                browser: Browsers.ubuntu("Chrome"),
                logger: Pino({ level: "silent" }),
                printQRInTerminal: false, // Kita pakai Pairing Code
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000
            });

            this.sock = sock;

            if (!sock.authState.creds.registered) {
                setTimeout(async () => {
                    try {
                        let number = this.config.pairingNumber;

                        if (!number) {
                            Logger.logWarning("Pairing number not found in config/env. Switching to interactive mode...");
                            number = await this.askNumber();
                        } else {
                            Logger.logInfo(`Using pairing number from config: ${number}`);
                        }

                        if (number) {
                            const code = await sock.requestPairingCode(number);
                            console.log(chalk.green(`\n✅ Code: ${chalk.bold(code)}\n`));
                        } else {
                            Logger.logError("No pairing number provided!");
                        }
                    } catch (err) {
                        console.error(chalk.red("Pairing failed:"), err);
                    }
                }, 4000);
            }

            sock.ev.on("creds.update", saveCreds);
            
            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    Logger.logSuccess(`Connected as ${chalk.cyan.bold(sock.user.name)}`);

                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 3000;
                    this.isReconnecting = false;

                    if (this.groupCache && !this.groupCache.isRunning) {
                        this.groupCache.startAutoCleanup();
                    }
                    
                    if (this.memoryMonitor && !this.memoryMonitor.isRunning) {
                        this.memoryMonitor.startMonitoring();
                    }
                }

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const reason = lastDisconnect?.error?.output?.payload?.error;
                    
                    Logger.logError(`Connection closed: ${reason || 'Unknown'} (${statusCode || 'N/A'})`);

                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    if (shouldReconnect) {
                        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                            Logger.logError(chalk.red.bold(`❌ Max reconnection attempts reached! Restarting...`));
                            process.exit(1);
                        }

                        if (this.isReconnecting) return;

                        this.isReconnecting = true;
                        this.reconnectAttempts++;
                        const backoffDelay = this.calculateBackoff();

                        Logger.logWarning(`Reconnecting... (Attempt ${this.reconnectAttempts}) in ${backoffDelay / 1000}s`);

                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                        await this.start();
                    } else {
                        Logger.logError("Logged out - Please delete session and scan again");
                        process.exit(0);
                    }
                }

                if (connection === "connecting") {
                    Logger.logInfo("Connecting to WhatsApp...");
                }
            });

            sock.ev.on("messages.upsert", async ({ messages }) => {
                await this.handleMessage(sock, messages[0]);
            });

            sock.ev.on("groups.update", (updates) => {
                if (!this.groupCache) return;
                for (const update of updates) {
                    if (update.id) this.groupCache.delete(update.id);
                }
            });

            this.handleExit();
        } catch (error) {
            Logger.logError(`Start error: ${error.message}`);
            console.error(error); 
            setTimeout(() => this.start(), 5000);
        }
    }

    async getGroupMetadata(groupId) {
        if (!this.groupCache) {
            return await this.sock.groupMetadata(groupId);
        }
        const cached = this.groupCache.get(groupId);
        if (cached) return cached;
        try {
            const metadata = await this.sock.groupMetadata(groupId);
            this.groupCache.set(groupId, metadata);
            return metadata;
        } catch (err) {
            Logger.logError(`Failed to fetch group metadata: ${err.message}`);
            return null;
        }
    }

    async handleMessage(sock, raw) {
        if (!raw.message) return;

        const m = await serializeMessage(raw, sock, this);
        this.handler.updateStats("message");
        Logger.logMessage(m);

        if (this.rateLimiter) {
            if (this.rateLimiter.isUserBanned(m.sender)) return;
            const userCheck = this.rateLimiter.checkUserLimit(m.sender, this.config.rateLimiter.userLimits);
            if (!userCheck.allowed) {
                await m.reply("⚠️ Rate limit exceeded! Please slow down.");
                return;
            }
        }

        // --- STORE ASYNC HANDLER ---
        this.store.add(m.key.id, {
            from: m.sender,
            chat: m.chat,
            text: m.text
        });
        // ---------------------------

        if (this.config.mode === "self") {
            const isOwner = this.config.owners.some(o => m.sender.includes(o));
            if (!isOwner && m.text && m.text.startsWith(this.config.prefix[0])) return;
        }

        const isOwner = this.config.owners.some(o => m.sender.includes(o));

        if (m.text && await this.handleEval(sock, m, isOwner)) return;
        if (m.text && await this.handleExec(sock, m, isOwner)) return;

        const ctx = {
            m,
            sock: { ...sock, loader: this.loader },
            config: this.config,
            handler: this.handler,
            store: this.store,
            groupCache: this.groupCache,
            rateLimiter: this.rateLimiter,
            memoryMonitor: this.memoryMonitor,
            queueManager: this.queueManager
        };

        if (!(await this.handler.runMiddlewares(ctx))) return;

        const prefix = this.config.prefix.find(p => m.text.startsWith(p));
        if (!prefix) return;

        const args = m.text.slice(prefix.length).trim().split(/\s+/);
        const cmdName = args.shift()?.toLowerCase();
        if (!cmdName) return;

        const cmd = this.handler.get(cmdName);
        if (!cmd) return;

        if (cmd.ownerOnly && !isOwner) return await m.reply("⛔ Owner only!");
        if (cmd.groupOnly && !m.isGroup) return await m.reply("⛔ Group only!");
        if (cmd.privateOnly && m.isGroup) return await m.reply("⛔ Private only!");
        if (cmd.adminOnly && !m.isAdmin) return await m.reply("⛔ Admin only!");
        if (cmd.botAdminRequired && !m.isBotAdmin) return await m.reply("⛔ Bot must be admin!");

        if (!this.handler.checkSpam(m.sender, this.config)) return await m.reply("⚠️ Spam detected!");

        const cooldown = this.handler.checkCooldown(m.sender, cmdName, this.config);
        if (!cooldown.ok) return await m.reply(`⏳ Cooldown: ${cooldown.timeLeft}s`);

        const context = {
            ...ctx,
            args,
            sys: this,
            reply: m.reply.bind(m),
            react: m.react.bind(m),
            isOwner,
            isGroup: m.isGroup,
            isAdmin: m.isAdmin,
            isBotAdmin: m.isBotAdmin,
            quoted: m.quoted,
            mentions: m.mentions
        };

        const bypassQueue = ["cleanup", "clean", "system", "sys", "reload"];
        if (this.queueManager && !bypassQueue.includes(cmdName)) {
            this.queueManager.add(m.chat, async () => await this.handler.execute(cmdName, context));
        } else {
            await this.handler.execute(cmdName, context);
        }
    }

    async handleEval(sock, m, isOwner) {
        const text = m.text;
        if (!text.startsWith(">") && !text.startsWith("->")) return false;
        if (!isOwner) return false;

        const code = text.startsWith("->") ? text.slice(2).trim() : text.slice(1).trim();
        if (!code) { await m.reply("Apa?"); return true; }
        
        await this.executeEval(sock, m, code, text.startsWith("->"));
        return true;
    }

    async executeEval(sock, m, code, withReturn) {
        try {
            const evalFunc = new Function(
                "sock", "m", "config", "handler", "store", "groupCache", 
                "rateLimiter", "memoryMonitor", "queueManager", "util", "chalk",
                `return (async () => { ${withReturn ? `return ${code}` : code} })()`
            );
            const result = await evalFunc(
                sock, m, this.config, this.handler, this.store, this.groupCache,
                this.rateLimiter, this.memoryMonitor, this.queueManager, util, chalk
            );
            await m.reply(util.inspect(result, { depth: null }));
        } catch (error) {
            await m.reply(`❌ Error:\n${error.message}`);
        }
    }

    async handleExec(sock, m, isOwner) {
        if (!m.text.startsWith("$")) return false;
        if (!isOwner) return false;
        
        const cmd = m.text.slice(1).trim();
        if (!cmd) return true;

        try {
            const { stdout, stderr } = await util.promisify(exec)(cmd);
            let output = stdout || "";
            if (stderr) output += `\nError: ${stderr}`;
            await m.reply(output || "✅ Done");
        } catch (error) {
            await m.reply(`❌ Error:\n${error.message}`);
        }
        return true;
    }

    handleExit() {
        process.on("SIGINT", () => {
            Logger.logWarning("Shutting down...");
            this.store.flush();
            if (this.groupCache) this.groupCache.clear();
            process.exit(0);
        });
    }
}