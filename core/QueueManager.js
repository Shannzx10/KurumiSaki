import { Logger } from "./Logger.js";

export class QueueManager {
    constructor(config = {}) {
        this.queues = new Map();
        this.processing = new Map();
        this.maxConcurrent = config.maxConcurrent || 5;
        this.maxQueueSize = config.maxQueueSize || 100;
        this.timeout = config.timeout || 30000;
    }

    add(chatId, task, priority = false) {
        if (!this.queues.has(chatId)) {
            this.queues.set(chatId, []);
        }

        const queue = this.queues.get(chatId);

        if (queue.length >= this.maxQueueSize) {
            Logger.logWarning(`Queue full for ${chatId}`);
            return false;
        }

        const item = {
            task,
            addedAt: Date.now(),
            priority
        };

        // Priority task di depan
        if (priority) {
            queue.unshift(item);
        } else {
            queue.push(item);
        }

        this.process(chatId);
        return true;
    }

    async process(chatId) {
        if (this.processing.get(chatId)) return;

        const queue = this.queues.get(chatId);
        if (!queue || queue.length === 0) return;

        this.processing.set(chatId, true);

        while (queue.length > 0) {
            const item = queue.shift();
            
            try {
                // Tambah timeout protection
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Task timeout")), this.timeout)
                );

                await Promise.race([
                    item.task(),
                    timeoutPromise
                ]);
            } catch (err) {
                if (err.message === "Task timeout") {
                    Logger.logError(`Task timeout in queue: ${chatId}`);
                } else {
                    Logger.logError(`Queue task failed: ${err.message}`);
                }
            }

            // Delay antar task untuk hindari blocking
            if (queue.length > 0) {
                await this.delay(300);
            }
        }

        this.processing.set(chatId, false);
        
        // Cleanup queue kosong
        if (queue.length === 0) {
            this.queues.delete(chatId);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getSize(chatId) {
        const queue = this.queues.get(chatId);
        return queue ? queue.length : 0;
    }

    clear(chatId) {
        if (chatId) {
            this.queues.delete(chatId);
            this.processing.delete(chatId);
            return true;
        }
        
        this.queues.clear();
        this.processing.clear();
        return true;
    }

    getStats() {
        let totalQueued = 0;
        let activeProcessing = 0;

        for (const queue of this.queues.values()) {
            totalQueued += queue.length;
        }

        for (const isProcessing of this.processing.values()) {
            if (isProcessing) activeProcessing++;
        }

        return {
            totalChats: this.queues.size,
            totalQueued,
            activeProcessing
        };
    }
}