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

export default async function({ m, sock }) {
    if (!m.isGroup) return true;
    if (m.isAdmin) return true;
    if (!m.isBotAdmin) return true;
    
    // Deteksi bot dari message key ID
    const isBot = m.key.id.startsWith('BAE5') || 
                  m.key.id.startsWith('3EB0') ||
                  m.key.id.length > 21;
    
    if (!isBot) return true;
    
    try {
        await sock.sendMessage(m.chat, { delete: m.key });

        const newWarnings = addWarning(m.chat, m.sender);

        if (newWarnings >= 2) {
            await sock.groupParticipantsUpdate(
                m.chat,
                [m.sender],
                "remove"
            );
            
            let msg = `╭──── ${toSmallCaps('antibot system')} ────\n`;
            msg += `│\n`;
            msg += `│ ⚠️ ${toSmallCaps('bot detected and removed')}\n`;
            msg += `│ 🤖 @${m.sender.split("@")[0]}\n`;
            msg += `│\n`;
            msg += `│ 📊 ${toSmallCaps('reason')}: ${toSmallCaps('bot not allowed')} (2/2)\n`;
            msg += `│ 🚫 ${toSmallCaps('action')}: ${toSmallCaps('removed from group')}\n`;
            msg += `╰────────────────`;
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: [m.sender]
            });

            resetWarnings(m.chat, m.sender);
            
        } else {
            let msg = `╭──── ${toSmallCaps('antibot warning')} ────\n`;
            msg += `│\n`;
            msg += `│ ⚠️ @${m.sender.split("@")[0]}\n`;
            msg += `│\n`;
            msg += `│ 🤖 ${toSmallCaps('bot detected!')}\n`;
            msg += `│ 📊 ${toSmallCaps('warning')}: ${newWarnings}/2\n`;
            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('note')}: ${toSmallCaps('bots are not allowed')}\n`;
            msg += `╰────────────────`;
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: [m.sender]
            });
        }
        
        return false;
        
    } catch (err) {
        console.error("Antibot error:", err);
        return true;
    }
}