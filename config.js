export default {
    botName: "KurumiSaki V1.0.3",
    version: "1.0.2",
    owner: "Shannz",
    databaseDir: "database",
    owners: ["6288991677437"],
    prefix: ["!"],
    port: 10019,
    secretKey: 'testing',
    caseSensitive: false,
    geminiApikey: "AIzaSyCu2GgaOgMq0cAwfu3IFa7fD4SuF2Ujj8M",
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