import { uploadFile } from '../../utility/Uploader.js';
import { toSmallCaps } from '../../utility/Font.js';

export default {
    name: 'tourl',
    aliases: ['upload', 'toupload'],
    desc: 'Upload media (image/video/audio/doc) ke URL',
    usage: 'tourl <reply to media>',
    category: 'tools',
    waitMessage: '⏳ Sabar bro, lagi di-upload...',
    
    async execute({ m, sock }) {
        const media = m.quoted && m.quoted.isMedia ? m.quoted : m;

        if (!media.isMedia) {
            return await m.reply(`❌ Reply ke media (gambar/video/audio/dokumen) yang mau di-upload, bro.`);
        }

        try {
            const buffer = await media.download();
            if (!buffer) {
                return await m.reply('❌ Gagal download media, coba lagi.');
            }

            const mimetype = media.msg.mimetype;
            const url = await uploadFile(buffer, mimetype);

            let replyText = `╭━━━ ${toSmallCaps('upload success')} ━━━\n`;
            replyText += `│ 🔗 *URL*: ${url}\n`;
            replyText += `╰━━━━━━━━━━━━━━━━`;
            
            await m.reply(replyText);

        } catch (err) {
            console.error("tourl command error:", err);
            await m.reply(`❌ Gagal upload, cuy.\nError: ${err.message}`);
        }
    }
};