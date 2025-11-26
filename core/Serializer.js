import { 
    jidNormalizedUser, 
    downloadContentFromMessage 
} from "@whiskeysockets/baileys";
import config from '../config.js';

export async function serializeMessage(m, sock, connection) {
    if (!m.message) return m;

    m.isGroup = m.key.remoteJid?.endsWith("@g.us");    
    m.chat = m.isGroup ? m.key.remoteJid : (m.key.remoteJidAlt || m.key.remoteJid);
    m.fromMe = m.key.fromMe;
    
    m.sender = jidNormalizedUser(
        m.fromMe ? sock.user.id : m.key.participantAlt || m.key.remoteJidAlt
    );
    m.isOwner = config.owners.some(o => m.sender.includes(o));

    const type = Object.keys(m.message)[0];
    m.type = type;
    m.msg = m.message[type];
    
    let extractedText = "";

    if (m.message.templateButtonReplyMessage) {
        const buttonReply = m.message.templateButtonReplyMessage;
        extractedText = buttonReply.selectedId || buttonReply.selectedDisplayText || "";
        console.log("✅ Button reply detected:", extractedText);
    }

    else if (m.message.interactiveResponseMessage) {
        try {
            const interactiveResponse = m.message.interactiveResponseMessage;
            const nativeFlow = interactiveResponse.nativeFlowResponseMessage;
            
            if (nativeFlow && nativeFlow.paramsJson) {
                const params = JSON.parse(nativeFlow.paramsJson);
                extractedText = params.id || "";
                console.log("✅ Interactive button reply:", extractedText);
            }
        } catch (e) {
            console.error("Error parsing interactive response:", e);
        }
    }

    else if (m.message.buttonsResponseMessage) {
        const btnResp = m.message.buttonsResponseMessage;
        extractedText = btnResp.selectedButtonId || btnResp.selectedDisplayText || "";
        console.log("✅ Buttons response:", extractedText);
    }

    else if (m.message.listResponseMessage) {
        const listResp = m.message.listResponseMessage;
        extractedText = listResp.singleSelectReply?.selectedRowId || listResp.title || "";
        console.log("✅ List response:", extractedText);
    }

    m.text = extractedText || 
        m.message.conversation ||
        m.msg?.text ||
        m.msg?.caption ||
        "";

    m.mentions = m.msg?.contextInfo?.mentionedJid || [];

    if (m.msg?.contextInfo?.quotedMessage) {
        const quoted = m.msg.contextInfo.quotedMessage;
        const qType = Object.keys(quoted)[0];
        
        m.quoted = {
            type: qType,
            msg: quoted[qType],
            text: quoted.conversation || quoted[qType]?.text || quoted[qType]?.caption || "",
            sender: m.msg.contextInfo.participant,
            id: m.msg.contextInfo.stanzaId,
            isMedia: !!(
                quoted[qType]?.mimetype ||
                ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].includes(qType)
            ),
            download: async () => {
                if (!m.quoted.isMedia) return null;
                try {
                    const stream = await downloadContentFromMessage(
                        quoted[qType],
                        qType.replace("Message", "")
                    );
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    return buffer;
                } catch (err) {
                    console.error("Quoted download error:", err);
                    return null;
                }
            }
        };
    }

    m.isMedia = !!(
        m.msg?.mimetype ||
        ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].includes(type)
    );

    m.download = async () => {
        if (!m.isMedia) return null;
        try {
            const stream = await downloadContentFromMessage(
                m.msg, 
                type.replace("Message", "")
            );
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            return buffer;
        } catch (err) {
            console.error("Download error:", err);
            return null;
        }
    };

    m.reply = async (text, options = {}) => {
        return await sock.sendMessage(
            m.chat,
            { text },
            { quoted: m, ...options }
        );
    };
    
    m.react = async (emoji) => {
        return await sock.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        });
    };

    m.isAdmin = false;
    m.isBotAdmin = false;
    
    if (m.isGroup && connection) {
        try {
            const metadata = await connection.getGroupMetadata(m.chat);
            
            if (metadata) {
                const participant = metadata.participants.find(
                    p => p.phoneNumber === m.sender || jidNormalizedUser(p.phoneNumber) === m.sender
                );
                m.isAdmin = participant?.admin ? true : false;
                
                const botId = jidNormalizedUser(sock.user.id);
                const botParticipant = metadata.participants.find(
                    p => jidNormalizedUser(p.phoneNumber) === botId
                );
                m.isBotAdmin = botParticipant?.admin ? true : false;
            }
        } catch (err) {
            console.error("Admin check error:", err.message);
        }
    }
    
    return m;
}