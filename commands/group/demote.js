import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "demote",
    aliases: ["unadmin"],
    desc: "Demote admin to member",
    usage: "demote @user",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    
    async execute({ m, sock, mentions, reply }) {
        if (!mentions || mentions.length === 0) {
            return await reply(`❌ ${toSmallCaps('tag user to demote')}!`);
        }

        try {
            await m.react("🔄");
            
            await sock.groupParticipantsUpdate(
                m.chat,
                mentions,
                "demote"
            );
            
            await m.react("✅");
            
            let msg = `╭━━━ ${toSmallCaps('user demoted')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('successfully demoted to member')}\n`;
            msg += `│ 👤 ${toSmallCaps('total')}: ${mentions.length} ${toSmallCaps('user(s)')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await reply(msg);
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};