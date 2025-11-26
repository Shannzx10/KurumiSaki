import ytSearch from 'yt-search';
import axios from 'axios';
import { toSmallCaps } from '../../utility/Font.js';
import { sendButtons } from '../../utility/Button.js';

const videoCache = new Map();

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

async function showVideoInfo(m, sock, video, url) {
    const chatId = m.chat;

    videoCache.set(chatId, { video, url });

    let caption = `╭━━━ ${toSmallCaps('youtube info')} ━━━\n`;
    caption += `│ 📌 ${toSmallCaps(`*${video.title}*`)}\n`;
    caption += `│ 👤 ${toSmallCaps(`Channel: ${video.author.name}`)}\n`;
    caption += `│ 🕒 ${toSmallCaps(`Duration: ${video.timestamp}`)}\n`;
    caption += `│ 👁️ ${toSmallCaps(`Views: ${video.views.toLocaleString()}`)}\n`;
    caption += `│ 📅 ${toSmallCaps(`Uploaded: ${video.ago}`)}\n`;
    caption += `│ 🔗 URL: ${video.url}\n`;
    caption += `╰━━━━━━━━━━━━━━━━\n\n`;
    caption += toSmallCaps('pilih format download:');

    const buttons = [
        { id: '.ytdl _mp4', text: 'Video (MP4)' },
        { id: '.ytdl _mp3', text: 'Audio (MP3)' }
    ];

    const payload = {
        image: { url: video.thumbnail },
        caption: caption.trim(),
        footer: toSmallCaps('KurumiSaki Project'),
        buttons: buttons
    };

    await sendButtons(sock, m.chat, payload, { quoted: m });
}

async function downloadVideo(m, sock, type) {
    const chatId = m.chat;
    const cached = videoCache.get(chatId);

    if (!cached) {
        return m.reply(toSmallCaps('❌ Sesi download udah expired, kirim link lagi ya bro.'));
    }

    const { video, url } = cached;

    try {
        await m.react('⏳');
        await m.reply(toSmallCaps('⏳ Sabar bro, lagi download...'));

        const result = await ytdlp(type === 'mp3' ? 'audio' : 'video', url);
        const downloadUrl = result.dl;

        let caption = `╭━━━ ${toSmallCaps('youtube download')} ━━━\n`;
        caption += `│ 📌 ${toSmallCaps(`*${video.title}*`)}\n`;
        caption += `│ 👤 ${toSmallCaps(`${video.author.name}`)}\n`;
        caption += `│ 🕒 ${toSmallCaps(`${video.timestamp}`)}\n`;
        caption += `╰━━━━━━━━━━━━━━━━\n`;

        if (type === 'mp4') {
            await sock.sendMessage(m.chat, {
                video: { url: downloadUrl },
                caption: caption.trim(),
                mimetype: 'video/mp4'
            }, { quoted: m });
        } else {
            await sock.sendMessage(m.chat, {
                audio: { url: downloadUrl },
                caption: caption.trim(),
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: m });
        }

        await m.react('✅');
        videoCache.delete(chatId);

    } catch (err) {
        console.error("YTDL error:", err);
        await m.react('❌');
        await m.reply(toSmallCaps(`❌ Gagal download, bro. Mungkin linknya mati atau server scraper lagi down.\nError: ${err.message}`));
    }
}

export default {
    name: 'ytdl',
    aliases: ['ytmp3', 'ytmp4', 'youtubedl', 'yt'],
    desc: 'Download video/audio dari YouTube dengan button',
    usage: 'ytdl <youtube_url>',
    category: 'downloader',
    
    async execute({ m, args, sock }) {
        if (args[0] === '_mp4' || args[0] === '_mp3') {
            const format = args[0].replace('_', '');
            return await downloadVideo(m, sock, format);
        }

        if (args.length < 1) {
            return m.reply(`${toSmallCaps('❌ Format salah, bro.\nContoh: .ytdl')} https://youtube.com/watch?v=...`);
        }
        
        const url = args[0];
        const videoId = getVideoId(url);
        
        if (!videoId) {
            return m.reply(toSmallCaps('❌ Link YouTube-nya ga valid, cuy.'));
        }

        try {
            await m.react('🔍');
            
            const video = await ytSearch({ videoId });
            if (!video) {
                await m.react('❌');
                return m.reply(toSmallCaps('❌ Video ga ketemu, linknya bener ga?'));
            }

            await m.react('✅');
            await showVideoInfo(m, sock, video, url);

        } catch (err) {
            console.error("YTDL fetch error:", err);
            await m.react('❌');
            await m.reply(toSmallCaps(`❌ Gagal fetch info video, bro.\nError: ${err.message}`));
        }
    }
};