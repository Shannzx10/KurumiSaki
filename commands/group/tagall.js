import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "tagall",
    aliases: ["everyone", "all"],
    desc: "Tag all members with list",
    usage: "tagall <text>",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    
    async execute({ args, m, sock, sys, reply }) {
        try {
            await m.react("🔄");
            
            const metadata = await sys.getGroupMetadata(m.chat);
            const participants = metadata.participants;
            
            const text = args.length > 0 ? args.join(" ") : toSmallCaps('group announcement');
            
            let msg = `╭━━━ ${toSmallCaps('tag all members')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 📢 ${text}\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('members')} (${participants.length}):\n`;
            
            participants.forEach((p, i) => {
                const num = p.id.split('@')[0];
                msg += `│ ${i + 1}. @${num}\n`;
            });
            
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await m.react("✅");
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: participants.map(p => p.id)
            });
            
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};