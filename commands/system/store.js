
import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "store",
    aliases: ["ms", "msgstore"],
    desc: "Manage message store system",
    usage: "store [--status|--save|--clear|--search|--get]",
    category: "owner",
    ownerOnly: true,
    
    async execute({ args, config, reply, store }) {
        if (args.length === 0) {
            let msg = `╭━━━ ${toSmallCaps('message store manager')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('usage')}:\n`;
            msg += `│ ≫ store --status\n`;
            msg += `│    ${toSmallCaps('show statistics')}\n`;
            msg += `│\n`;
            msg += `│ ≫ store --save\n`;
            msg += `│    ${toSmallCaps('force save to disk')}\n`;
            msg += `│\n`;
            msg += `│ ≫ store --clear\n`;
            msg += `│    ${toSmallCaps('clear all messages')}\n`;
            msg += `│\n`;
            msg += `│ ≫ store --search <text>\n`;
            msg += `│    ${toSmallCaps('search messages')}\n`;
            msg += `│\n`;
            msg += `│ ≫ store --get <id>\n`;
            msg += `│    ${toSmallCaps('get message by id')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            return await reply(msg);
        }

        const flag = args[0].toLowerCase();

        if (flag === "--status" || flag === "-s") {
            const size = store.store.size;
            const maxMessages = config.maxMessages;
            const saveEnabled = config.saveMessages;
            const autoSaveInterval = config.autoSaveInterval;
            const saveCounter = store.saveCounter;
            const percentage = ((size / maxMessages) * 100).toFixed(1);
            
            let msg = `╭━━━ ${toSmallCaps('message store stats')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('status')}: ${saveEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
            msg += `│ ${toSmallCaps('stored')}: ${size}/${maxMessages} (*${percentage}%*)\n`;
            msg += `│ ${toSmallCaps('save counter')}: ${saveCounter}\n`;
            msg += `│ ${toSmallCaps('auto-save')}: ${toSmallCaps('every')} ${autoSaveInterval} ${toSmallCaps('messages')}\n`;
            msg += `│ ${toSmallCaps('path')}: ${store.storePath}\n`;
            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('configure in config.js')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await reply(msg);
        }

        if (flag === "--save" || flag === "-sv") {
            if (!config.saveMessages) {
                return await reply(`⚠️ ${toSmallCaps('message saving is disabled in config')}!`);
            }

            const size = store.store.size;
            store.save();
            
            let msg = `╭━━━ ${toSmallCaps('manual save complete')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('saved')}: ${size} ${toSmallCaps('messages')}\n`;
            msg += `│ 📁 ${toSmallCaps('location')}: session/messages.json\n`;
            msg += `│ ⏱️ ${toSmallCaps('timestamp')}: ${new Date().toLocaleString('id-ID')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await reply(msg);
        }

        if (flag === "--clear" || flag === "-c") {
            const sizeBefore = store.store.size;
            
            if (sizeBefore === 0) {
                return await reply(`ℹ️ ${toSmallCaps('store is already empty')}!`);
            }

            store.store.clear();
            store.saveCounter = 0;
            store.save();

            let msg = `╭━━━ ${toSmallCaps('store cleared')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 🗑️ ${toSmallCaps('removed')}: ${sizeBefore} ${toSmallCaps('messages')}\n`;
            msg += `│ 💾 ${toSmallCaps('current')}: ${store.store.size} ${toSmallCaps('messages')}\n`;
            msg += `│ 🔄 ${toSmallCaps('counter reset to')} 0\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('changes saved to disk')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            return await reply(msg);
        }

        if (flag === "--search" || flag === "-f") {
            if (!config.saveMessages) {
                return await reply(`⚠️ ${toSmallCaps('message saving is disabled')}!`);
            }

            if (args.length < 2) {
                return await reply(`❌ ${toSmallCaps('usage')}: store --search <text>`);
            }

            const query = args.slice(1).join(" ").toLowerCase();
            const results = [];

            for (const [msgId, data] of store.store.entries()) {
                if (data.text && data.text.toLowerCase().includes(query)) {
                    results.push({
                        id: msgId,
                        from: data.from,
                        text: data.text.substring(0, 50) + (data.text.length > 50 ? "..." : ""),
                        timestamp: data.timestamp
                    });
                }
                if (results.length >= 10) break;
            }

            if (results.length === 0) {
                return await reply(`❌ ${toSmallCaps('no messages found with')}: "${query}"`);
            }

            let msg = `╭━━━ ${toSmallCaps('search results')} (${results.length}) ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('query')}: "${query}"\n`;
            msg += `│\n`;

            results.forEach((r, i) => {
                const date = new Date(r.timestamp).toLocaleString('id-ID');
                msg += `│ ${i + 1}. ${r.from}\n`;
                msg += `│    ${r.text}\n`;
                msg += `│    📅 ${date}\n`;
                if (i < results.length - 1) msg += `│\n`;
            });

            msg += `╰━━━━━━━━━━━━━━━━`;
            return await reply(msg);
        }

        if (flag === "--get" || flag === "-g") {
            if (!config.saveMessages) {
                return await reply(`⚠️ ${toSmallCaps('message saving is disabled')}!`);
            }

            if (args.length < 2) {
                return await reply(`❌ ${toSmallCaps('usage')}: store --get <message-id>`);
            }

            const msgId = args[1];
            const data = store.get(msgId);

            if (!data) {
                return await reply(`❌ ${toSmallCaps('message not found')}: ${msgId}`);
            }

            const date = new Date(data.timestamp).toLocaleString('id-ID');
            
            let msg = `╭━━━ ${toSmallCaps('message details')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 🆔 ${toSmallCaps('id')}: ${msgId}\n`;
            msg += `│ 👤 ${toSmallCaps('from')}: ${data.from}\n`;
            msg += `│ 💬 ${toSmallCaps('chat')}: ${data.chat}\n`;
            msg += `│ 📅 ${toSmallCaps('time')}: ${date}\n`;
            msg += `│\n`;
            msg += `│ 📝 ${toSmallCaps('content')}:\n`;
            msg += `│ ${data.text || `[${toSmallCaps('no text')}]`}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await reply(msg);
        }

        await reply(`❌ ${toSmallCaps('unknown flag')}: ${flag}\n\n${toSmallCaps('use')}: store (${toSmallCaps('without flags to see help')})`);
    }
};