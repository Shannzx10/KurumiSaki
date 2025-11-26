import fs from "fs";
import path from "path";
import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "setmw",
    desc: "Enable or disable middleware features",
    usage: "setmw <feature_name>",
    category: "owner",
    ownerOnly: true,

    async execute({ args, config, reply, m }) {
        const feature = args[0]?.toLowerCase();
        const configPath = path.join(process.cwd(), "config.js");

        if (!feature) {
            let msg = `╭━━━ ${toSmallCaps('middleware status')} ━━━\n│\n`;
            for (const key in config.middlewares) {
                const status = config.middlewares[key] ? "✅ ON" : "❌ OFF";
                msg += `│ • ${toSmallCaps(key)}: ${status}\n`;
            }
            msg += `│\n╰━━━━━━━━━━━━━━━━`;
            return await reply(msg);
        }

        if (!(feature in config.middlewares)) {
            return await reply(`❌ ${toSmallCaps('feature not found')}: ${feature}`);
        }

        try {
            await m.react("🔄");

            const currentState = config.middlewares[feature];
            const newState = !currentState;
            
            config.middlewares[feature] = newState;

            let configContent = fs.readFileSync(configPath, "utf8");
            
            const regex = new RegExp(`(${feature}:\\s*)(${currentState})`);
            configContent = configContent.replace(regex, `$1${newState}`);
            
            fs.writeFileSync(configPath, configContent, "utf8");

            await m.react("✅");

            const statusText = newState ? "enabled" : "disabled";
            let msg = `╭━━━ ${toSmallCaps('set middleware success')} ━━━\n`;
            msg += `│\n`;
            msg += `│ ✅ ${toSmallCaps('feature')}: ${toSmallCaps(feature)}\n`;
            msg += `│ 📊 ${toSmallCaps('new status')}: ${toSmallCaps(statusText)}\n`;
            msg += `│\n`;
            msg += `│ 💡 ${toSmallCaps('note')}: ${toSmallCaps('restart the bot to apply')}\n`;
            msg += `╰━━━━━━━━━━━━━━━━`;

            await reply(msg);

        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('failed')}: ${err.message}`);
        }
    }
};