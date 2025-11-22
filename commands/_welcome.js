import { toSmallCaps } from "../utility/Font.js";

const welcomeSettings = new Map();

function isWelcomeEnabled(groupId) {
    return welcomeSettings.get(groupId) !== false;
}

export function toggleWelcome(groupId, enabled) {
    welcomeSettings.set(groupId, enabled);
}

export function setWelcomeMessage(groupId, message) {
    const settings = welcomeSettings.get(groupId) || {};
    settings.customMessage = message;
    welcomeSettings.set(groupId, settings);
}

export default async function({ m, sock }) {
    if (!m.isGroup) return true;
    if (!m.messageStubType) return true;
    
    const isAdd = m.messageStubType === 27;
    
    if (!isAdd) return true;
    if (!isWelcomeEnabled(m.chat)) return true;
    
    try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const groupName = groupMetadata.subject;
        const participants = m.messageStubParameters || [];
        
        if (participants.length === 0) return true;
        
        const settings = welcomeSettings.get(m.chat) || {};
        const customMsg = settings.customMessage;
        
        for (const participant of participants) {
            const user = participant;
            const userName = user.split("@")[0];
            
            let msg;
            
            if (customMsg) {
                msg = customMsg
                    .replace(/{user}/g, `@${userName}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{members}/g, groupMetadata.participants.length);
            } else {
                msg = `╭──── ${toSmallCaps('welcome')} ────\n`;
                msg += `│\n`;
                msg += `│ 👋 ${toSmallCaps('hello')} @${userName}!\n`;
                msg += `│\n`;
                msg += `│ 🎉 ${toSmallCaps('welcome to')}\n`;
                msg += `│ 📱 ${groupName}\n`;
                msg += `│\n`;
                msg += `│ 👥 ${toSmallCaps('member')}: ${groupMetadata.participants.length}\n`;
                msg += `│\n`;
                msg += `│ 💡 ${toSmallCaps('please read group rules')}\n`;
                msg += `│ 🤝 ${toSmallCaps('enjoy your stay!')}\n`;
                msg += `╰────────────────`;
            }
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: [user]
            });
        }
        
    } catch (err) {
        console.error("Welcome error:", err);
    }
    
    return true;
}