import { toSmallCaps } from "../../utility/Font.js";
import { sendInteractiveMessage } from "../../utility/Button.js";

export default {
    name: "menu",
    aliases: ["help", "commands"],
    desc: "Show command list",
    usage: "menu [category]",
    category: "general",
    
    async execute({ m, args, handler, config, sock, groupCache }) {
        if (args[0] && args[0].startsWith('_cmd_')) {
            const cmdName = args[0].replace('_cmd_', '');
            const cmd = handler.get(cmdName);
            
            if (!cmd) {
                return await m.reply(`❌ ${toSmallCaps('command')} "${cmdName}" ${toSmallCaps('not found')}`);
            }

            let msg = `╭━━━ ${toSmallCaps('command info')} ━━━\n`;
            msg += `│ 📝 ${toSmallCaps(`name: ${cmd.name}`)}\n`;
            msg += `│ 📂 ${toSmallCaps(`category: ${cmd.category}`)}\n`;
            msg += `│ 📄 ${toSmallCaps(`description: ${cmd.desc || 'No description'}`)}\n`;
            msg += `│ 💡 ${toSmallCaps(`usage: ${config.prefix[0]}${cmd.usage}`)}\n`;            
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            return await sock.sendMessage(m.chat, {
                text: msg,
                contextInfo: {
                    externalAdReply: {
                        title: 'COMMAND INFO',
                        body: 'penjelasan & penggunaan command',
                        renderLargerThumbnail: true,
                        mediaType: 1,
                        thumbnailUrl: 'https://wallpapercave.com/wp/wp1924815.jpg'
                    }
                }
            }, { quoted: m });
        }

        if (args[0] && args[0].startsWith('_cat_')) {
            const cat = args[0].replace('_cat_', '');
            const cmds = handler.getCategory(cat);
            
            if (cmds.length === 0) {
                return await m.reply(`❌ ${toSmallCaps('category')} "${cat}" ${toSmallCaps('not found')}`);
            }

            const uniqueCmds = [...new Map(cmds.map(c => [c.name, c])).values()];
            uniqueCmds.sort((a, b) => a.name.localeCompare(b.name));

            let msg = `╭━━━ ${toSmallCaps(cat.toUpperCase())} ━━━\n`;
            
            uniqueCmds.forEach((c) => {
                msg += `│ ≫ ${toSmallCaps(c.name)}\n`;
                if (c.desc && c.desc !== "No description") {
                    msg += `│    ${c.desc}\n`;
                }
                if (c.usage) {
                    msg += `│    ${toSmallCaps('usage')}: ${config.prefix[0]}${c.usage}\n`;
                }
                msg += `│\n`;
            });
            
            msg += `╰━━━━━━━━━━━━━━━━\n\n`;
            msg += `💡 ${toSmallCaps('ketik command untuk menggunakan')}`;
            
            return await m.reply(msg);
        }

        const stats = handler.getStats();
        const totalCmds = handler.commands.size;
        const prefix = config.prefix[0] || ".";
        
        let msg = `╭━━━ ${toSmallCaps('bot info')} ━━━\n`;
        msg += `│ 🤖 ${toSmallCaps('botname')}: ${config.botName || toSmallCaps('whatsapp bot')}\n`;
        msg += `│ 👤 ${toSmallCaps('owner')}: ${config.owner || toSmallCaps('owner')}\n`;
        msg += `│ 📦 ${toSmallCaps('total cmd')}: ${totalCmds}\n`;
        msg += `│ 📖 ${toSmallCaps('prefix')}: ${config.prefix.join(", ")}\n`;
        msg += `│ ⚡ ${toSmallCaps('uptime')}: ${formatUptime(stats.uptime)}\n`;
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

        msg += `╭━━━ ${toSmallCaps('categories')} ━━━\n`;
        sortedCats.forEach((cat) => {
            const cmds = handler.getCategory(cat);
            const uniqueCmds = [...new Map(cmds.map(c => [c.name, c])).values()];
            msg += `│ 📂 ${toSmallCaps(cat)}: ${uniqueCmds.length} ${toSmallCaps('commands')}\n`;
        });
        msg += `╰━━━━━━━━━━━━━━━━`;

        const sections = sortedCats.map(cat => {
            const cmds = handler.getCategory(cat);
            const uniqueCmds = [...new Map(cmds.map(c => [c.name, c])).values()];
            uniqueCmds.sort((a, b) => a.name.localeCompare(b.name));
            const icon = getCategoryIcon(cat);
            
            return {
                title: `${icon} ${cat.toUpperCase()}`,
                rows: uniqueCmds.map(cmd => ({
                    title: `${prefix}${cmd.name}`,
                    description: cmd.desc || 'No description',
                    id: `${prefix}menu _cmd_${cmd.name}`
                }))
            };
        });

        const buttons = [
            {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: 'Select Command Info',
                    sections: sections
                })
            }
        ];

        const payload = {
            image: { 
                url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMvq7VJ6cgKSZuSABRKuOWC0yAcY0r74KNM-VY9xGveS6TVaYVnqXHchU-&s=10'
            },
            caption: msg.trim(),
            footer: toSmallCaps('KurumiSaki Project'),
            interactiveButtons: buttons
        };

        await sendInteractiveMessage(sock, m.chat, payload, { quoted: m });
    }
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function getCategoryIcon(category) {
    const icons = {
        'general': '📌',
        'tools': '🛠️',
        'downloader': '📥',
        'media': '🎨',
        'group': '👥',
        'owner': '👑',
        'fun': '🎮',
        'search': '🔍',
        'anime': '🎭',
        'info': 'ℹ️',
        'utility': '⚙️',
        'ai': '🤖'
    };
    return icons[category.toLowerCase()] || '📁';
}