import { toSmallCaps } from "../utility/Font.js";

const warnings = new Map();

const toxicWords = [
    // Indonesian toxic words
    'anjing', 'ajg', 'anj', 'kontol', 'memek', 'bangsat', 'babi', 
    'tolol', 'jancok', 'coli', 'colmek', 'ngentot', 'pepek', 'peler', 'idiot',
    'bajingan', 'kampang', 'geblek', 'brengsek',
    'kimak', 'jembut', 'perek', 'lonte', 'jablay', 'sundal',
    
    // English toxic words
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap', 
    'dick', 'pussy', 'cock', 'slut', 'whore', 'nigga', 'nigger', 'faggot'
];

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

function containsToxicWord(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    
    return toxicWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
        return regex.test(lowerText);
    });
}

export default async function({ m, sock }) {
    if (!m.isGroup) return true;
    if (!m.text) return true;
    if (m.isAdmin) return true;
    if (!m.isBotAdmin) return true;
    
    const hasToxic = containsToxicWord(m.text);
    
    if (!hasToxic) return true;
    
    try {
        await sock.sendMessage(m.chat, { delete: m.key });

        const newWarnings = addWarning(m.chat, m.sender);

        if (newWarnings >= 3) {
            await sock.groupParticipantsUpdate(
                m.chat,
                [m.sender],
                "remove"
            );
            
            let msg = `╭──── ${toSmallCaps('antitoxic system')} ────\n`;
            msg += `│\n`;
            msg += `│ ⚠️ ${toSmallCaps('user kicked')}\n`;
            msg += `│ 👤 @${m.sender.split("@")[0]}\n`;
            msg += `│\n`;
            msg += `│ 📊 ${toSmallCaps('reason')}: ${toSmallCaps('toxic language')} (3/3)\n`;
            msg += `│ 🚫 ${toSmallCaps('action')}: ${toSmallCaps('removed from group')}\n`;
            msg += `╰────────────────`;
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: [m.sender]
            });

            resetWarnings(m.chat, m.sender);
            
        } else {
            const remaining = 3 - newWarnings;
            
            let msg = `╭──── ${toSmallCaps('antitoxic warning')} ────\n`;
            msg += `│\n`;
            msg += `│ ⚠️ @${m.sender.split("@")[0]}\n`;
            msg += `│\n`;
            msg += `│ 🚫 ${toSmallCaps('toxic language detected!')}\n`;
            msg += `│ 📊 ${toSmallCaps('warning')}: ${newWarnings}/3\n`;
            msg += `│ 🔄 ${toSmallCaps('remaining chances')}: ${remaining}\n`;
            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('note')}: ${toSmallCaps('please be respectful')}\n`;
            msg += `│ ⏰ ${toSmallCaps('warnings reset after 24 hours')}\n`;
            msg += `╰────────────────`;
            
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
        console.error("Antitoxic error:", err);
        return true;
    }
}