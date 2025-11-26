export default {
    botName: "KurumiSaki",
    version: "1.0.2",
    owner: "Shannz",
    sessionDir: "session",
    owners: ["6288991677437"],
    prefix: ["!", ".", "/"],
    caseSensitive: false,
    geminiApikey: "GEMINI_APIKEY",
    mode: "public",
    
    middlewares: {
        antilink: true,
        antitoxic: false
    },
    
    antiSpam: {
        enabled: true,
        maxPerMinute: 10,
        banTime: 300000
    },
    
    cooldown: 3000,
    saveMessages: true,
    maxMessages: 2000,
    autoSaveInterval: 25,
    
    groupCache: {
        enabled: true,
        ttl: 300000,
        autoCleanup: true,
        cleanupInterval: 600000
    },
    sessionCleaner: {
        enabled: true,
        autoCleanInterval: 3600000
    },
    
    rateLimiter: {
        enabled: false,
        userLimits: {
            maxPerMinute: 10,
            maxPerHour: 100
        },
        groupLimits: {
            maxPerMinute: 30
        }
    },
    
    memoryMonitor: {
        enabled: true,
        threshold: 500,
        checkInterval: 60000,
        gcOnHigh: true
    },
    
    queueManager: {
        enabled: true,
        maxConcurrent: 5,
        maxQueueSize: 100,
        timeout: 30000
    }
};