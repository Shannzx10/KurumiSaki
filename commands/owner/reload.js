import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { toSmallCaps } from "../../utility/Font.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    name: "reload",
    aliases: ["rl", "refresh"],
    desc: "Reload plugin without restart",
    usage: "reload [plugin-name]",
    category: "owner",
    ownerOnly: true,
    
    async execute({ args, reply, handler, m }) {
        try {
            const pluginsDir = path.join(__dirname, "..", "..", "commands");

            if (args.length === 0) {
                await m.react("🔄");
                const startTime = Date.now();

                const oldSize = handler.commands.size;
                handler.commands.clear();
                handler.aliases.clear();
                handler.categories.clear();
                handler.middlewares.clear();

                const files = scanFolder(pluginsDir, pluginsDir);
                let loadedCmds = 0;
                let loadedMw = 0;
                let failed = 0;

                for (const file of files) {
                    try {
                        const type = await loadFile(file, pluginsDir, handler);
                        if (type === 'command') {
                            loadedCmds++;
                        } else if (type === 'middleware') {
                            loadedMw++;
                        }
                    } catch (err) {
                        console.error(`Failed to load ${file}:`, err.message);
                        failed++;
                    }
                }

                const duration = Date.now() - startTime;

                await m.react("✅");

                let msg = `╭━━━ ${toSmallCaps('reload complete')} ━━━\n`;
                msg += `│\n`;
                msg += `│ ✅ ${toSmallCaps('loaded cmd')}: ${loadedCmds} ${toSmallCaps('plugins')}\n`;
                msg += `│ ⚙️ ${toSmallCaps('loaded mw')}: ${loadedMw} ${toSmallCaps('middlewares')}\n`;
                msg += `│ ❌ ${toSmallCaps('failed')}: ${failed} ${toSmallCaps('plugins')}\n`;
                msg += `│ 🔄 ${toSmallCaps('previous')}: ${oldSize} ${toSmallCaps('commands')}\n`;
                msg += `│ ⚡ ${toSmallCaps('current')}: ${handler.commands.size} ${toSmallCaps('commands')}\n`;
                msg += `│ ⏱️ ${toSmallCaps('duration')}: ${duration}ms\n`;
                msg += `╰━━━━━━━━━━━━━━━━`;

                return await reply(msg);
            }

            const pluginName = args[0].toLowerCase();
            const cmd = handler.get(pluginName);

            if (!cmd) {
                return await reply(`❌ ${toSmallCaps('plugin')} '${pluginName}' ${toSmallCaps('not found')}!`);
            }

            await m.react("🔄");

            const files = scanFolder(pluginsDir, pluginsDir);
            let found = false;

            for (const file of files) {
                const fileName = path.basename(file, ".js").toLowerCase();
                
                if (fileName === pluginName || fileName === `_${pluginName}`) {
                    try {
                        handler.commands.delete(pluginName);
                        if (cmd.aliases) {
                            cmd.aliases.forEach(alias => {
                                handler.aliases.delete(alias.toLowerCase());
                            });
                        }

                        await loadFile(file, pluginsDir, handler);
                        found = true;

                        await m.react("✅");

                        let msg = `╭━━━ ${toSmallCaps('plugin reloaded')} ━━━\n`;
                        msg += `│\n`;
                        msg += `│ 🔄 ${toSmallCaps('name')}: ${pluginName}\n`;
                        msg += `│ 📁 ${toSmallCaps('file')}: ${file}\n`;
                        msg += `│ 📂 ${toSmallCaps('category')}: ${cmd.category || 'general'}\n`;
                        msg += `╰━━━━━━━━━━━━━━━━`;

                        await reply(msg);
                        break;
                    } catch (err) {
                        await m.react("❌");
                        return await reply(`❌ ${toSmallCaps('reload failed')}: ${err.message}`);
                    }
                }
            }

            if (!found) {
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

async function loadFile(file, pluginsDir, handler) {
    const filePath = path.join(pluginsDir, file);
    const fileUrl = `file://${filePath}?t=${Date.now()}`;
    const module = await import(fileUrl);
    const plugin = module.default;

    if (!plugin) return null;

    const fileName = path.basename(file);
    const folder = path.dirname(file);

    if (fileName.startsWith("_")) {
        const mwName = path.basename(fileName, ".js").substring(1);
        handler.use(mwName, plugin);
        return 'middleware';
    }
    else if (typeof plugin === "object" && plugin.execute) {
        handler.register({
            ...plugin,
            category: folder === "." ? "general" : folder
        });
        return 'command';
    }
    
    return null;
}