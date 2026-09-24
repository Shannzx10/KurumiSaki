import { 
    jidNormalizedUser, 
    downloadContentFromMessage 
} from "@whiskeysockets/baileys";
import config from '../config.js';

export async function serializeMessage(m, sock, connection) {
    if (!m.message) return m;

    const findValidJid = (obj) => {
        if (!obj) return null;
        for (let key in obj) {
            if (typeof obj[key] === 'string' && obj[key].endsWith('@s.whatsapp.net')) {
                return obj[key];
            }
        }
        return null;
    };

    // NOTE: WA baru sering pakai @lid (privacy) / @broadcast / newsletter,
    // jadi jangan hanya mengandalkan @s.whatsapp.net agar m.chat tidak null.
    const remoteJid = m.key?.remoteJid || m.key?.remoteJidAlt || null;
    m.isGroup = remoteJid?.endsWith("@g.us") || false;
    m.chat = remoteJid || findValidJid(m.key) || m.key?.participant || "";
    m.fromMe = m.key.fromMe;

    let senderRaw;
    if (m.fromMe) {
        // Pesan dari nomor bot sendiri -> selalu pakai ID bot, jangan ditimpa participant grup
        senderRaw = sock?.user?.id || m.key?.participant || remoteJid || "";
    } else if (m.isGroup && m.key?.participant) {
        // group: participant adalah pengirim asli, private: remoteJid
        senderRaw = m.key.participant;
    } else {
        senderRaw = findValidJid(m.key) || remoteJid || "";
    }
    try {
        m.sender = senderRaw ? jidNormalizedUser(senderRaw) : "";
    } catch {
        m.sender = senderRaw || "";
    }
    // fromMe (kirim dari HP bot sendiri) selalu dianggap owner.
    // Bandingkan digit saja agar kebal format @s.whatsapp.net vs @lid.
    const digits = (s) => String(s || "").replace(/\D/g, "");
    const senderDigits = digits(m.sender) || digits(senderRaw);
    m.isOwner = m.fromMe === true || (senderDigits
        ? config.owners.some(o => {
            const od = digits(o);
            return od && (senderDigits.endsWith(od) || od.endsWith(senderDigits));
        })
        : false);

    const type = Object.keys(m.message)[0];
    m.type = type;
    m.msg = m.message[type];
    
    let extractedText = "";

    if (m.message.templateButtonReplyMessage) {
        const buttonReply = m.message.templateButtonReplyMessage;
        extractedText = buttonReply.selectedId || buttonReply.selectedDisplayText || "";
    }

    else if (m.message.interactiveResponseMessage) {
        try {
            const interactiveResponse = m.message.interactiveResponseMessage;
            const nativeFlow = interactiveResponse.nativeFlowResponseMessage;
            
            if (nativeFlow && nativeFlow.paramsJson) {
                const params = JSON.parse(nativeFlow.paramsJson);
                extractedText = params.id || params.selectedId || params.selectedRowId || params.rowId || "";
                // Fallback: single_select kadang kirim nested params_json
                if (!extractedText && params.params_json) {
                    try {
                        const nested = typeof params.params_json === 'string' ? JSON.parse(params.params_json) : params.params_json;
                        extractedText = nested.id || nested.selectedId || "";
                    } catch {}
                }
            }
        } catch (e) {
            console.error("Error parsing interactive response:", e);
        }
    }

    else if (m.message.buttonsResponseMessage) {
        const btnResp = m.message.buttonsResponseMessage;
        extractedText = btnResp.selectedButtonId || btnResp.selectedDisplayText || "";
    }

    else if (m.message.listResponseMessage) {
        const listResp = m.message.listResponseMessage;
        extractedText = listResp.singleSelectReply?.selectedRowId || listResp.title || "";
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