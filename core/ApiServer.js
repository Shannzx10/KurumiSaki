import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function formatRuntime(seconds) {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

export class ApiServer {
    constructor(loader, config) {
        this.loader = loader;
        this.config = config;
        this.app = express();
        this.port = this.config.port; 
        this.apiKey = this.config.secretKey;
        
        this.logClients = new Set();
        
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.setupLogCapture();
    }

    setupLogCapture() {
        const originalStdout = process.stdout.write;
        const originalStderr = process.stderr.write;
        
        process.stdout.write = (chunk, encoding, callback) => {
            this.broadcastLog(chunk.toString());
            return originalStdout.call(process.stdout, chunk, encoding, callback);
        };

        process.stderr.write = (chunk, encoding, callback) => {
            this.broadcastLog(chunk.toString());
            return originalStderr.call(process.stderr, chunk, encoding, callback);
        };
    }

    broadcastLog(data) {
        this.logClients.forEach(client => {
            client.write(`data: ${JSON.stringify({ log: data })}\n\n`);
        });
    }

    start() {
        this.app.use((req, res, next) => {
            if (!req.url.includes('/api/logs')) {
                // console.log(`[PANEL] ${req.method} ${req.url}`);
            }
            next();
        });

        this.app.get('/api/stats', (req, res) => {
            const uptime = process.uptime();
            const ramUsage = process.memoryUsage().rss / 1024 / 1024;
            res.json({
                status: true,
                bot_name: this.config.botName || "KurumiSaki",
                mode: this.config.mode || "public",
                uptime_seconds: Math.floor(uptime),
                runtime: formatRuntime(uptime),
                ram_use: ramUsage.toFixed(2) + " MB",
                total_commands: this.loader.handler.commands.size
            });
        });

        this.app.get('/api/config', (req, res) => {
            const key = req.query.key;
            if (key !== this.apiKey) return res.status(403).json({ status: false, msg: "API Key Salah!" });
            
            res.json({
                status: true,
                data: {
                    botName: this.config.botName,
                    mode: this.config.mode,
                    prefix: this.config.prefix,
                    owners: this.config.owners,
                    features: {
                        groupCache: this.config.groupCache?.enabled || false,
                        rateLimiter: this.config.rateLimiter?.enabled || false,
                        antiSpam: this.config.antiSpam?.enabled || false,
                        memoryMonitor: this.config.memoryMonitor?.enabled || false
                    }
                }
            });
        });

        this.app.post('/api/update-config', (req, res) => {
            const { key, changes, featureToggles } = req.body;
            if (key !== this.apiKey) return res.status(403).json({status: false, msg: "API Key Salah!"});

            try {
                const configPath = path.join(__dirname, '..', 'config.js');
                let content = fs.readFileSync(configPath, 'utf8');

                const updateField = (key, value) => {
                    let valStr;
                    if (Array.isArray(value)) valStr = JSON.stringify(value); 
                    else if (typeof value === 'string') valStr = `"${value}"`;
                    else valStr = value;
                    
                    const regex = new RegExp(`(${key}\\s*:\\s*)([^,\n]+)`, 'g');
                    if (Array.isArray(value)) {
                         const arrayRegex = new RegExp(`(${key}\\s*:\\s*\\[)([\\s\\S]*?)(\\])`, 'm');
                         if (arrayRegex.test(content)) {
                             const innerContent = valStr.slice(1, -1); 
                             content = content.replace(arrayRegex, `$1${innerContent}$3`);
                             return;
                         }
                    }
                    content = content.replace(regex, `$1${valStr}`);
                };

                const updateToggle = (parentKey, boolValue) => {
                    const regex = new RegExp(`(${parentKey}\\s*:\\s*\\{[^}]*?enabled\\s*:\\s*)(true|false)`, 'm');
                    if (regex.test(content)) {
                        content = content.replace(regex, `$1${boolValue}`);

                        if (this.config[parentKey]) {
                            this.config[parentKey].enabled = boolValue;
                        }
                    }
                };

                if (changes) {
                    if (changes.botName) updateField('botName', changes.botName);
                    if (changes.mode) updateField('mode', changes.mode);
                    if (changes.prefix) updateField('prefix', changes.prefix);
                    if (changes.owners) updateField('owners', changes.owners);
                    Object.assign(this.config, changes);
                }

                if (featureToggles) {
                    if (featureToggles.groupCache !== undefined) updateToggle('groupCache', featureToggles.groupCache);
                    if (featureToggles.rateLimiter !== undefined) updateToggle('rateLimiter', featureToggles.rateLimiter);
                    if (featureToggles.antiSpam !== undefined) updateToggle('antiSpam', featureToggles.antiSpam);
                    if (featureToggles.memoryMonitor !== undefined) updateToggle('memoryMonitor', featureToggles.memoryMonitor);
                }

                fs.writeFileSync(configPath, content, 'utf8');
                res.json({ status: true, msg: "Config berhasil disimpan!" });
            } catch (e) { 
                console.error(e);
                res.status(500).json({ status: false, msg: "Gagal menulis file config" }); 
            }
        });

        this.app.get('/api/files', (req, res) => {
            const key = req.query.key;
            if (key !== this.apiKey) return res.status(403).json({ status: false, msg: "API Key Salah!" });
            try {
                const commandsDir = path.resolve(__dirname, '..', 'commands');
                if (!fs.existsSync(commandsDir)) return res.json({ status: false, msg: "Folder commands tidak ditemukan", data: {} });
                const folders = ['general', 'owner', 'group', 'downloader', 'tools', 'system', 'search'];
                let result = {};
                folders.forEach(folder => {
                    const targetDir = path.join(commandsDir, folder);
                    if (fs.existsSync(targetDir)) result[folder] = fs.readdirSync(targetDir).filter(f => f.endsWith('.js'));
                    else result[folder] = [];
                });
                res.json({ status: true, data: result });
            } catch (e) { res.status(500).json({ status: false, msg: e.message }); }
        });

        this.app.post('/api/delete-file', async (req, res) => {
            const { key, folder, filename } = req.body;
            if (key !== this.apiKey) return res.status(403).json({status: false, msg: "API Key Salah!"}); 
            try {
                const filePath = path.join(__dirname, '..', 'commands', folder, filename);
                if (fs.existsSync(filePath)) {
                    const relativePath = path.join(folder, filename).replace(/\\/g, "/");
                    await this.loader.unloadFile(relativePath);
                    fs.unlinkSync(filePath);
                    return res.json({ status: true, msg: "File berhasil dihapus & Memory dibersihkan!" });
                }
                return res.json({ status: false, msg: "File tidak ditemukan." });
            } catch (e) { return res.status(500).json({ status: false, msg: e.message }); }
        });

        this.app.post('/api/save-command', async (req, res) => {
            try {
                const { key, folder, filename, code } = req.body;
                if (key !== this.apiKey) return res.status(403).json({status: false, msg: "API Key Salah!"});
                
                const targetDir = path.join(__dirname, '..', 'commands', folder);
                const actualFilename = filename.endsWith('.js') ? filename : `${filename}.js`;
                const targetFile = path.join(targetDir, actualFilename);

                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                fs.writeFileSync(targetFile, code);
                
                const relativePath = path.join(folder, actualFilename);
                const normalizedPath = relativePath.replace(/\\/g, "/");

                try {
                    if (this.loader.loadedFiles.has(normalizedPath)) await this.loader.reload(normalizedPath);
                    else await this.loader.loadFile(normalizedPath);
                } catch (loadErr) { return res.json({ status: true, msg: "Disimpan, tapi reload error." }); }
                return res.json({ status: true, msg: "Berhasil disimpan & direload!" });
            } catch (error) { return res.status(500).json({ status: false, msg: error.message }); }
        });

        this.app.post('/api/restart', (req, res) => {
            const { key } = req.body;
            if (key !== this.apiKey) return res.status(403).json({status: false, msg: "API Key Salah!"});
            res.json({status: true, msg: "Merestart..."});
            setTimeout(() => process.exit(1), 2000);
        });

        this.app.get('/api/logs', (req, res) => {
            const key = req.query.key;
            if (key !== this.apiKey) return res.status(403).end();
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            this.logClients.add(res);
            req.on('close', () => this.logClients.delete(res));
        });

        this.app.listen(this.port, () => console.log(`✅ API Server running on port ${this.port}`));
    }
}