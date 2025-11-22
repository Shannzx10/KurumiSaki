import { Logger } from "./Logger.js";

export class MemoryMonitor {
    constructor(config = {}) {
        this.threshold = config.threshold || 500;
        this.checkInterval = config.checkInterval || 60000;
        this.gcOnHigh = config.gcOnHigh || true;
        this.stats = [];
        this.maxStats = 60;
        this.isRunning = false;
        this.monitorInterval = null;
    }

    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: usage.rss / 1024 / 1024,
            heapTotal: usage.heapTotal / 1024 / 1024,
            heapUsed: usage.heapUsed / 1024 / 1024,
            external: usage.external / 1024 / 1024
        };
    }

    check() {
        const memory = this.getMemoryUsage();
        
        this.stats.push({
            timestamp: Date.now(),
            ...memory
        });

        if (this.stats.length > this.maxStats) {
            this.stats.shift();
        }

        if (memory.heapUsed > this.threshold && this.gcOnHigh) {
            Logger.logWarning(`High memory usage: ${memory.heapUsed.toFixed(2)} MB`);
            if (global.gc) {
                global.gc();
                Logger.logInfo("Garbage collection triggered");
            }
        }

        return memory;
    }

    startMonitoring() {
        if (this.isRunning) return;
        
        this.monitorInterval = setInterval(() => {
            this.check();
        }, this.checkInterval);
        
        this.isRunning = true;
        Logger.logSuccess("Memory monitoring started");
        console.log("");
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            this.isRunning = false;
        }
    }

    getStats() {
        if (this.stats.length === 0) return null;

        const latest = this.stats[this.stats.length - 1];
        const avg = {
            heapUsed: this.stats.reduce((sum, s) => sum + s.heapUsed, 0) / this.stats.length,
            rss: this.stats.reduce((sum, s) => sum + s.rss, 0) / this.stats.length
        };

        return {
            current: latest,
            average: avg,
            samples: this.stats.length
        };
    }

    formatMemory(mb) {
        return mb >= 1024 
            ? `${(mb / 1024).toFixed(2)} GB` 
            : `${mb.toFixed(2)} MB`;
    }
}