import chalk from "chalk";
import { Logger } from "./Logger.js";

export class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.categories = new Map();
        this.middlewares = new Map();
        this.stats = {
            commandsRun: 0,
            messagesReceived: 0,
            startedAt: Date.now()
        };
        this.userCommands = new Map();
        this.cooldowns = new Map();
        this.bannedUsers = new Set();
    }

    register(spec) {
        const {
            name,
            aliases = [],
            category = "general",
            execute,
            desc = "No description",
            usage = name,
            cooldown = 3,
            ownerOnly = false,
            adminOnly = false,
            groupOnly = false,
            privateOnly = false,
            botAdminRequired = false,
            waitMessage = null,
            mediaType = null
        } = spec;

        if (this.commands.has(name.toLowerCase())) {
            console.log(chalk.yellow(`⚠️  Command "${name}" already registered, skipping...`));
            return this;
        }
    
        const command = {
            name,
            execute,
            desc,
            usage,
            cooldown,
            ownerOnly,
            adminOnly,
            groupOnly,
            privateOnly,
            botAdminRequired,
            waitMessage,
            mediaType,
            category
        };
    
        this.commands.set(name.toLowerCase(), command);

        aliases.forEach(alias => {
            const aliasLower = alias.toLowerCase();
            if (this.aliases.has(aliasLower)) {
                console.log(chalk.yellow(`⛔  Alias "${alias}" already used, skipping...`));
            } else {
                this.aliases.set(aliasLower, name.toLowerCase());
            }
        });

        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }

        const catCommands = this.categories.get(category);
        if (!catCommands.includes(name)) {
            catCommands.push(name);
        }
    
        return this;
    }

    get(name) {
        const cmdName = this.aliases.get(name.toLowerCase()) || name.toLowerCase();
        return this.commands.get(cmdName);
    }

    all() {
        return Array.from(this.commands.values());
    }

    getCategory(cat) {
        const names = this.categories.get(cat) || [];
        return names.map(n => this.commands.get(n.toLowerCase())).filter(Boolean);
    }

    getCategories() {
        return Array.from(this.categories.keys());
    }

    use(name, fn) {
        this.middlewares.set(name, fn);
    }

    async runMiddlewares(ctx) {
        for (const [name, fn] of this.middlewares) {
            try {
                const result = await fn(ctx);
                if (result === false) {
                    console.log(chalk.yellow(`⛔ Middleware "${name}" blocked`));
                    return false;
                }
            } catch (err) {
                console.error(chalk.red(`❌ Middleware "${name}":`), err.message);
            }
        }
        return true;
    }

    checkSpam(userId, config) {
        if (!config.antiSpam.enabled) return true;

        if (this.bannedUsers.has(userId)) {
            return false;
        }

        const now = Date.now();
        const userLog = this.userCommands.get(userId) || [];
        
        const recent = userLog.filter(time => now - time < 60000);
        
        if (recent.length >= config.antiSpam.maxPerMinute) {
            this.bannedUsers.add(userId);
            setTimeout(() => {
                this.bannedUsers.delete(userId);
            }, config.antiSpam.banTime);
            return false;
        }

        recent.push(now);
        this.userCommands.set(userId, recent);
        return true;
    }

    checkCooldown(userId, cmdName, config) {
        const now = Date.now();
        
        if (!this.cooldowns.has(userId)) {
            this.cooldowns.set(userId, new Map());
        }

        const userCooldowns = this.cooldowns.get(userId);
        const cmd = this.get(cmdName);
        
        if (!cmd) return true;

        const cooldownTime = (cmd.cooldown * 1000) || config.cooldown;
        const lastUsed = userCooldowns.get(cmdName) || 0;

        if (now - lastUsed < cooldownTime) {
            const timeLeft = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
            return { ok: false, timeLeft };
        }

        userCooldowns.set(cmdName, now);
        return { ok: true };
    }

    async execute(cmdName, ctx) {
        const cmd = this.get(cmdName);
        if (!cmd) return false;

        try {
            if (cmd.waitMessage) {
                await ctx.reply(cmd.waitMessage);
            }

            await cmd.execute(ctx);
            this.stats.commandsRun++;
            return true;
        } catch (err) {
            Logger.logError(`Command error: ${err.message}`);
            await ctx.reply(`❌ Error: ${err.message}`);
            return false;
        }
    }

    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startedAt
        };
    }

    updateStats(type) {
        if (type === "message") this.stats.messagesReceived++;
        if (type === "command") this.stats.commandsRun++;
    }
}