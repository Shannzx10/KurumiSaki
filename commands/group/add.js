import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "add",
    aliases: ["invite"],
    desc: "Add member to group",
    usage: "add 628xxx",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    
    async execute({ args, m, sock, reply }) {
        if (args.length === 0) {
            let msg = `╭━━━ ${toSmallCaps('add member')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('usage')}:\n`;
            msg += `│ add 628xxx\n`;
            msg += `│ add 628xxx 628yyy\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('note')}: ${toSmallCaps('without @ or +')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            return await reply(msg);
        }

        try {
            await m.react("🔄");

            const numbers = args.map(arg => {
                let num = arg.replace(/[^0-9]/g, "");
                if (!num.includes("@")) {
                    num += "@s.whatsapp.net";
                }
                return num;
            });

            if (numbers.length === 0) {
                await m.react("❌");
                return await reply(`❌ ${toSmallCaps('no valid numbers found')}!`);
            }

            const result = await sock.groupParticipantsUpdate(
                m.chat,
                numbers,
                "add"
            );

            await m.react("✅");

            let msg = `╭━━━ ${toSmallCaps('add member result')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 📊 ${toSmallCaps('total')}: ${numbers.length} ${toSmallCaps('number(s)')}\n`;
            msg += `│\n`;

            let success = 0;
            let failed = 0;

            if (Array.isArray(result) && result.length > 0) {
                for (const item of result) {
                    const phoneNumber = item.content?.attrs?.phone_number || item.jid;
                    const number = phoneNumber.replace("@s.whatsapp.net", "");
                    const code = item.status || "unknown";
                    
                    if (code === "200" || code === 200) {
                        msg += `│ ✅ ${number}\n`;
                        success++;
                    } else {
                        msg += `│ ❌ ${number} (${code})\n`;
                        failed++;
                    }
                }
            } else {
                for (const num of numbers) {
                    const number = num.replace("@s.whatsapp.net", "");
                    msg += `│ ✅ ${number}\n`;
                    success++;
                }
            }

            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('success')}: ${success}\n`;
            if (failed > 0) {
                msg += `│ ❌ ${toSmallCaps('failed')}: ${failed}\n`;
            }
            msg += `╰━━━━━━━━━━━━━━━━`;

            await reply(msg);
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};