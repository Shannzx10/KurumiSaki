import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "cekip",
    aliases: ["ip", "myip"],
    desc: "Cek informasi IP address bot",
    usage: "cekip",
    category: "general",
    cooldown: 10,
    
    async execute({ reply }) {
        try {
            await reply(`🔎 ${toSmallCaps('looking up ip info...')}`);
            
            const response = await fetch("https://api.myip.com");
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            
            const data = await response.json();
            
            let msg = `╭━━━ ${toSmallCaps('IP info')} ━━━\n`;
            msg += `│ 🌐 ${toSmallCaps('ip address')}: ${data.ip}\n`;
            msg += `│ 🌍 ${toSmallCaps('country')}: ${data.country}\n`;
            msg += `│ 🏷️ ${toSmallCaps('code')}: ${data.cc}\n`;
            msg += `╰━━━━━━━━━━━━━━━`;
            
            await reply(msg);

        } catch (error) {
            console.error(error);
            await reply(`❌ Gagal ngambil data IP, cuy. Coba lagi nanti.`);
        }
    }
};