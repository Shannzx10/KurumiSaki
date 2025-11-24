import ytSearch from 'yt-search';
import { toSmallCaps } from '../../utility/Font.js';

export default {
    name: 'yts',
    aliases: ['ytsearch', 'youtubesearch'],
    desc: 'Cari video di YouTube',
    usage: 'yts <query>',
    category: 'search',
    waitMessage: '⏳ Sabar bro, lagi nyari...',
    
    async execute({ m, args, sock }) {
        if (!args.length) {
            return await m.reply(`❌ Masukin query pencariannya, bro.\nContoh: .yts lofi hip hop`);
        }

        const query = args.join(' ');

        try {
            const result = await ytSearch(query);
            const videos = result.videos.slice(0, 5);

            if (!videos.length) {
                return await m.reply(`❌ Video "${query}" kaga ketemu, cuy.`);
            }

            let msg = `╭━━━ ${toSmallCaps('youtube search')} ━━━\n`;
            msg += `│ 🔎 ${toSmallCaps('query')}: ${query}\n`;
            msg += `╰━━━━━━━━━━━━━━━━\n\n`;

            videos.forEach((v, i) => {
                msg += `╭─ ${toSmallCaps('result')} ${i + 1} ─\n`;
                msg += `│ 📌 *${v.title}*\n`;
                msg += `│ 🕒 ${v.timestamp}\n`;
                msg += `│ 👀 ${v.views.toLocaleString()} ${toSmallCaps('views')}\n`;
                msg += `│ 👤 ${v.author.name}\n`;
                msg += `│ 🔗 ${v.url}\n`;
                msg += `╰──────────\n\n`;
            });

            const firstVideo = videos[0];
            await sock.sendMessage(m.chat, {
                image: { url: firstVideo.thumbnail },
                caption: msg.trim()
            }, { quoted: m });

        } catch (err) {
            console.error("YTSearch error:", err);
            await m.reply(`❌ Gagal nyari video, bro. Coba lagi nanti.\nError: ${err.message}`);
        }
    }
};