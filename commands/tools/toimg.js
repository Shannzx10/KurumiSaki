import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "toimg",
    aliases: ["toimage"],
    desc: "Convert sticker to image/video",
    usage: "toimg <reply to sticker>",
    category: "tools",
    waitMessage: "⏳ Sabar bro, lagi di-convert...",

    async execute({ m, sock }) {
        if (!m.quoted || m.quoted.type !== 'stickerMessage') {
            return await m.reply(`❌ Reply ke stiker yang mau dijadiin gambar, bro.`);
        }

        try {
            const buffer = await m.quoted.download();
            const isAnimated = m.quoted.msg?.isAnimated || false;

            if (isAnimated) {
                await sock.sendMessage(m.chat, {
                    video: buffer,
                    gifPlayback: true,
                    caption: `✅ ${toSmallCaps('done')}`
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: `✅ ${toSmallCaps('done')}`
                }, { quoted: m });
            }

        } catch (err) {
            console.error("toimg error:", err);
            await m.reply(`❌ Gagal convert, cuy. Coba lagi nanti ya.\nError: ${err.message}`);
        }
    }
};