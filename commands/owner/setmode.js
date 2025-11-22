import { toSmallCaps } from "../../utility/Font.js";
import fs from "fs";
import path from "path";

export default {
    name: "setmode",
    aliases: ["mode"],
    desc: "Change bot mode (self/public)",
    usage: "setmode <self|public>",
    category: "owner",
    ownerOnly: true,
    
    async execute({ args, config, reply, m }) {
        const mode = args[0]?.toLowerCase();

        if (!mode) {
            let msg = `╭━━━ ${toSmallCaps('current mode')} ━━━\n`;
            msg += `│\n`;
            msg += `│ 📊 ${toSmallCaps('mode')}: ${config.mode}\n`;
            msg += `│\n`;
            msg += `│ ${toSmallCaps('available modes')}:\n`;
            msg += `│ • self   → ${toSmallCaps('owner only')}\n`;
            msg += `│ • public → ${toSmallCaps('everyone')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;
            return await reply(msg);
        }

        if (!["self", "public"].includes(mode)) {
            return await reply(`❌ ${toSmallCaps('invalid mode')}! ${toSmallCaps('use')}: self ${toSmallCaps('or')} public`);
        }

        try {
            await m.react("🔄");

            config.mode = mode;

            const configPath = path.join(process.cwd(), "config.js");
            let configContent = fs.readFileSync(configPath, "utf8");

            configContent = configContent.replace(
                /mode:\s*["'](?:self|public)["']/,
                `mode: "${mode}"`
            );
            
            fs.writeFileSync(configPath, configContent, "utf8");
            
            await m.react("✅");
            
            let msg = `╭━━━ ${toSmallCaps('mode changed')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('new mode')}: ${mode}\n`;
            msg += `│\n`;
            if (mode === "self") {
                msg += `│ 🔒 ${toSmallCaps('bot now responds to owner only')}\n`;
            } else {
                msg += `│ 🌍 ${toSmallCaps('bot now responds to everyone')}\n`;
            }
            msg += `╰━━━━━━━━━━━━━━━━`;
            
            await reply(msg);
        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};