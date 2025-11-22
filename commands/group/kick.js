import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "kick",
    aliases: ["remove"],
    desc: "Remove member from group",
    usage: "kick @user",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    
    async execute({ m, sock, mentions, reply }) {
        if (!mentions || mentions.length === 0) {
            return await reply(`❌ ${toSmallCaps('tag user to kick')}!`);
        }

        try {
            await m.react("🔄");
            
            await sock.groupParticipantsUpdate(
                m.chat,
                mentions,
                "remove"
            );
            
            await m.react("✅");
            
            let msg = `╭━━━ ${toSmallCaps('user removed')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('successfully removed')}\n`;
            msg += `│ 👤 ${toSmallCaps('total')}: ${mentions.length} ${toSmallCaps('user(s)')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await reply(msg);
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};