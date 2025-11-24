import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "swm",
    aliases: ["stickerwm", "take"],
    desc: "Create sticker with custom watermark",
    usage: "swm <packname>|<authorname> (reply to sticker)",
    category: "tools",
    waitMessage: "⏳ Sabar bro, stiker lagi di-edit...",

    async execute({ m, sock, config, args }) {
        if (!m.quoted || m.quoted.type !== 'stickerMessage') {
            return await m.reply(`❌ Reply ke stiker yang mau diganti watermark-nya, bro.`);
        }

        try {
            const [pack, author] = args.join(' ').split('|').map(s => s.trim());
            
            const packName = pack || config.botName || "Kurumi";
            const authorName = author || config.ownerName || "Shannz";

            const buffer = await m.quoted.download();

            const sticker = new Sticker(buffer, {
                pack: packName,
                author: authorName,
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
            console.error("SWM error:", err);
            await m.reply(`❌ Gagal ganti watermark, coba lagi nanti ya.\nError: ${err.message}`);
        }
    }
};