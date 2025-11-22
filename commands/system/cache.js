import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "cache",
    aliases: ["gc"],
    desc: "Manage group cache system",
    usage: "cache [--status|--clear|--on|--off|--cleanup]",
    category: "owner",
    ownerOnly: true,
    
    async execute({ args, config, reply, groupCache }) {
        if (args.length === 0) {
            let msg = `╭━━━ ${toSmallCaps('cache manager')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('usage')}:\n`;
            msg += `│ ≫ cache --status\n`;
            msg += `│    ${toSmallCaps('show cache stats')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cache --clear\n`;
            msg += `│    ${toSmallCaps('clear all cache')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cache --on\n`;
            msg += `│    ${toSmallCaps('enable cache')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cache --off\n`;
            msg += `│    ${toSmallCaps('disable cache')}\n`;
            msg += `│\n`;
            msg += `│ ≫ cache --cleanup\n`;
            msg += `│    ${toSmallCaps('manual cleanup')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            return await reply(msg);
        }

        const flag = args[0].toLowerCase();

        if (flag === "--status" || flag === "-s") {
            if (!config.groupCache.enabled) {
                return await reply(`⚠️ ${toSmallCaps('group cache is disabled in config')}!`);
            }

            if (!groupCache) {
                return await reply(`❌ ${toSmallCaps('group cache not initialized')}!`);
            }

            const size = groupCache.size();
            const ttlSeconds = config.groupCache.ttl / 1000;
            const ttlMinutes = (ttlSeconds / 60).toFixed(1);
            const cleanupMinutes = config.groupCache.cleanupInterval / 60000;
            
            let msg = `╭━━━ ${toSmallCaps('group cache stats')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('status')}: ${config.groupCache.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
            msg += `│ ${toSmallCaps('cached groups')}: ${size}\n`;
            msg += `│ ${toSmallCaps('ttl')}: ${ttlSeconds}s (${ttlMinutes}m)\n`;
            msg += `│ ${toSmallCaps('auto-cleanup')}: ${config.groupCache.autoCleanup ? 'Enabled' : 'Disabled'}\n`;
            msg += `│ ${toSmallCaps('cleanup interval')}: ${cleanupMinutes}m\n`;
            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('configure in config.js')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await reply(msg);
        }

        if (flag === "--clear" || flag === "-c") {
            if (!config.groupCache.enabled) {
                return await reply(`⚠️ ${toSmallCaps('cache is disabled')}!`);
            }

            if (!groupCache) {
                return await reply(`❌ ${toSmallCaps('cache not initialized')}!`);
            }

            const sizeBefore = groupCache.size();
            
            if (sizeBefore === 0) {
                return await reply(`ℹ️ ${toSmallCaps('cache is already empty')}!`);
            }

            groupCache.clear();

            let msg = `╭━━━ ${toSmallCaps('cache cleared')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 🗑️ ${toSmallCaps('removed')}: ${sizeBefore} ${toSmallCaps('cached groups')}\n`;
            msg += `│ 💾 ${toSmallCaps('current')}: ${groupCache.size()} ${toSmallCaps('cached groups')}\n`;
            msg += `│\n`;
            msg += `│ ℹ️ ${toSmallCaps('next group access will fetch fresh data')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            return await reply(msg);
        }

        if (flag === "--on" || flag === "--enable") {
            if (config.groupCache.enabled) {
                return await reply(`✅ ${toSmallCaps('cache already enabled')}!`);
            }

            config.groupCache.enabled = true;
            
            let msg = `╭━━━ ${toSmallCaps('cache enabled')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ⚠️ ${toSmallCaps('note')}: ${toSmallCaps('this is temporary')}!\n`;
            msg += `│ ${toSmallCaps('cache will be disabled after restart')}\n`;
            msg += `│ ${toSmallCaps('to make it permanent, edit config.js')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await reply(msg);
        }

        if (flag === "--off" || flag === "--disable") {
            if (!config.groupCache.enabled) {
                return await reply(`❌ ${toSmallCaps('cache already disabled')}!`);
            }

            config.groupCache.enabled = false;
            
            if (groupCache) {
                const cleared = groupCache.size();
                groupCache.clear();
                
                let msg = `╭━━━ ${toSmallCaps('cache disabled')} ━━━\n`;
                msg += `│\n`;
                msg += `│ 🗑️ ${toSmallCaps('cleared')}: ${cleared} ${toSmallCaps('cached groups')}\n`;
                msg += `│ ⚠️ ${toSmallCaps('note')}: ${toSmallCaps('this is temporary')}!\n`;
                msg += `│ ${toSmallCaps('cache will be re-enabled after restart')}\n`;
                msg += `│ ${toSmallCaps('to make it permanent, edit config.js')}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                return await reply(msg);
            }
            
            return await reply(`❌ ${toSmallCaps('cache disabled')} (${toSmallCaps('no data to clear')})`);
        }

        if (flag === "--cleanup" || flag === "--clean") {
            if (!config.groupCache.enabled) {
                return await reply(`⚠️ ${toSmallCaps('cache is disabled')}!`);
            }

            if (!groupCache) {
                return await reply(`❌ ${toSmallCaps('cache not initialized')}!`);
            }

            const sizeBefore = groupCache.size();
            const removed = groupCache.cleanup();
            const sizeAfter = groupCache.size();

            let msg = `╭━━━ ${toSmallCaps('manual cleanup complete')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 📊 ${toSmallCaps('before')}: ${sizeBefore} ${toSmallCaps('cached groups')}\n`;
            msg += `│ 🗑️ ${toSmallCaps('removed')}: ${removed} ${toSmallCaps('expired entries')}\n`;
            msg += `│ 💾 ${toSmallCaps('after')}: ${sizeAfter} ${toSmallCaps('cached groups')}\n`;
            msg += `│\n`;
            msg += `│ ${removed === 0 ? `✨ ${toSmallCaps('no expired entries found')}!` : `✅ ${toSmallCaps('expired cache cleared')}!`}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            return await reply(msg);
        }

        await reply(`❌ ${toSmallCaps('unknown flag')}: ${flag}\n\n${toSmallCaps('use')}: cache (${toSmallCaps('without flags to see help')})`);
    }
};