import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "leave",
    aliases: ["exit", "bye"],
    desc: "Bot leave from group",
    usage: "leave",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    
    async execute({ m, sock, reply }) {
        try {
            await reply(`👋 ${toSmallCaps('goodbye! thanks for using me')}`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await sock.groupLeave(m.chat);
        } catch (err) {
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};