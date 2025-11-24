import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { toSmallCaps } from "../../utility/Font.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    name: "delplugin",
    aliases: ["delplug", "dp", "rmplugin"],
    desc: "Delete plugin file",
    usage: "delplugin <plugin-name>",
    category: "owner",
    ownerOnly: true,
    
    async execute({ args, reply, handler, m }) {
        try {
            if (args.length === 0) {
                let msg = `╭━━━ ${toSmallCaps('delete plugin')} ━━━\n`;
                msg += `│\n`;
                msg += `│ ${toSmallCaps('usage')}:\n`;
                msg += `│ delplugin <plugin-name>\n`;
                msg += `│\n`;
                msg += `│ ${toSmallCaps('example')}:\n`;
                msg += `│ delplugin test\n`;
                msg += `│\n`;
                msg += `│ ⚠️ ${toSmallCaps('this action cannot be undone')}!\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;
                return await reply(msg);
            }

            const pluginName = args[0].toLowerCase();
            const cmd = handler.get(pluginName);

            if (!cmd) {
                return await reply(`❌ ${toSmallCaps('plugin')} '${pluginName}' ${toSmallCaps('not found')}!`);
            }

            await m.react("🔄");

            const pluginsDir = path.join(__dirname, "..", "..", "commands");
            const files = scanFolder(pluginsDir, pluginsDir);
            let deleted = false;

            for (const file of files) {
                const fileName = path.basename(file, ".js").toLowerCase();
                
                if (fileName === pluginName || fileName === `_${pluginName}`) {
                    const fullPath = path.join(pluginsDir, file);

                    fs.unlinkSync(fullPath);
                    handler.commands.delete(pluginName);
                    
                    if (cmd.aliases) {
                        cmd.aliases.forEach(alias => {
                            handler.aliases.delete(alias.toLowerCase());
                        });
                    }

                    deleted = true;
                    
                    await m.react("✅");

                    let msg = `╭━━━ ${toSmallCaps('plugin deleted')} ━━━\n`;
                    msg += `│\n`;
                    msg += `│ 🗑️ ${toSmallCaps('name')}: ${pluginName}\n`;
                    msg += `│ 📁 ${toSmallCaps('file')}: ${file}\n`;
                    msg += `│ 📂 ${toSmallCaps('category')}: ${cmd.category || 'general'}\n`;
                    msg += `│\n`;
                    msg += `│ ⚠️ ${toSmallCaps('this action cannot be undone')}!\n`;
                    msg += `╰━━━━━━━━━━━━━━━━`;

                    await reply(msg);
                    break;
                }
            }

            if (!deleted) {
                await m.react("❌");
                await reply(`❌ ${toSmallCaps('plugin file not found for')} '${pluginName}'`);
            }

        } catch (err) {
            await m.react("❌");
            await reply(`❌ ${toSmallCaps('error')}: ${err.message}`);
        }
    }
};

function scanFolder(dir, base) {
    let files = [];
    
    try {
        if (!fs.existsSync(dir)) return files;

        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                files = files.concat(scanFolder(fullPath, base));
            } else if (item.isFile() && item.name.endsWith(".js")) {
                const rel = path.relative(base, fullPath);
                files.push(rel.replace(/\\/g, "/"));
            }
        }
    } catch (err) {
        console.error("Scan error:", err.message);
    }
    
    return files;
}