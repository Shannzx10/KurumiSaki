import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "runtime",
    aliases: ["uptime"],
    desc: "Show bot uptime",
    usage: "runtime",
    category: "general",
    
    async execute({ handler, reply }) {
        const stats = handler.getStats();
        const uptime = stats.uptime;
        
        const d = Math.floor(uptime / 86400000);
        const h = Math.floor((uptime % 86400000) / 3600000);
        const m = Math.floor((uptime % 3600000) / 60000);
        const s = Math.floor((uptime % 60000) / 1000);

        let msg = `╭━━━ ${toSmallCaps('bot status')} ━━━\n`;
        msg += `│ ⏱️ ${toSmallCaps('uptime')}\n`;
        msg += `│    ${d}d ${h}h ${m}m ${s}s\n`;
        msg += `│\n`;
        msg += `│ 📊 ${toSmallCaps('commands run')}\n`;
        msg += `│    ${stats.commandsRun}\n`;
        msg += `│\n`;
        msg += `│ 💬 ${toSmallCaps('messages received')}\n`;
        msg += `│    ${stats.messagesReceived}\n`;
        msg += `╰━━━━━━━━━━━━━━━━`;
        
        await reply(msg);
    }
};