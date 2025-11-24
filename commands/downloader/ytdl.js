import ytSearch from 'yt-search';
import axios from 'axios';
import { toSmallCaps } from '../../utility/Font.js';

async function ytdlp(type, videoUrl) {
    const command = type === "audio" ? `-x --audio-format mp3 ${videoUrl}` : `-f 136+140 ${videoUrl}`;
    const encoded = encodeURIComponent(command);

    try {
        const res = await axios.get(
            `https://ytdlp.online/stream?command=${encoded}`,
            { responseType: "stream" }
        );

        return new Promise((resolve, reject) => {
            let downloadUrl = null;
            res.data.on("data", chunk => {
                const text = chunk.toString();
                const match = text.match(/href="([^"]+\.(mp3|mp4|m4a|webm))"/);
                if (match && match[1]) {
                    downloadUrl = `https://ytdlp.online${match[1]}`;
                }
            });
            res.data.on("end", () => {
                if (!downloadUrl) reject(new Error("Download URL not found from scraper."));
                else resolve({ dl: downloadUrl });
            });
            res.data.on("error", reject);
        });
    } catch (err) {
        throw new Error(`Scraper request failed: ${err.message}`);
    }
}

function getVideoId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1);
        }
        return urlObj.searchParams.get('v');
    } catch {
        return null;
    }
}

export default {
    name: 'ytdl',
    aliases: ['ytmp3', 'ytmp4', 'youtubedl'],
    desc: 'Download video/audio dari YouTube',
    usage: 'ytdl <mp3/mp4> <youtube_url>',
    category: 'downloader',
    waitMessage: '⏳ Sabar bro, lagi proses...',
    
    async execute({ m, args, sock }) {
        if (args.length < 2) {
            return m.reply(`❌ Format salah, bro.\nContoh: .ytdl mp4 https://youtube.com/watch?v=...`);
        }
        
        const type = args[0].toLowerCase();
        const url = args[1];

        if (type !== 'mp3' && type !== 'mp4') {
            return m.reply(`❌ Pilih tipe dulu, mp3 atau mp4.`);
        }

        const videoId = getVideoId(url);
        if (!videoId) {
            return m.reply('❌ Link YouTube-nya ga valid, cuy.');
        }

        try {
            const video = await ytSearch({ videoId });
            if (!video) {
                return m.reply('❌ Video ga ketemu, linknya bener ga?');
            }

            const result = await ytdlp(type === 'mp3' ? '--audio' : '--video', url);
            const downloadUrl = result.dl;

            let caption = `╭━━━ ${toSmallCaps('youtube download')} ━━━\n`;
            caption += `│ 📌 *${video.title}*\n`;
            caption += `│ 👤 ${video.author.name}\n`;
            caption += `│ 🕒 ${video.timestamp}\n`;
            caption += `╰━━━━━━━━━━━━━━━━\n`;

            if (type === 'mp4') {
                await sock.sendMessage(m.chat, {
                    video: { url: downloadUrl },
                    caption: caption.trim()
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg'
                }, { quoted: m });
                await sock.sendMessage(m.chat, { text: caption.trim() }, { quoted: m });
            }

        } catch (err) {
            console.error("YTDL error:", err);
            await m.reply(`❌ Gagal download, bro. Mungkin linknya mati atau server scraper lagi down.\nError: ${err.message}`);
        }
    }
};