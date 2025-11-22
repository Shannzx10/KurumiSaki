import { toSmallCaps } from "../../utility/Font.js";
import { exec } from "child_process";

export default {
    name: "restart",
    aliases: ["reboot"],
    desc: "Restart the bot",
    usage: "restart",
    category: "owner",
    ownerOnly: true,
    
    async execute({ m, sock, config }) {
        try {
            const restartMsg = `🔄 ${toSmallCaps('restarting bot')}...\n\n`;
            const timeMsg = `⏰ ${toSmallCaps('estimated time')}: ~5-10 ${toSmallCaps('seconds')}\n`;
            const waitMsg = `⏳ ${toSmallCaps('please wait')}...`;
            
            await m.reply(restartMsg + timeMsg + waitMsg);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log(`[RESTART] Bot restart initiated by ${m.sender}`);

            if (process.env.PM2_HOME || process.env.PM_ID !== undefined) {
                exec("pm2 restart all", (error) => {
                    if (error) {
                        console.error("PM2 restart error:", error);
                        process.exit(1);
                    }
                });
            } else if (process.env.RAILWAY_ENVIRONMENT) {
                console.log("[RESTART] Railway environment detected - exiting for automatic restart");
                process.exit(0);
            } else if (process.env.HEROKU_APP_NAME) {
                console.log("[RESTART] Heroku environment detected - exiting for automatic restart");
                process.exit(0);
            } else if (process.env.REPL_ID) {
                console.log("[RESTART] Replit environment detected - exiting for automatic restart");
                process.exit(0);
            } else {
                console.log("[RESTART] Exiting process for restart...");
                process.exit(0);
            }
            
        } catch (error) {
            console.error("Restart error:", error);
            await m.reply(
                `❌ ${toSmallCaps('restart failed')}!\n\n` +
                `${toSmallCaps('error')}: ${error.message}\n\n` +
                `💡 ${toSmallCaps('try restarting manually')}`
            );
        }
    }
};