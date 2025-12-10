import Database from 'better-sqlite3';
import { proto } from '@whiskeysockets/baileys';
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';

export const useSQLiteAuthState = async (databasePath) => {
    const dbPath = databasePath.endsWith('.db') ? databasePath : `${databasePath}/sqlite.db`;
    
    const db = new Database(dbPath);
    
    db.pragma('journal_mode = WAL');
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS session (
            id TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    const readData = (id) => {
        const row = db.prepare('SELECT value FROM session WHERE id = ?').get(id);
        if (row) {
            return JSON.parse(row.value, BufferJSON.reviver);
        }
        return null;
    };

    const writeData = (id, value) => {
        db.prepare('INSERT OR REPLACE INTO session (id, value) VALUES (?, ?)').run(id, JSON.stringify(value, BufferJSON.replacer));
    };

    const removeData = (id) => {
        db.prepare('DELETE FROM session WHERE id = ?').run(id);
    };

    const creds = readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const value = readData(`${type}-${id}`);
                        if (value) {
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                writeData(key, value);
                            } else {
                                removeData(key);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: () => {
            writeData('creds', creds);
        }
    };
};