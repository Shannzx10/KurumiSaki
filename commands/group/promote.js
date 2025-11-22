import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "promote",
    aliases: ["admin"],
    desc: "Promote member to admin",
    usage: "promote @user",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    
    async execute({ m, sock, mentions, reply }) {
        if (!mentions || mentions.length === 0) {
            return await reply(`❌ ${toSmallCaps('tag user to promote')}!`);
        }

        try {
            await m.react("🔄");
            
            await sock.groupParticipantsUpdate(
                m.chat,
                mentions,
                "promote"
            );
            
            await m.react("✅");
            
            let msg = `╭━━━ ${toSmallCaps('user promoted')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('successfully promoted to admin')}\n`;
            msg += `│ 👤 ${toSmallCaps('total')}: ${mentions.length} ${toSmallCaps('user(s)')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await reply(msg);
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};