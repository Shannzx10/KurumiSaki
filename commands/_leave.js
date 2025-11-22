import { toSmallCaps } from "../utility/Font.js";

const leaveSettings = new Map();

function isLeaveEnabled(groupId) {
    return leaveSettings.get(groupId) !== false;
}

export function toggleLeave(groupId, enabled) {
    leaveSettings.set(groupId, enabled);
}

export function setLeaveMessage(groupId, message) {
    const settings = leaveSettings.get(groupId) || {};
    settings.customMessage = message;
    leaveSettings.set(groupId, settings);
}

export default async function({ m, sock }) {
    if (!m.isGroup) return true;
    if (!m.messageStubType) return true;
    
    const isLeave = m.messageStubType === 28 || m.messageStubType === 32;
    
    if (!isLeave) return true;
    if (!isLeaveEnabled(m.chat)) return true;
    
    try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const groupName = groupMetadata.subject;
        const participants = m.messageStubParameters || [];
        
        if (participants.length === 0) return true;
        
        const settings = leaveSettings.get(m.chat) || {};
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
                msg = `╭──── ${toSmallCaps('goodbye')} ────\n`;
                msg += `│\n`;
                msg += `│ 👋 @${userName}\n`;
                msg += `│\n`;
                msg += `│ 😢 ${toSmallCaps('has left the group')}\n`;
                msg += `│\n`;
                msg += `│ 📱 ${groupName}\n`;
                msg += `│ 👥 ${toSmallCaps('remaining members')}: ${groupMetadata.participants.length}\n`;
                msg += `│\n`;
                msg += `│ 💭 ${toSmallCaps('we will miss you!')}\n`;
                msg += `╰────────────────`;
            }
            
            await sock.sendMessage(m.chat, {
                text: msg,
                mentions: [user]
            });
        }
        
    } catch (err) {
        console.error("Leave error:", err);
    }
    
    return true;
}