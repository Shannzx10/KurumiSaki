import ytSearch from 'yt-search';
import { toSmallCaps } from '../../utility/Font.js';
import { sendButtons } from '../../utility/Button.js';

const searchCache = new Map();

async function sendPagedResults(m, sock, results, page = 0, prefix = "@") {
    const resultsPerPage = 5;
    const startIndex = page * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const pagedResults = results.slice(startIndex, endIndex);

    if (pagedResults.length === 0) {
        return m.reply(toSmallCaps('❌ Udah ga ada hasil lagi, bro.'));
    }

    let msg = `╭━━━ ${toSmallCaps('youtube search')} ━━━\n`;
    msg += `│ 📄 ${toSmallCaps(`Page ${page + 1} of ${Math.ceil(results.length / resultsPerPage)}`)}\n`;
    msg += `╰━━━━━━━━━━━━━━━━\n\n`;

    pagedResults.forEach((video, index) => {
        msg += `╭─ ${toSmallCaps(`*${startIndex + index + 1}. ${video.title}*`)}\n`;
        msg += `│ 🕒 ${toSmallCaps(`Duration: ${video.timestamp}`)}\n`;
        msg += `│ 👁️ ${toSmallCaps(`Views: ${video.views.toLocaleString()}`)}\n`;
        msg += `│ 📅 ${toSmallCaps(`Uploaded: ${video.ago}`)}\n`;
        msg += `│ 🔗 URL: ${video.url}\n`;
        msg += `╰─────────────────\n\n`;
    });

    const buttons = [];
    if (page > 0) {
        buttons.push({ id: `${prefix}yts _prev`, text: 'Previous' });
    }
    if (endIndex < results.length) {
        buttons.push({ id: `${prefix}yts _next`, text: 'Next' });
    }

    const firstVideoThumb = pagedResults[0].thumbnail || pagedResults[0].image;

    const payload = {
        image: { url: firstVideoThumb },
        caption: msg.trim(),
        footer: toSmallCaps('KurumiSaki Project'),
        buttons: buttons,
    };

    await sendButtons(sock, m.chat, payload, { quoted: m });
}


export default {
    name: 'yts',
    aliases: ['ytsearch'],
    desc: 'Cari video di YouTube pake button + thumbnail',
    usage: 'yts <query>',
    category: 'tools',
    
    async execute({ m, args, sock, config }) {
        const prefix = config?.prefix?.[0] || "@";
        const query = args.join(' ');
        const chatId = m.chat;

        if (args[0] === '_next' || args[0] === '_prev') {
            const session = searchCache.get(chatId);
            if (!session) {
                return m.reply(toSmallCaps('❌ Sesi pencarian lo udah abis, cari ulang ya.'));
            }

            let newPage = session.page;
            if (args[0] === '_next') newPage++;
            if (args[0] === '_prev') newPage--;

            session.page = newPage;
            searchCache.set(chatId, session);

            return await sendPagedResults(m, sock, session.results, newPage, prefix);
        }

        if (!query) {
            return m.reply(toSmallCaps(`❌ Query-nya mana bro? Contoh: ${prefix}yts kuromi tokisaki`));
        }

        try {
            await m.react('⏳');
            const searchResults = await ytSearch(query);
            const videos = searchResults.videos;

            if (videos.length === 0) {
                await m.react('❌');
                return m.reply(toSmallCaps('❌ Ga nemu video-nya, cuy. Coba keyword lain.'));
            }

            searchCache.set(chatId, { results: videos, page: 0 });
            
            await m.react('✅');
            await sendPagedResults(m, sock, videos, 0, prefix);

        } catch (err) {
            console.error("YTS error:", err);
            await m.reply(toSmallCaps(`❌ Gagal search, bro. Error: ${err.message}`));
        }
    }
};