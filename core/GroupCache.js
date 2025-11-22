import { Logger } from "./Logger.js";

export class GroupCache {
    constructor(ttl = 300000) {
        this.cache = new Map();
        this.ttl = ttl;
        this.isRunning = false;
        this.cleanupInterval = null;
    }

    set(groupId, metadata) {
        this.cache.set(groupId, {
            data: metadata,
            timestamp: Date.now()
        });
    }

    get(groupId) {
        const cached = this.cache.get(groupId);
        
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        
        if (age > this.ttl) {
            this.cache.delete(groupId);
            return null;
        }
        
        return cached.data;
    }

    has(groupId) {
        return this.get(groupId) !== null;
    }

    delete(groupId) {
        return this.cache.delete(groupId);
    }

    clear() {
        this.cache.clear();
        Logger.logInfo("Group cache cleared");
    }

    size() {
        return this.cache.size;
    }

    cleanup() {
        const now = Date.now();
        let removed = 0;
        
        for (const [groupId, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(groupId);
                removed++;
            }
        }
        
        if (removed > 0) {
            Logger.logInfo(`Cleaned ${removed} expired group cache entries`);
        }
        
        return removed;
    }

    startAutoCleanup(interval = 600000) {
        if (this.isRunning) return;
        
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, interval);
        
        this.isRunning = true;
        Logger.logSuccess("Group cache auto-cleanup started");        
    }

    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            this.isRunning = false;
        }
    }
}