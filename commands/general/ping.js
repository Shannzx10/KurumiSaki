import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "ping",
    aliases: ["p"],
    desc: "Check bot latency",
    usage: "ping",
    category: "general",
    
    async execute({ m, sock }) {
        const start = Date.now();
        
        const sent = await sock.sendMessage(m.chat, {
            text: `${toSmallCaps('pinging....')}! 🏓`
        }, { quoted: m });
        
        const latency = Date.now() - start;
        
        await sock.sendMessage(m.chat, {
            text: `${toSmallCaps('pong')}! 🏓\n${toSmallCaps('latency')}: *${latency}ms*`,
            edit: sent.key
        });
    }
};