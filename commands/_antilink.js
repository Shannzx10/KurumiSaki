import { toSmallCaps } from "../utility/Font.js";

const warnings = new Map();

function getKey(groupId, userId) {
    return `${groupId}:${userId}`;
}

function getWarnings(groupId, userId) {
    const key = getKey(groupId, userId);
    return warnings.get(key) || 0;
}

function addWarning(groupId, userId) {
    const key = getKey(groupId, userId);
    const current = getWarnings(groupId, userId);
    warnings.set(key, current + 1);
    return current + 1;
}

function resetWarnings(groupId, userId) {
    const key = getKey(groupId, userId);
    warnings.delete(key);
}

function scheduleReset(groupId, userId) {
    setTimeout(() => {
        resetWarnings(groupId, userId);
    }, 24 * 60 * 60 * 1000);
}

export default async function({ m, sock }) {
    if (!m.isGroup) return true;
    if (!m.text) return true;
    
    const hasLink = m.text.match(/chat\.whatsapp\.com\/[a-zA-Z0-9]+/gi);
    
    if (!hasLink) return true;
    if (m.isAdmin) return true;
    if (!m.isBotAdmin) {
        return true;
    }
    
    try {
        await sock.sendMessage(m.chat, { delete: m.key });

        const currentWarnings = getWarnings(m.chat, m.sender);
        const newWarnings = addWarning(m.chat, m.sender);

        if (newWarnings >= 3) {
            await sock.groupParticipantsUpdate(
                m.chat,
                [m.sender],
                "remove"
            );
            
            let msg = `╭━━━ ${toSmallCaps('antilink system')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ⚠️ ${toSmallCaps('user kicked')}\n`;
            msg += `│ 👤 @${m.sender.split("@")[0]}\n`;
            msg += `│\n`;
            msg += `│ 📊 ${toSmallCaps('reason')}: ${toSmallCaps('exceeded warning limit')} (3/3)\n`;
            msg += `│ 🚫 ${toSmallCaps('action')}: ${toSmallCaps('removed from group')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: [m.sender]
            });

            resetWarnings(m.chat, m.sender);
            
        } else {
            const remaining = 3 - newWarnings;
            
            let msg = `╭━━━ ${toSmallCaps('antilink warning')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ⚠️ @${m.sender.split("@")[0]}\n`;
            msg += `│\n`;
            msg += `│ 🚫 ${toSmallCaps('group links are not allowed')}\n`;
            msg += `│ 📊 ${toSmallCaps('warning')}: ${newWarnings}/3\n`;
            msg += `│ 🔄 ${toSmallCaps('remaining chances')}: ${remaining}\n`;
            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('note')}: ${toSmallCaps('warnings reset after 24 hours')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: [m.sender]
            });

            if (newWarnings === 1) {
                scheduleReset(m.chat, m.sender);
            }
        }
        
        return false;
        
    } catch (err) {
        console.error("Antilink error:", err);
        return true;
    }
};