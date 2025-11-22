import { Logger } from "./Logger.js";

export class RateLimiter {
    constructor(config) {
        this.config = config;
        this.userRequests = new Map();
        this.bannedUsers = new Map();
        this.groupRequests = new Map();
    }

    isUserBanned(userId) {
        if (!this.bannedUsers.has(userId)) return false;
        
        const bannedUntil = this.bannedUsers.get(userId);
        if (Date.now() >= bannedUntil) {
            this.bannedUsers.delete(userId);
            return false;
        }
        return true;
    }

    checkUserLimit(userId, limits = { maxPerMinute: 10, maxPerHour: 100 }) {
        const now = Date.now();
        
        if (!this.userRequests.has(userId)) {
            this.userRequests.set(userId, []);
        }

        const requests = this.userRequests.get(userId);
        
        const recentMinute = requests.filter(time => now - time < 60000);
        const recentHour = requests.filter(time => now - time < 3600000);

        if (recentMinute.length >= limits.maxPerMinute) {
            this.banUser(userId, 300000);
            return { allowed: false, reason: "per-minute limit" };
        }

        if (recentHour.length >= limits.maxPerHour) {
            this.banUser(userId, 600000);
            return { allowed: false, reason: "per-hour limit" };
        }

        requests.push(now);
        this.userRequests.set(userId, requests.filter(time => now - time < 3600000));

        return { allowed: true };
    }

    checkGroupLimit(groupId, limits = { maxPerMinute: 30 }) {
        const now = Date.now();
        
        if (!this.groupRequests.has(groupId)) {
            this.groupRequests.set(groupId, []);
        }

        const requests = this.groupRequests.get(groupId);
        const recentMinute = requests.filter(time => now - time < 60000);

        if (recentMinute.length >= limits.maxPerMinute) {
            return { allowed: false, reason: "group limit exceeded" };
        }

        requests.push(now);
        this.groupRequests.set(groupId, requests.filter(time => now - time < 60000));

        return { allowed: true };
    }

    banUser(userId, duration) {
        const bannedUntil = Date.now() + duration;
        this.bannedUsers.set(userId, bannedUntil);
        Logger.logWarning(`User banned: ${userId.split("@")[0]} for ${duration / 1000}s`);
    }

    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, bannedUntil] of this.bannedUsers.entries()) {
            if (now >= bannedUntil) {
                this.bannedUsers.delete(userId);
                cleaned++;
            }
        }

        for (const [userId, requests] of this.userRequests.entries()) {
            const filtered = requests.filter(time => now - time < 3600000);
            if (filtered.length === 0) {
                this.userRequests.delete(userId);
            } else {
                this.userRequests.set(userId, filtered);
            }
        }

        return cleaned;
    }

    getStats() {
        return {
            activeUsers: this.userRequests.size,
            bannedUsers: this.bannedUsers.size,
            activeGroups: this.groupRequests.size
        };
    }
}