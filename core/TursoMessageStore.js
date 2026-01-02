import { createClient } from "@libsql/client";
import { Logger } from "./Logger.js";

export class TursoMessageStore {
    constructor(config) {
        this.config = config;
        this.client = createClient({
            url: config.turso.url,
            authToken: config.turso.authToken,
        });
        
        this.init();
    }

    async init() {
        try {
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    remoteJid TEXT,
                    sender TEXT,
                    text TEXT,
                    timestamp INTEGER,
                    fullJson TEXT
                );
            `);
            await this.client.execute("CREATE INDEX IF NOT EXISTS idx_remoteJid ON messages(remoteJid)");
            await this.client.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp)");
        } catch (err) {
            Logger.logError(`Failed to init Turso Store: ${err.message}`);
        }
    }

    async add(msgId, data) {
        if (!this.config.saveMessages) return;

        try {
            await this.client.execute({
                sql: `INSERT INTO messages (id, remoteJid, sender, text, timestamp, fullJson)
                      VALUES (?, ?, ?, ?, ?, ?) 
                      ON CONFLICT(id) DO NOTHING`,
                args: [
                    msgId,
                    data.chat,
                    data.from,
                    data.text,
                    Date.now(),
                    JSON.stringify(data)
                ]
            });

            if (Math.random() < 0.01) { 
                this.cleanup();
            }

        } catch (err) {
            Logger.logError(`Failed to save message to Turso: ${err.message}`);
        }
    }

    async get(msgId) {
        try {
            const result = await this.client.execute({
                sql: 'SELECT * FROM messages WHERE id = ?',
                args: [msgId]
            });
            
            if (result.rows.length === 0) return null;
            const row = result.rows[0];

            return {
                ...JSON.parse(row.fullJson),
                timestamp: row.timestamp
            };
        } catch (err) {
            Logger.logError(`Failed to fetch message: ${err.message}`);
            return null;
        }
    }

    async getRecent(chatId, limit = 10) {
        try {
            const result = await this.client.execute({
                sql: `SELECT fullJson FROM messages 
                      WHERE remoteJid = ? 
                      ORDER BY timestamp DESC 
                      LIMIT ?`,
                args: [chatId, limit]
            });
            
            return result.rows.map(r => JSON.parse(r.fullJson));
        } catch (err) {
            Logger.logError(`Failed to fetch recent messages: ${err.message}`);
            return [];
        }
    }

    async cleanup() {
        const max = this.config.maxMessages || 5000;
        try {
            await this.client.execute({
                sql: `DELETE FROM messages WHERE id NOT IN (
                        SELECT id FROM messages ORDER BY timestamp DESC LIMIT ?
                      )`,
                args: [max]
            });
        } catch (err) {
             Logger.logError(`Cleanup failed: ${err.message}`);
        }
    }

    flush() { }
}