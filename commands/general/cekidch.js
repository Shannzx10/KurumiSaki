import { toSmallCaps } from "../../utility/Font.js";

function extractInviteCode(input) {
    const text = String(input || "").trim();
    if (!text) return null;
    // Format: https://whatsapp.com/channel/0029VaXXXX... (kode bisa bawa query/fragment)
    const urlMatch = text.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);
    if (urlMatch) return urlMatch[1];
    // Format mentah: kode invite saja
    if (/^[A-Za-z0-9]{10,}$/.test(text)) return text;
    return null;
}

function pick(obj, ...paths) {
    for (const p of paths) {
        const val = p.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
        if (val !== undefined && val !== null && val !== "") return val;
    }
    return undefined;
}

export default {
    name: "cekidch",
    aliases: ["cekidchannel", "chid", "idch"],
    desc: "Dapatkan ID @newsletter channel dari URL-nya",
    usage: "cekidch <url/kode invite channel>",
    category: "general",

    async execute({ m, args, sock, reply }) {
        const code = extractInviteCode(args.join(" ").trim() || args[0]);

        if (!code) {
            return await reply(
                `❌ ${toSmallCaps('link/kode channel-nya mana bro?')}\n` +
                `${toSmallCaps('contoh')}: cekidch https://whatsapp.com/channel/0029VaXXXX`
            );
        }

        if (typeof sock.newsletterMetadata !== "function") {
            return await reply(`❌ ${toSmallCaps('bot tidak mendukung lookup channel di versi ini')}.`);
        }

        try {
            await m.react("🔍");
            const meta = await sock.newsletterMetadata("invite", code);

            if (!meta || !meta.id) {
                await m.react("❌");
                return await reply(`❌ ${toSmallCaps('channel tidak ditemukan, cek link-nya lagi')}.`);
            }

            await m.react("✅");

            const name = pick(meta, "thread_metadata.name.text", "name") || "-";
            const desc = pick(meta, "thread_metadata.description.text", "description") || "-";
            const subs = pick(meta, "thread_metadata.subscribers_count", "subscribers") ?? "-";
            const invite = pick(meta, "thread_metadata.invite", "invite") || code;
            const verified = pick(meta, "thread_metadata.verification", "verification");

            let msg = `╭━━━ ${toSmallCaps('channel info')} ━━━\n`;
            msg += `│ 📢 ${toSmallCaps('name')}: ${name}\n`;
            msg += `│ 🆔 ${toSmallCaps('id')}: ${meta.id}\n`;
            msg += `│ 👥 ${toSmallCaps('subscribers')}: ${subs}\n`;
            if (verified) msg += `│ ✔️ ${toSmallCaps('verification')}: ${typeof verified === "object" ? JSON.stringify(verified) : verified}\n`;
            if (desc && desc !== "-") msg += `│ 📝 ${toSmallCaps('desc')}: ${String(desc).substring(0, 100)}\n`;
            msg += `│ 🔗 ${toSmallCaps('invite')}: https://whatsapp.com/channel/${invite}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            return await reply(msg);
        } catch (err) {
            console.error("cekidch error:", err.message);
            await m.react("❌");
            return await reply(
                `❌ ${toSmallCaps('gagal ambil info channel')}.\n${toSmallCaps('error')}: ${err.message}`
            );
        }
    }
};
