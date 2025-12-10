import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { Logger } from "./Logger.js";

export class MessageStore {
    constructor(config) {
        this.config = config;
        this.databaseDir = config.databaseDir || "database";
        if (!fs.existsSync(this.databaseDir)) {
            fs.mkdirSync(this.databaseDir, { recursive: true });
        }
        const dbPath = path.join(this.databaseDir, "sqlite.db");
        this.db = new Database(dbPath);
        
        this.db.pragma('journal_mode = WAL');

        this.init();
    }

    init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                remoteJid TEXT,
                sender TEXT,
                text TEXT,
                timestamp INTEGER,
                fullJson TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_remoteJid ON messages(remoteJid);
            CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);
        `);
    }

    add(msgId, data) {
        if (!this.config.saveMessages) return;

        try {
            const stmt = this.db.prepare(`
                INSERT OR IGNORE INTO messages (id, remoteJid, sender, text, timestamp, fullJson)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                msgId,
                data.chat,
                data.from,
                data.text,
                Date.now(),
                JSON.stringify(data)
            );

            if (Math.random() < 0.01) { 
                this.cleanup();
            }

        } catch (err) {
            Logger.logError(`Failed to save message to DB: ${err.message}`);
        }
    }

    get(msgId) {
        try {
            const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
            if (!row) return null;

            return {
                ...JSON.parse(row.fullJson),
                timestamp: row.timestamp
            };
        } catch (err) {
            Logger.logError(`Failed to fetch message: ${err.message}`);
            return null;
        }
    }

    getRecent(chatId, limit = 10) {
        try {
            const rows = this.db.prepare(`
                SELECT fullJson FROM messages 
                WHERE remoteJid = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `).all(chatId, limit);
            
            return rows.map(r => JSON.parse(r.fullJson));
        } catch (err) {
            return [];
        }
    }

    cleanup() {
        const max = this.config.maxMessages || 5000; 
        this.db.prepare(`
            DELETE FROM messages WHERE id NOT IN (
                SELECT id FROM messages ORDER BY timestamp DESC LIMIT ?
            )
        `).run(max);
    }

    flush() {
        // Biarin
    }
}