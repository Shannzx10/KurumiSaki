import axios from 'axios';
import { toSmallCaps } from '../../utility/Font.js';

async function spotifyDownloader(url) {
    try {
        if (!url) throw new Error('Input URL is required.');
        const { data: details } = await axios.get(
            `https://spotdown.org/api/song-details?url=${encodeURIComponent(url)}`, 
            {
                headers: {
                    'origin': 'https://spotdown.org',
                    'referer': 'https://spotdown.org/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
                }
            }
        );
        
        const song = details.songs[0];
        if (!song) throw new Error('Lagu ga ketemu, mungkin link-nya salah.');

        const { data: audioBuffer } = await axios.post(
            'https://spotdown.org/api/download',
            { url: song.url },
            {
                headers: {
                    'origin': 'https://spotdown.org',
                    'referer': 'https://spotdown.org/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
                },
                responseType: 'arraybuffer'
            }
        );

        return {
            metadata: {
                title: song.title,
                artist: song.artist,
                duration: song.duration,
                cover: song.thumbnail,
                url: song.url
            },
            audio: audioBuffer
        };

    } catch (error) {
        const errorMessage = error.response ? error.response.data.message : error.message;
        throw new Error(errorMessage || 'Gagal ngambil data dari scraper.');
    }
}


export default {
    name: 'spodl',
    aliases: ['spotify', 'spotifydl'],
    desc: 'Download audio dari Spotify',
    usage: 'spodl <spotify_track_url>',
    category: 'downloader',
    waitMessage: `${toSmallCaps('⏳ Sabar bro, lagi ngambil lagunya...')}`,
    
    async execute({ m, args, sock }) {
        if (!args.length) {
            return m.reply(`${toSmallCaps(`❌ Masukin link Spotify-nya, bro.\nContoh: .spodl`)} https://open.spotify.com/track/...`);
        }
        
        const url = args[0];

        if (!url.includes('open.spotify.com/track')) {
            return m.reply(toSmallCaps('❌ Link-nya ga valid, harus link track Spotify, cuy.'));
        }

        try {
            const result = await spotifyDownloader(url);
            const { metadata, audio } = result;

            let caption = `╭━━━ ${toSmallCaps('spotify download')} ━━━\n`;
            caption += `│ 📌 ${toSmallCaps(`*${metadata.title}*`)}\n`;
            caption += `│ 👤 ${toSmallCaps(`${metadata.artist}`)}\n`;
            caption += `│ 🕒 ${toSmallCaps(`${metadata.duration}`)}\n`;
            caption += `╰━━━━━━━━━━━━━━━━\n`;

            await sock.sendMessage(m.chat, {
                image: { url: metadata.cover },
                caption: caption.trim()
            }, { quoted: m });

            await sock.sendMessage(m.chat, {
                audio: audio,
                mimetype: 'audio/mpeg'
            }, { quoted: m });

        } catch (err) {
            console.error("Spodl error:", err);
            await m.reply(toSmallCaps(`❌ Gagal download, bro. Scraper lagi down kayaknya.\nError: ${err.message}`));
        }
    }
};