import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "menu",
    aliases: ["help", "commands"],
    desc: "Show command list",
    usage: "menu [category]",
    category: "general",
    
    async execute({ m, args, handler, config, sock, groupCache }) {
        if (args[0]) {
            const cat = args[0].toLowerCase();
            const cmds = handler.getCategory(cat);
            
            if (cmds.length === 0) {
                return await m.reply(`❌ ${toSmallCaps('category')} "${cat}" ${toSmallCaps('not found')}`);
            }

            const uniqueCmds = [...new Map(cmds.map(c => [c.name, c])).values()];
            uniqueCmds.sort((a, b) => a.name.localeCompare(b.name));

            let msg = `╭━━━ ${toSmallCaps(cat)} ━━━\n`;
            
            uniqueCmds.forEach((c) => {
                msg += `│ ≫ ${toSmallCaps(c.name)}\n`;
                if (c.desc && c.desc !== "No description") {
                    msg += `│    ${c.desc}\n`;
                }
            });
            
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await m.reply(msg);
        }

        const stats = handler.getStats();
        const totalCmds = handler.commands.size;
        const prefix = config.prefix[0] || ".";
        
        let msg = `╭━━━ ${toSmallCaps('bot info')} ━━━\n`;
        msg += `│ 🤖 ${toSmallCaps('botname')}: ${config.botName || toSmallCaps('whatsapp bot')}\n`;
        msg += `│ 👤 ${toSmallCaps('owner')}: ${config.owner || toSmallCaps('owner')}\n`;
        msg += `│ 📦 ${toSmallCaps('total cmd')}: ${totalCmds}\n`;
        msg += `│ 🔖 ${toSmallCaps('prefix')}: ${config.prefix.join(", ")}\n`;
        msg += `╰━━━━━━━━━━━━━━━━\n`;

        if (m.isGroup && groupCache) {
            try {
                const metadata = await groupCache.get(m.chat) || await sock.groupMetadata(m.chat);
                
                if (metadata) {
                    if (groupCache && !groupCache.has(m.chat)) {
                        groupCache.set(m.chat, metadata);
                    }
                    
                    msg += `╭━━━ ${toSmallCaps('group info')} ━━━\n`;
                    msg += `│ 👥 ${toSmallCaps('name')}: ${metadata.subject}\n`;
                    msg += `│ 👤 ${toSmallCaps('member')}: ${metadata.participants.length} ${toSmallCaps('members')}\n`;
                    msg += `╰━━━━━━━━━━━━━━━━\n`;
                }
            } catch (err) {
                console.error("Failed to fetch group metadata:", err.message);
            }
        }

        const cats = handler.getCategories();
        const sortedCats = cats.sort();
        
        sortedCats.forEach((cat) => {
            const cmds = handler.getCategory(cat);
            const uniqueCmds = [...new Map(cmds.map(c => [c.name, c])).values()];
            
            msg += `╭━━━ ${toSmallCaps(cat)} ━━━\n`;
            uniqueCmds.forEach((c) => {
                msg += `│ ≫ ${toSmallCaps(c.name)}\n`;
            });
            msg += `╰━━━━━━━━━━━━━━━━\n`;
        });
        
        msg += `\n💡 ${toSmallCaps('type')}: ${prefix}${toSmallCaps('menu')} <${toSmallCaps('category')}>`;
        
        await sock.sendMessage(m.chat, { text: msg, contextInfo: {
            externalAdReply: {
                title: 'KurumiSaki',
                body: 'simple whatsapp bot plugin',
                renderLargerThumbnail: true,
                mediaType: 1,
                thumbnailUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMvq7VJ6cgKSZuSABRKuOWC0yAcY0r74KNM-VY9xGveS6TVaYVnqXHchU-&s=10'
            }
        }}, { quoted: m });
    }
};