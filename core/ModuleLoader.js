import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Logger } from "./Logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ModuleLoader {
    constructor(handler, config) {
        this.handler = handler;
        this.config = config;
        this.modulesPath = path.join(__dirname, "..", "commands");
        this.loadedFiles = new Set();
    }

    scanFolder(dir, base) {
        let files = [];
        
        try {
            if (!fs.existsSync(dir)) return files;

            const items = fs.readdirSync(dir, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dir, item.name);
                
                if (item.isDirectory()) {
                    files = files.concat(this.scanFolder(fullPath, base));
                } else if (item.isFile() && item.name.endsWith(".js")) {
                    const rel = path.relative(base, fullPath);
                    files.push(rel.replace(/\\/g, "/"));
                }
            }
        } catch (err) {
            console.error(chalk.red("❌ Scan error:"), err.message);
        }
        
        return files;
    }

    async load() {
        try {
            if (!fs.existsSync(this.modulesPath)) {
                fs.mkdirSync(this.modulesPath, { recursive: true });
                Logger.logWarning("Created plugins folder");
            }

            this.loadedFiles.clear();
            const files = this.scanFolder(this.modulesPath, this.modulesPath);
            const uniqueFiles = [...new Set(files)];

            for (const file of uniqueFiles) {
                await this.loadFile(file);
            }

            Logger.logSuccess(
                `Loaded ${chalk.cyan(this.handler.commands.size)} commands and ` +
                `${chalk.magenta(this.handler.middlewares.size)} middlewares`
            );
        } catch (err) {
            Logger.logError(`Module loading failed: ${err.message}`);
        }
    }

    async loadFile(file) {
        try {
            if (this.loadedFiles.has(file)) {
                return;
            }

            const filePath = path.join(this.modulesPath, file);

            if (!fs.existsSync(filePath)) {
                return;
            }

            const fileUrl = `file://${filePath}?t=${Date.now()}`;
            const module = await import(fileUrl);
            const plugin = module.default;

            if (!plugin) return;

            const fileName = path.basename(file);
            const folder = path.dirname(file);

            if (fileName.startsWith("_")) {
                const mwName = path.basename(fileName, ".js").substring(1);
                
                if (this.config.middlewares && this.config.middlewares[mwName] === false) {
                    return;
                }
                
                if (!this.handler.middlewares.has(mwName)) {
                    this.handler.use(mwName, plugin);
                    this.loadedFiles.add(file);
                }
            }
            else if (typeof plugin === "object" && plugin.execute && plugin.name) {
                if (!this.handler.commands.has(plugin.name.toLowerCase())) {
                    this.handler.register({
                        ...plugin,
                        category: folder === "." ? "general" : folder
                    });
                    this.loadedFiles.add(file);
                } else {
                    Logger.logWarning(`Duplicate command skipped: ${plugin.name} (${file})`);
                }
            }
        } catch (err) {
            console.error(chalk.red(`❌ ${file}:`), err.message);
        }
    }

    async reload(file) {
        try {
            this.loadedFiles.delete(file);
            
            const filePath = path.join(this.modulesPath, file);
            const fileName = path.basename(file);
            const plugin = await import(`file://${filePath}?t=${Date.now()}`);
            
            if (!plugin.default) return false;

            if (fileName.startsWith("_")) {
                const mwName = path.basename(fileName, ".js").substring(1);
                this.handler.middlewares.delete(mwName);
            } else if (plugin.default.name) {
                this.handler.commands.delete(plugin.default.name.toLowerCase());
                if (plugin.default.aliases) {
                    plugin.default.aliases.forEach(alias => {
                        this.handler.aliases.delete(alias.toLowerCase());
                    });
                }
            }

            await this.loadFile(file);
            return true;
        } catch (err) {
            Logger.logError(`Reload failed: ${err.message}`);
            return false;
        }
    }

    getLoadedFiles() {
        return Array.from(this.loadedFiles);
    }
}