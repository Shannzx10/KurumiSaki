import fs from "fs";
import path from "path";
import { Logger } from "./Logger.js";

export class SessionCleaner {
    constructor(sessionDir) {
        this.sessionDir = sessionDir;
        this.keepFiles = [
            "creds.json",
            "messages.json"
        ];
        this.keepPatterns = [
            /^app-state-sync-key-.*\.json$/,
            /^pre-key-.*\.json$/,
            /^sender-key-.*\.json$/
        ];
    }

    shouldKeep(filename) {
        if (this.keepFiles.includes(filename)) return true;
        return this.keepPatterns.some(pattern => pattern.test(filename));
    }

    async clean() {
        try {
            if (!fs.existsSync(this.sessionDir)) return 0;

            const files = fs.readdirSync(this.sessionDir);
            let removed = 0;

            for (const file of files) {
                const filePath = path.join(this.sessionDir, file);
                const stat = fs.statSync(filePath);

                if (stat.isFile() && !this.shouldKeep(file)) {
                    fs.unlinkSync(filePath);
                    removed++;
                }
            }

            if (removed > 0) {
                Logger.logSuccess(`Session cleaned: ${removed} files removed`);
            }

            return removed;
        } catch (err) {
            Logger.logError(`Session cleanup failed: ${err.message}`);
            return 0;
        }
    }

    startAutoClean(intervalMs = 3600000) {
        setInterval(() => {
            this.clean();
        }, intervalMs);
        
        Logger.logSuccess("Auto session cleanup started");
    }

    async getSessionSize() {
        try {
            if (!fs.existsSync(this.sessionDir)) return 0;

            const files = fs.readdirSync(this.sessionDir);
            let totalSize = 0;

            for (const file of files) {
                const filePath = path.join(this.sessionDir, file);
                const stat = fs.statSync(filePath);
                if (stat.isFile()) totalSize += stat.size;
            }

            return totalSize;
        } catch (err) {
            return 0;
        }
    }

    formatSize(bytes) {
        const sizes = ["B", "KB", "MB", "GB"];
        if (bytes === 0) return "0 B";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
}