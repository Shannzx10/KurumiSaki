import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "group",
    aliases: ["grup"],
    desc: "Manage group settings (open/close group)",
    usage: "group --open | group --close",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    
    async execute({ args, m, sock, reply }) {
        if (args.length === 0) {
            let msg = `❌ ${toSmallCaps('usage')}:\n`;
            msg += `│ group --open  → ${toSmallCaps('open group')}\n`;
            msg += `│ group --close → ${toSmallCaps('close group')}`;
            return await reply(msg);
        }
        
        const option = args[0].toLowerCase();
        
        try {
            await m.react("🔄");
            
            if (option === "--open") {
                await sock.groupSettingUpdate(m.chat, "not_announcement");
                await m.react("✅");
                
                let msg = `╭━━━ ${toSmallCaps('group opened')} ━━━\n`;
                msg += `│\n`;
                msg += `│ 🔓 ${toSmallCaps('all members can now send messages')}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                await reply(msg);
                
            } else if (option === "--close") {
                await sock.groupSettingUpdate(m.chat, "announcement");
                await m.react("✅");
                
                let msg = `╭━━━ ${toSmallCaps('group closed')} ━━━\n`;
                msg += `│\n`;
                msg += `│ 🔒 ${toSmallCaps('only admins can send messages')}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                
                await reply(msg);
                
            } else {
                await m.react("❌");
                let msg = `❌ ${toSmallCaps('invalid option')}!\n`;
                msg += `│ ${toSmallCaps('use')}: --open ${toSmallCaps('or')} --close`;
                await reply(msg);
            }
            
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};