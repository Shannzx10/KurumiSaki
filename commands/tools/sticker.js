import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "sticker",
    aliases: ["s", "stiker"],
    desc: "Create sticker from image/video",
    usage: "sticker <reply to media>",
    category: "tools",
    waitMessage: "⏳ Sabar bro, stiker lagi dibikin...",
    
    async execute({ m, sock, config }) {
        const media = m.quoted && m.quoted.isMedia ? m.quoted : m;

        if (!media.isMedia || !/image|video/i.test(media.msg.mimetype)) {
            return await m.reply(`❌ Reply ke gambar/video buat dijadiin stiker, bro.`);
        }

        try {
            const buffer = await media.download();
            const pack = config.botName || "Kurumi";
            const author = config.ownerName || "Shannz";

            const sticker = new Sticker(buffer, {
                pack: pack,
                author: author,
                type: StickerTypes.FULL,
                categories: ['🤖', '😂'],
                id: `kurumi-${Date.now()}`,
                quality: 50,
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer
            }, { quoted: m });

        } catch (err) {
            console.error("Sticker creation error:", err);
            await m.reply(`❌ Gagal bikin stiker, coba lagi nanti ya.\nError: ${err.message}`);
        }
    }
};