import { createClient } from "@libsql/client";
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';

export const useTursoAuthState = async (config) => {
    const client = createClient({
        url: config.turso.url,
        authToken: config.turso.authToken,
    });

    await client.execute(`
        CREATE TABLE IF NOT EXISTS session (
            id TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    const readData = async (id) => {
        try {
            const result = await client.execute({
                sql: 'SELECT value FROM session WHERE id = ?',
                args: [id]
            });

            if (result.rows.length > 0) {
                return JSON.parse(result.rows[0].value, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            console.error('Error reading auth data:', error);
            return null;
        }
    };

    const writeData = async (id, value) => {
        try {
            await client.execute({
                sql: 'INSERT INTO session (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value',
                args: [id, JSON.stringify(value, BufferJSON.replacer)]
            });
        } catch (error) {
            console.error('Error writing auth data:', error);
        }
    };

    const removeData = async (id) => {
        try {
            await client.execute({
                sql: 'DELETE FROM session WHERE id = ?',
                args: [id]
            });
        } catch (error) {
            console.error('Error removing auth data:', error);
        }
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const value = await readData(`${type}-${id}`);
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
                                tasks.push(writeData(key, value));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            await writeData('creds', creds);
        }
    };
};