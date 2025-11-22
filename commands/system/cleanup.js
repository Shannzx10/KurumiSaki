import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "cleanup",
    aliases: ["clean"],
    desc: "Perform system cleanup",
    usage: "cleanup [--session|--cache|--rate|--memory|--all]",
    category: "owner",
    ownerOnly: true,
    cooldown: 10,
    
    async execute({ args, reply, groupCache, sessionCleaner, rateLimiter, memoryMonitor, m }) {
        if (args.length === 0) {
            let msg = `╭━━━ ${toSmallCaps('cleanup manager')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('usage')}:\n`;
            msg += `│ ≫ cleanup --session\n`;
            msg += `│    ${toSmallCaps('clean session files')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cleanup --cache\n`;
            msg += `│    ${toSmallCaps('clear group cache')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cleanup --rate\n`;
            msg += `│    ${toSmallCaps('clear rate limits')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cleanup --memory\n`;
            msg += `│    ${toSmallCaps('trigger garbage collection')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cleanup --all\n`;
            msg += `│    ${toSmallCaps('clean everything')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            return await reply(msg);
        }

        const flag = args[0].toLowerCase();

        if (flag === "--session" || flag === "-s") {
            if (!sessionCleaner) {
                return await reply(`❌ ${toSmallCaps('session cleaner disabled')}!`);
            }

            const sizeBefore = await sessionCleaner.getSessionSize();
            const removed = await sessionCleaner.clean();
            const sizeAfter = await sessionCleaner.getSessionSize();

            let msg = `╭━━━ ${toSmallCaps('session cleaned')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 📊 ${toSmallCaps('before')}: ${sessionCleaner.formatSize(sizeBefore)}\n`;
            msg += `│ 🗑️ ${toSmallCaps('removed')}: ${removed} ${toSmallCaps('files')}\n`;
            msg += `│ 📊 ${toSmallCaps('after')}: ${sessionCleaner.formatSize(sizeAfter)}\n`;
            msg += `│ 💾 ${toSmallCaps('saved')}: ${sessionCleaner.formatSize(sizeBefore - sizeAfter)}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            return await reply(msg);
        }

        if (flag === "--cache" || flag === "-c") {
            if (!groupCache) {
                return await reply(`❌ ${toSmallCaps('group cache disabled')}!`);
            }

            const sizeBefore = groupCache.size();
            groupCache.clear();

            let msg = `╭━━━ ${toSmallCaps('cache cleared')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 🗑️ ${toSmallCaps('removed')}: ${sizeBefore} ${toSmallCaps('cached groups')}\n`;
            msg += `│ 💾 ${toSmallCaps('current')}: ${groupCache.size()} ${toSmallCaps('cached groups')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            return await reply(msg);
        }

        if (flag === "--rate" || flag === "-r") {
            if (!rateLimiter) {
                return await reply(`❌ ${toSmallCaps('rate limiter disabled')}!`);
            }

            const cleaned = rateLimiter.cleanup();
            const stats = rateLimiter.getStats();

            let msg = `╭━━━ ${toSmallCaps('rate limits cleaned')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 🗑️ ${toSmallCaps('unbanned')}: ${cleaned} ${toSmallCaps('users')}\n`;
            msg += `│ 👥 ${toSmallCaps('active users')}: ${stats.activeUsers}\n`;
            msg += `│ 🚫 ${toSmallCaps('still banned')}: ${stats.bannedUsers}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            return await reply(msg);
        }

        if (flag === "--memory" || flag === "-m") {
            if (!memoryMonitor) {
                return await reply(`❌ ${toSmallCaps('memory monitor disabled')}!`);
            }

            const before = memoryMonitor.getMemoryUsage();
            
            if (global.gc) {
                await m.react("🔄");
                
                await new Promise(resolve => {
                    setImmediate(() => {
                        global.gc();
                        resolve();
                    });
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const after = memoryMonitor.getMemoryUsage();
                
                await m.react("✅");
                
                let msg = `╭━━━ ${toSmallCaps('garbage collection')} ━━━\n`;
                msg += `│\n`;
                msg += `│ 📊 ${toSmallCaps('before')}:\n`;
                msg += `│ • ${toSmallCaps('heap')}: ${memoryMonitor.formatMemory(before.heapUsed)}\n`;
                msg += `│ • ${toSmallCaps('rss')}: ${memoryMonitor.formatMemory(before.rss)}\n`;
                msg += `│\n`;
                msg += `│ 📊 ${toSmallCaps('after')}:\n`;
                msg += `│ • ${toSmallCaps('heap')}: ${memoryMonitor.formatMemory(after.heapUsed)}\n`;
                msg += `│ • ${toSmallCaps('rss')}: ${memoryMonitor.formatMemory(after.rss)}\n`;
                msg += `│\n`;
                msg += `│ 💾 ${toSmallCaps('freed')}: ${memoryMonitor.formatMemory(Math.max(0, before.heapUsed - after.heapUsed))}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                return await reply(msg);
            } else {
                let msg = `╭━━━ ${toSmallCaps('manual gc not available')} ━━━\n`;
                msg += `│\n`;
                msg += `│ ⚠️ ${toSmallCaps('run with')}:\n`;
                msg += `│ node --expose-gc index.js\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                return await reply(msg);
            }
        }

        if (flag === "--all" || flag === "-a") {
            await m.react("🔄");
            
            let msg = `╭━━━ ${toSmallCaps('full system cleanup')} ━━━\n│\n`;
            let steps = [];

            if (sessionCleaner) {
                try {
                    const removed = await sessionCleaner.clean();
                    steps.push(`│ ✅ ${toSmallCaps('session')}: ${removed} ${toSmallCaps('files removed')}`);
                } catch (err) {
                    steps.push(`│ ❌ ${toSmallCaps('session')}: ${err.message}`);
                }
            }

            if (groupCache) {
                try {
                    const size = groupCache.size();
                    groupCache.clear();
                    steps.push(`│ ✅ ${toSmallCaps('cache')}: ${size} ${toSmallCaps('groups cleared')}`);
                } catch (err) {
                    steps.push(`│ ❌ ${toSmallCaps('cache')}: ${err.message}`);
                }
            }

            if (rateLimiter) {
                try {
                    const cleaned = rateLimiter.cleanup();
                    steps.push(`│ ✅ ${toSmallCaps('rate')}: ${cleaned} ${toSmallCaps('users unbanned')}`);
                } catch (err) {
                    steps.push(`│ ❌ ${toSmallCaps('rate')}: ${err.message}`);
                }
            }

            if (global.gc && memoryMonitor) {
                try {
                    const before = memoryMonitor.getMemoryUsage();
                    
                    await new Promise(resolve => {
                        setImmediate(() => {
                            global.gc();
                            resolve();
                        });
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const after = memoryMonitor.getMemoryUsage();
                    const freed = Math.max(0, before.heapUsed - after.heapUsed);
                    steps.push(`│ ✅ ${toSmallCaps('memory')}: ${memoryMonitor.formatMemory(freed)} ${toSmallCaps('freed')}`);
                } catch (err) {
                    steps.push(`│ ❌ ${toSmallCaps('memory')}: ${err.message}`);
                }
            }

            msg += steps.join('\n');
            msg += `\n│\n│ ✅ ${toSmallCaps('cleanup complete')}!\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await m.react("✅");
            return await reply(msg);
        }

        await reply(`❌ ${toSmallCaps('unknown flag')}. ${toSmallCaps('use')}: cleanup (${toSmallCaps('without flags to see help')})`);
    }
};