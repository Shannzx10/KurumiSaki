import { uploadFile } from '../../utility/Uploader.js';
import { toSmallCaps } from '../../utility/Font.js';
import { sendInteractiveMessage } from '../../utility/Button.js';

export default {
    name: 'tourl',
    aliases: ['upload', 'toupload'],
    desc: 'Upload media (image/video/audio/doc) ke URL',
    usage: 'tourl <reply to media>',
    category: 'tools',
    waitMessage: `${toSmallCaps('⏳ Sabar bro, lagi di-upload...')}`,
    
    async execute({ m, sock }) {
        const media = m.quoted && m.quoted.isMedia ? m.quoted : m;

        if (!media.isMedia) {
            return await m.reply(toSmallCaps(`❌ Reply ke media (gambar/video/audio/dokumen) yang mau di-upload, bro.`));
        }

        try {
            await m.react('⏳');
            
            const buffer = await media.download();
            if (!buffer) {
                await m.react('❌');
                return await m.reply(toSmallCaps('❌ Gagal download media, coba lagi.'));
            }

            const mimetype = media.msg.mimetype || 'application/octet-stream';
            const mediaType = media.type || 'unknown';
            
            const url = await uploadFile(buffer, mimetype);

            await m.react('✅');

            let icon = '📎';
            let mediaTypeName = 'FILE';
            
            if (mimetype.startsWith('image/')) {
                icon = '🖼️';
                mediaTypeName = 'IMAGE';
            } else if (mimetype.startsWith('video/')) {
                icon = '🎥';
                mediaTypeName = 'VIDEO';
            } else if (mimetype.startsWith('audio/')) {
                icon = '🎵';
                mediaTypeName = 'AUDIO';
            } else if (mimetype.includes('document') || mimetype.includes('pdf')) {
                icon = '📄';
                mediaTypeName = 'DOCUMENT';
            }

            const fileSizeKB = (buffer.length / 1024).toFixed(2);
            const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
            const fileSize = buffer.length > 1024 * 1024 
                ? `${fileSizeMB} MB` 
                : `${fileSizeKB} KB`;

            let caption = `╭━━━ ${toSmallCaps('✅ upload success')} ━━━\n`;
            caption += `│ ${icon} ${toSmallCaps(`Type: ${mediaTypeName}`)}\n`;
            caption += `│ 📦 ${toSmallCaps(`Size: ${fileSize}`)}\n`;
            caption += `╰━━━━━━━━━━━━━━━━\n\n`;

            const buttons = [
                { 
                    name: 'cta_copy', 
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Copy URL',
                        copy_code: url
                    })
                }
            ];

            const payload = {
                text: caption.trim(),
                footer: toSmallCaps('KurumiSaki Project'),
                interactiveButtons: buttons
            };

            await sendInteractiveMessage(sock, m.chat, payload, { quoted: m });

        } catch (err) {
            console.error("tourl command error:", err);
            await m.react('❌');
            await m.reply(`❌ Gagal upload, cuy.\nError: ${err.message}`);
        }
    }
};