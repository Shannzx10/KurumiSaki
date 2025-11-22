import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "editinfo",
    aliases: ["edit", "groupedit"],
    desc: "Edit group information (name/description/invite link)",
    usage: "editinfo --name <text> | editinfo --desc <text> | editinfo --revoke",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    
    async execute({ args, m, sock, reply }) {
        if (args.length === 0) {
            let msg = `❌ ${toSmallCaps('usage')}:\n`;
            msg += `│ editinfo --name <text>  → ${toSmallCaps('change group name')}\n`;
            msg += `│ editinfo --desc <text>  → ${toSmallCaps('change description')}\n`;
            msg += `│ editinfo --revoke       → ${toSmallCaps('revoke invite link')}`;
            return await reply(msg);
        }
        
        const option = args[0].toLowerCase();
        const content = args.slice(1).join(" ");
        
        try {
            await m.react("🔄");
            
            if (option === "--name") {
                if (!content) {
                    await m.react("❌");
                    return await reply(`❌ ${toSmallCaps('please provide new group name')}`);
                }
                
                await sock.groupUpdateSubject(m.chat, content);
                await m.react("✅");
                
                let msg = `╭━━━ ${toSmallCaps('group name changed')} ━━━\n`;
                msg += `│\n`;
                msg += `│ ✅ ${toSmallCaps('new name')}\n`;
                msg += `│    ${content}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                await reply(msg);
                
            } else if (option === "--desc") {
                if (!content) {
                    await m.react("❌");
                    return await reply(`❌ ${toSmallCaps('please provide new description')}`);
                }
                
                await sock.groupUpdateDescription(m.chat, content);
                await m.react("✅");
                
                let msg = `╭━━━ ${toSmallCaps('description changed')} ━━━\n`;
                msg += `│\n`;
                msg += `│ ✅ ${toSmallCaps('new description')}\n`;
                msg += `│    ${content}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                await reply(msg);
                
            } else if (option === "--revoke") {
                const newCode = await sock.groupRevokeInvite(m.chat);
                await m.react("✅");
                
                let msg = `╭━━━ ${toSmallCaps('invite link revoked')} ━━━\n`;
                msg += `│\n`;
                msg += `│ ✅ ${toSmallCaps('new invite link')}\n`;
                msg += `│    https://chat.whatsapp.com/${newCode}\n`;
                msg += `│\n`;
                msg += `│ ⚠️ ${toSmallCaps('old link is now invalid')}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                await reply(msg);
                
            } else {
                await m.react("❌");
                let msg = `❌ ${toSmallCaps('invalid option')}!\n`;
                msg += `│ ${toSmallCaps('use')}: --name, --desc, ${toSmallCaps('or')} --revoke`;
                await reply(msg);
            }
            
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};