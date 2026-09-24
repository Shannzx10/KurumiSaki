
import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "store",
    aliases: ["ms", "msgstore"],
    desc: "Manage message store system",
    usage: "store [--status|--save|--clear|--search|--get]",
    category: "owner",
    ownerOnly: true,
    
    async execute({ args, config, reply, store }) {
        // Tampilkan nomor asli kalau pengirim berupa @lid (resolve via session/lid-mapping).
        const fmtSender = async (jid) => {
            if (jid && jid.includes("@lid") && typeof store.resolveLid === "function") {
                const pn = await store.resolveLid(jid);
                if (pn) return `${pn}@s.whatsapp.net`;
            }
            return jid;
        };
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
            const size = await store.count();
            const maxMessages = config.maxMessages;
            const saveEnabled = config.saveMessages;
            const backend = config.turso?.enabled ? "Turso (cloud)" : "SQLite (local)";
            const dbPath = config.turso?.enabled
                ? (config.turso.url || "-")
                : `${config.databaseDir || "database"}/sqlite.db`;
            const percentage = maxMessages ? ((size / maxMessages) * 100).toFixed(1) : "0.0";
            
            let msg = `╭━━━ ${toSmallCaps('message store stats')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('status')}: ${saveEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
            msg += `│ ${toSmallCaps('backend')}: ${backend}\n`;
            msg += `│ ${toSmallCaps('stored')}: ${size}/${maxMessages} (*${percentage}%*)\n`;
            msg += `│ ${toSmallCaps('path')}: ${dbPath}\n`;
            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('configure in config.js')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await reply(msg);
        }

        if (flag === "--save" || flag === "-sv") {
            if (!config.saveMessages) {
                return await reply(`⚠️ ${toSmallCaps('message saving is disabled in config')}!`);
            }

            // SQLite/Turso auto-persist setiap write, jadi --save tinggal validasi + lapor.
            const size = await store.count();
            
            let msg = `╭━━━ ${toSmallCaps('manual save complete')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('saved')}: ${size} ${toSmallCaps('messages')}\n`;
            msg += `│ 💾 ${toSmallCaps('backend auto-persists, nothing pending')}\n`;
            msg += `│ ⏱️ ${toSmallCaps('timestamp')}: ${new Date().toLocaleString('id-ID')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await reply(msg);
        }

        if (flag === "--clear" || flag === "-c") {
            const sizeBefore = await store.count();

            if (sizeBefore === 0) {
                return await reply(`ℹ️ ${toSmallCaps('store is already empty')}!`);
            }

            await store.clear();

            let msg = `╭━━━ ${toSmallCaps('store cleared')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 🗑️ ${toSmallCaps('removed')}: ${sizeBefore} ${toSmallCaps('messages')}\n`;
            msg += `│ 💾 ${toSmallCaps('current')}: ${await store.count()} ${toSmallCaps('messages')}\n`;
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
            const results = await store.search(query, 10);

            if (results.length === 0) {
                return await reply(`❌ ${toSmallCaps('no messages found with')}: "${query}"`);
            }

            let msg = `╭━━━ ${toSmallCaps('search results')} (${results.length}) ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('query')}: "${query}"\n`;
            msg += `│\n`;

            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                const date = new Date(r.timestamp).toLocaleString('id-ID');
                const preview = r.text
                    ? (r.text.length > 50 ? r.text.substring(0, 50) + "..." : r.text)
                    : "";
                const from = await fmtSender(r.from);
                msg += `│ ${i + 1}. ${from}\n`;
                msg += `│    ${preview}\n`;
                msg += `│    🆔 ${r.id}\n`;
                msg += `│    📅 ${date}\n`;
                if (i < results.length - 1) msg += `│\n`;
            }

            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('get detail')}: store --get <id>\n`;
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
            const data = await store.get(msgId);

            if (!data) {
                return await reply(`❌ ${toSmallCaps('message not found')}: ${msgId}`);
            }

            const date = new Date(data.timestamp).toLocaleString('id-ID');
            
            let msg = `╭━━━ ${toSmallCaps('message details')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 🆔 ${toSmallCaps('id')}: ${msgId}\n`;
            msg += `│ 👤 ${toSmallCaps('from')}: ${await fmtSender(data.from)}\n`;
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