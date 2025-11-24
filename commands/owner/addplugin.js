import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { toSmallCaps } from "../../utility/Font.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    name: "addplugin",
    aliases: ["addplug", "ap"],
    desc: "Add new plugin from .js file",
    usage: "addplugin <category> (reply/send .js file)",
    category: "owner",
    ownerOnly: true,
    
    async execute({ args, reply, handler, m }) {
        try {
            if (args.length === 0) {
                let msg = `╭━━━ ${toSmallCaps('add plugin')} ━━━\n`;
                msg += `│\n`;
                msg += `│ ${toSmallCaps('usage')}:\n`;
                msg += `│ ${toSmallCaps('send or reply to a .js file with')}:\n`;
                msg += `│ addplugin <category>\n`;
                msg += `│\n`;
                msg += `│ ${toSmallCaps('example')}:\n`;
                msg += `│ addplugin general\n`;
                msg += `│ addplugin owner\n`;
                msg += `│\n`;
                msg += `│ ${toSmallCaps('file must be .js format')}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                return await reply(msg);
            }

            const category = args[0].toLowerCase();

            let document = null;
            let fileName = null;

            if (m.quoted && m.quoted.type === "documentMessage") {
                document = m.quoted;
                fileName = m.quoted.msg?.fileName || m.quoted.msg?.mimetype;
            } else if (m.type === "documentMessage") {
                document = m;
                fileName = m.msg?.fileName || m.msg?.mimetype;
            }

            if (!document) {
                return await reply(`❌ ${toSmallCaps('please send or reply to a .js file')}!`);
            }

            if (!fileName || !fileName.endsWith(".js")) {
                return await reply(`❌ ${toSmallCaps('file must be .js format')}!`);
            }

            await m.react("🔄");

            const buffer = document === m.quoted 
                ? await m.quoted.download()
                : await m.download();

            if (!buffer) {
                await m.react("❌");
                return await reply(`❌ ${toSmallCaps('failed to download file')}!`);
            }

            const code = buffer.toString("utf-8");

            if (!code.includes("export default") || !code.includes("execute")) {
                await m.react("❌");
                return await reply(`❌ ${toSmallCaps('invalid plugin! must have export default and execute function')}`);
            }

            const nameMatch = code.match(/name:\s*["']([^"']+)["']/);
            if (!nameMatch) {
                await m.react("❌");
                return await reply(`❌ ${toSmallCaps('plugin must have a name property')}!`);
            }

            const pluginName = nameMatch[1];
            const pluginFileName = fileName;

            const pluginsDir = path.join(__dirname, "..", "..", "commands");
            const categoryDir = path.join(pluginsDir, category);

            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
            }

            const fullPath = path.join(categoryDir, pluginFileName);
            const isOverwrite = fs.existsSync(fullPath) || handler.get(pluginName);

            if (handler.get(pluginName)) {
                const oldCmd = handler.get(pluginName);
                handler.commands.delete(pluginName);
                
                if (oldCmd.aliases) {
                    oldCmd.aliases.forEach(alias => {
                        handler.aliases.delete(alias.toLowerCase());
                    });
                }
            }

            fs.writeFileSync(fullPath, code, "utf8");

            try {
                const fileUrl = `file://${fullPath}?t=${Date.now()}`;
                const module = await import(fileUrl);
                const plugin = module.default;

                if (!plugin || !plugin.name) {
                    fs.unlinkSync(fullPath);
                    await m.react("❌");
                    return await reply(`❌ ${toSmallCaps('invalid plugin structure')}!`);
                }

                handler.register({
                    ...plugin,
                    category: category
                });

                await m.react("✅");

                let msg = `╭━━━ ${toSmallCaps(isOverwrite ? 'plugin overwritten' : 'plugin added')} ━━━\n`;
                msg += `│\n`;
                if (isOverwrite) {
                    msg += `│ 🔄 ${toSmallCaps('status')}: ${toSmallCaps('overwritten')}\n`;
                }
                msg += `│ ✅ ${toSmallCaps('name')}: ${plugin.name}\n`;
                msg += `│ 📁 ${toSmallCaps('file')}: ${pluginFileName}\n`;
                msg += `│ 📂 ${toSmallCaps('category')}: ${category}\n`;
                msg += `│ ✨ ${toSmallCaps('aliases')}: ${plugin.aliases ? plugin.aliases.join(", ") : toSmallCaps('none')}\n`;
                msg += `│ 📝 ${toSmallCaps('desc')}: ${plugin.desc || toSmallCaps('no description')}\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;

                await reply(msg);
            } catch (err) {
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
                await m.react("❌");
                throw err;
            }

        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('error')}: ${err.message}`);
        }
    }
};