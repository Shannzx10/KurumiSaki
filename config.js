import dotenv from 'dotenv';
dotenv.config();

export default {
    botName: "KurumiSaki",
    version: "1.0.4",
    owner: "Shannz",
    owners: ["6288991677437"],
    pairingNumber: "",
    
    port: process.env.PORT,
    secretKey: process.env.SECRET_KEY,

    databaseDir: "database",
    prefix: ["@"],
    caseSensitive: false,
    
    geminiApikey: process.env.GEMINI_APIKEY,
    mode: "public",

    turso: {
        enabled: true,
        url: process.env.TURSO_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    },

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