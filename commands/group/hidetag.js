import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "hidetag",
    aliases: ["ht", "tag"],
    desc: "Tag all members without notification",
    usage: "hidetag <text>",
    category: "group",
    groupOnly: true,
    adminOnly: true,
    
    async execute({ args, m, sys, sock, reply }) {
        try {
            const metadata = await sys.getGroupMetadata(m.chat);
            const participants = metadata.participants.map(p => p.id);
            
            const text = args.length > 0 
                ? args.join(" ") 
                : m.quoted?.text || toSmallCaps('group notification');
            
            await sock.sendMessage(m.chat, {
                text: text,
                mentions: participants
            });
            
        } catch (err) {
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};