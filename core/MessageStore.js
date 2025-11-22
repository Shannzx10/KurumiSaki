import fs from "fs";
import path from "path";
import { Logger } from "./Logger.js";

export class MessageStore {
    constructor(config) {
        this.config = config;
        this.store = new Map();
        this.saveCounter = 0;
        this.storePath = path.join(config.sessionDir, "messages.json");
        
        if (config.saveMessages) {
            this.load();
        }
    }

    load() {
        try {
            if (fs.existsSync(this.storePath)) {
                const data = fs.readFileSync(this.storePath, "utf8");
                const parsed = JSON.parse(data);
                this.store = new Map(Object.entries(parsed));
                Logger.logSuccess(`Loaded ${this.store.size} messages from storage`);
            }
        } catch (err) {
            Logger.logError(`Failed to load messages: ${err.message}`);
        }
    }

    save() {
        try {
            const dir = path.dirname(this.storePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const data = Object.fromEntries(this.store);
            fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2));
        } catch (err) {
            Logger.logError(`Failed to save messages: ${err.message}`);
        }
    }

    add(msgId, data) {
        if (!this.config.saveMessages) return;
        
        if (this.store.size >= this.config.maxMessages) {
            const first = this.store.keys().next().value;
            this.store.delete(first);
        }

        this.store.set(msgId, {
            ...data,
            timestamp: Date.now()
        });
        
        this.saveCounter++;

        if (this.saveCounter % this.config.autoSaveInterval === 0) {
            this.save();
        }
    }

    get(msgId) {
        return this.store.get(msgId);
    }

    flush() {
        this.save();
        Logger.logSuccess("Messages saved to disk");
    }
}