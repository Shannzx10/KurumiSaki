import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "groupinfo",
    aliases: ["ginfo", "gcinfo"],
    desc: "Show group information",
    usage: "groupinfo",
    category: "group",
    groupOnly: true,
    
    async execute({ m, sys, reply }) {
        try {
            await m.react("🔄");
            
            const metadata = await sys.getGroupMetadata(m.chat);
            
            const creationDate = new Date(metadata.creation * 1000).toLocaleString('id-ID');
            const desc = metadata.desc || toSmallCaps('no description');
            const descOwner = metadata.descOwner ? `@${metadata.descOwner.split('@')[0]}` : toSmallCaps('unknown');
            
            // Count admins
            const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const superAdmins = metadata.participants.filter(p => p.admin === 'superadmin');
            
            await m.react("✅");
            
            let msg = `╭━━━ ${toSmallCaps('group information')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 📛 ${toSmallCaps('name')}\n`;
            msg += `│    ${metadata.subject}\n`;
            msg += `│\n`;
            msg += `│ 🆔 ${toSmallCaps('id')}\n`;
            msg += `│    ${metadata.id}\n`;
            msg += `│\n`;
            msg += `│ 👤 ${toSmallCaps('owner')}\n`;
            msg += `│    @${metadata.owner.split('@')[0]}\n`;
            msg += `│\n`;
            msg += `│ 👥 ${toSmallCaps('members')}: ${metadata.participants.length}\n`;
            msg += `│ 👑 ${toSmallCaps('admins')}: ${admins.length}\n`;
            msg += `│ ⭐ ${toSmallCaps('super admins')}: ${superAdmins.length}\n`;
            msg += `│\n`;
            msg += `│ 📅 ${toSmallCaps('created')}\n`;
            msg += `│    ${creationDate}\n`;
            msg += `│\n`;
            msg += `│ 🔒 ${toSmallCaps('settings')}\n`;
            msg += `│ • ${toSmallCaps('messages')}: ${metadata.announce ? toSmallCaps('admins only') : toSmallCaps('all members')}\n`;
            msg += `│ • ${toSmallCaps('edit info')}: ${metadata.restrict ? toSmallCaps('admins only') : toSmallCaps('all members')}\n`;
            msg += `│\n`;
            msg += `│ 📝 ${toSmallCaps('description')}\n`;
            msg += `│    ${desc}\n`;
            if (metadata.descOwner) {
                msg += `│    ${toSmallCaps('by')}: ${descOwner}\n`;
            }
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await reply(msg);
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};