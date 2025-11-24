import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";
import Pino from "pino";
import readline from "readline";
import chalk from "chalk";
import { serializeMessage } from "./Serializer.js";
import { Logger } from "./Logger.js";
import { GroupCache } from "./GroupCache.js";
import { SessionCleaner } from "./SessionCleaner.js";
import { RateLimiter } from "./RateLimiter.js";
import { MemoryMonitor } from "./MemoryMonitor.js";
import { QueueManager } from "./QueueManager.js";
import util from "util";
import { exec } from "child_process";

export class Connection {
    constructor(config, handler, loader, store) {
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
            
        this.sessionCleaner = config.sessionCleaner.enabled
            ? new SessionCleaner(config.sessionDir)
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
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );
        return delay;
    }

    async start() {
        if (this.reconnectAttempts === 0) {
            await this.loader.load();
        }

        const { state, saveCreds } = await useMultiFileAuthState(
            this.config.sessionDir
        );

        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    Pino({ level: "silent" })
                )
            },
            browser: Browsers.ubuntu("Chrome"),
            logger: Pino({ level: "silent" }),
            printQRInTerminal: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000
        });

        this.sock = sock;

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const number = await this.askNumber();
                    const code = await sock.requestPairingCode(number);
                    console.log(chalk.green(`\n✅ Code: ${chalk.bold(code)}\n`));
                } catch (err) {
                    console.error(chalk.red("Pairing failed:"), err);
                }
            }, 3000);
        }

        sock.ev.on("creds.update", saveCreds);
        
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (connection === "open") {
                Logger.logSuccess(`Connected as ${chalk.cyan.bold(sock.user.name)}`);

                this.reconnectAttempts = 0;
                this.reconnectDelay = 3000;
                this.isReconnecting = false;

                if (this.groupCache && !this.groupCache.isRunning) {
                    this.groupCache.startAutoCleanup();
                }
                
                if (this.sessionCleaner && this.reconnectAttempts === 0) {
                    await this.sessionCleaner.clean();
                    this.sessionCleaner.startAutoClean(this.config.sessionCleaner.autoCleanInterval);
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
                        Logger.logError(
                            chalk.red.bold(
                                `\n❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached!\n` +
                                `Please check your internet connection and restart the bot manually.\n`
                            )
                        );
                        process.exit(1);
                        return;
                    }

                    if (this.isReconnecting) {
                        return;
                    }

                    this.isReconnecting = true;
                    this.reconnectAttempts++;

                    const backoffDelay = this.calculateBackoff();
                    const remainingAttempts = this.maxReconnectAttempts - this.reconnectAttempts;

                    Logger.logWarning(
                        `Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) ` +
                        `in ${backoffDelay / 1000}s | Remaining: ${remainingAttempts}`
                    );

                    await new Promise(resolve => setTimeout(resolve, backoffDelay));

                    try {
                        await this.start();
                    } catch (err) {
                        Logger.logError(`Reconnection failed: ${err.message}`);
                        this.isReconnecting = false;
                    }
                } else {
                    Logger.logError("Logged out - Please scan QR code again");
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
            if (this.rateLimiter.isUserBanned(m.sender)) {
                return;
            }

            const userCheck = this.rateLimiter.checkUserLimit(
                m.sender, 
                this.config.rateLimiter.userLimits
            );
            
            if (!userCheck.allowed) {
                await m.reply("⚠️ Rate limit exceeded! Please slow down.");
                return;
            }

            if (m.isGroup) {
                const groupCheck = this.rateLimiter.checkGroupLimit(
                    m.chat,
                    this.config.rateLimiter.groupLimits
                );
                
                if (!groupCheck.allowed) {
                    return;
                }
            }
        }

        this.store.add(m.key.id, {
            from: m.sender,
            chat: m.chat,
            text: m.text
        });

        if (this.config.mode === "self") {
            const isOwner = this.config.owners.some(o => m.sender.includes(o));
            if (!isOwner && m.text && m.text.startsWith(this.config.prefix[0])) {
                return;
            }
        }

        const isOwner = this.config.owners.some(o => m.sender.includes(o));

        if (m.text && await this.handleEval(sock, m, isOwner)) return;
        if (m.text && await this.handleExec(sock, m, isOwner)) return;

        const ctx = {
            m,
            sock: {
                ...sock,
                loader: this.loader
            },
            config: this.config,
            handler: this.handler,
            store: this.store,
            groupCache: this.groupCache,
            sessionCleaner: this.sessionCleaner,
            rateLimiter: this.rateLimiter,
            memoryMonitor: this.memoryMonitor,
            queueManager: this.queueManager
        };

        const canContinue = await this.handler.runMiddlewares(ctx);
        if (!canContinue) return;

        const prefix = this.config.prefix.find(p => m.text.startsWith(p));
        if (!prefix) return;

        const args = m.text.slice(prefix.length).trim().split(/\s+/);
        const cmdName = args.shift()?.toLowerCase();
        
        if (!cmdName) return;

        const cmd = this.handler.get(cmdName);
        if (!cmd) return;

        if (cmd.ownerOnly && !isOwner) {
            return await m.reply("⛔ Owner only!");
        }

        if (cmd.groupOnly && !m.isGroup) {
            return await m.reply("⛔ Group only!");
        }

        if (cmd.privateOnly && m.isGroup) {
            return await m.reply("⛔ Private only!");
        }

        if (cmd.adminOnly && !m.isAdmin) {
            return await m.reply("⛔ Admin only!");
        }

        if (cmd.botAdminRequired && !m.isBotAdmin) {
            return await m.reply("⛔ Bot must be admin!");
        }

        if (!this.handler.checkSpam(m.sender, this.config)) {
            return await m.reply("⚠️ Spam detected! You're temporarily banned.");
        }

        const cooldown = this.handler.checkCooldown(m.sender, cmdName, this.config);
        if (!cooldown.ok) {
            return await m.reply(`⏳ Cooldown, Please Wait ${cooldown.timeLeft}s`);
        }

        const context = {
            m,
            args,
            sock: {
                ...sock,
                loader: this.loader
            },
            config: this.config,
            handler: this.handler,
            store: this.store,
            sys: this,
            groupCache: this.groupCache,
            sessionCleaner: this.sessionCleaner,
            rateLimiter: this.rateLimiter,
            memoryMonitor: this.memoryMonitor,
            queueManager: this.queueManager,
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
        const shouldBypass = bypassQueue.includes(cmdName);

        if (this.queueManager && !shouldBypass) {
            this.queueManager.add(m.chat, async () => {
                await this.handler.execute(cmdName, context);
            });
        } else {
            await this.handler.execute(cmdName, context);
        }
    }

    async handleEval(sock, m, isOwner) {
        const text = m.text;

        if (text.startsWith(">") && !text.startsWith("->")) {
            if (!isOwner) {
                Logger.logWarning(`Eval attempt by non-owner: ${m.sender}`);
                return false;
            }

            const code = text.slice(1).trim();
            if (!code) {
                await m.reply("Apa?");
                return true;
            }

            await this.executeEval(sock, m, code, false);
            return true;
        }

        if (text.startsWith("->")) {
            if (!isOwner) {
                Logger.logWarning(`Eval attempt by non-owner: ${m.sender}`);
                return false;
            }

            const code = text.slice(2).trim();
            if (!code) {
                await m.reply("Apa?");
                return true;
            }

            await this.executeEval(sock, m, code, true);
            return true;
        }

        return false;
    }

    async executeEval(sock, m, code, withReturn) {
        try {
            const wrappedCode = withReturn ? `return ${code}` : code;
            
            const evalFunc = new Function(
                "sock",
                "m",
                "config",
                "handler",
                "store",
                "groupCache",
                "sessionCleaner",
                "rateLimiter",
                "memoryMonitor",
                "queueManager",
                "util",
                "chalk",
                `return (async () => { ${wrappedCode} })()`
            );

            const result = await evalFunc(
                sock,
                m,
                this.config,
                this.handler,
                this.store,
                this.groupCache,
                this.sessionCleaner,
                this.rateLimiter,
                this.memoryMonitor,
                this.queueManager,
                util,
                chalk
            );

            const output = util.inspect(result, {
                depth: null,
                maxArrayLength: null,
                maxStringLength: null
            });

            await m.reply(output);
        } catch (error) {
            await m.reply(`❌ Error:\n${error.message}`);
        }
    }

    async handleExec(sock, m, isOwner) {
        const text = m.text;

        if (!text.startsWith("$")) return false;

        if (!isOwner) {
            Logger.logWarning(`Exec attempt by non-owner: ${m.sender}`);
            return false;
        }

        const cmd = text.slice(1).trim();
        if (!cmd) {
            await m.reply("Apa?");
            return true;
        }
        
        await this.executeExec(sock, m, cmd);
        return true;
    }

    async executeExec(sock, m, cmd) {
        try {
            const execPromise = util.promisify(exec);
            const { stdout, stderr } = await execPromise(cmd);
            
            let output = stdout || "";
            if (stderr) output += `\nError: ${stderr}`;
            if (!output) output = "✅ Executed (no output)";

            await m.reply(output);
        } catch (error) {
            Logger.logError(`Exec error: ${error.message}`);
            await m.reply(`❌ Error:\n${error.message}`);
        }
    }

    handleExit() {
        process.on("SIGINT", () => {
            Logger.logWarning("Shutting down gracefully...");
            this.store.flush();
            if (this.groupCache) this.groupCache.clear();
            if (this.sessionCleaner) this.sessionCleaner.clean();
            Logger.logSuccess("Goodbye! 👋\n");
            process.exit(0);
        });
    }
}