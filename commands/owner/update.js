import { toSmallCaps } from "../../utility/Font.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default {
    name: "update",
    aliases: ["upgrade", "gitpull"],
    desc: "Update bot to latest version from GitHub",
    usage: "update",
    category: "owner",
    ownerOnly: true,
    
    async execute({ m, sock, config }) {
        const loadingMsg = await m.reply(`⏳ ${toSmallCaps('checking for updates')}...`);
        
        try {
            const { stdout: branchOutput } = await execAsync("git branch --show-current");
            const currentBranch = branchOutput.trim();

            await execAsync("git fetch origin");

            const { stdout: statusOutput } = await execAsync(`git rev-list HEAD..origin/${currentBranch} --count`);
            const updateCount = parseInt(statusOutput.trim());
            
            if (updateCount === 0) {
                return await sock.sendMessage(m.chat, {
                    text: `✅ ${toSmallCaps('bot is already up to date')}!\n\n` +
                          `📌 ${toSmallCaps('branch')}: ${currentBranch}\n` +
                          `🔖 ${toSmallCaps('no new commits available')}`,
                    edit: loadingMsg.key
                });
            }

            const { stdout: logOutput } = await execAsync(
                `git log HEAD..origin/${currentBranch} --oneline --pretty=format:"%h - %s" -n 5`
            );
            
            let updateInfo = `📦 ${toSmallCaps('updates available')}: ${updateCount} ${toSmallCaps('commits')}\n\n`;
            updateInfo += `📌 ${toSmallCaps('branch')}: ${currentBranch}\n\n`;
            updateInfo += `${toSmallCaps('recent changes')}:\n`;
            updateInfo += logOutput.split('\n').map(line => `  • ${line}`).join('\n');
            updateInfo += `\n\n⏳ ${toSmallCaps('updating')}...`;
            
            await sock.sendMessage(m.chat, {
                text: updateInfo,
                edit: loadingMsg.key
            });

            try {
                await execAsync("git stash");
            } catch (e) {
                // Biarin
            }

            const { stdout: pullOutput } = await execAsync(`git pull origin ${currentBranch}`);

            if (pullOutput.includes("package.json")) {
                await sock.sendMessage(m.chat, {
                    text: updateInfo + `\n\n📦 ${toSmallCaps('installing dependencies')}...`,
                    edit: loadingMsg.key
                });
                
                await execAsync("npm install");
            }

            let successMsg = `✅ ${toSmallCaps('update successful')}!\n\n`;
            successMsg += `📌 ${toSmallCaps('branch')}: ${currentBranch}\n`;
            successMsg += `✨ ${toSmallCaps('applied')}: ${updateCount} ${toSmallCaps('commits')}\n\n`;
            successMsg += `${toSmallCaps('recent changes')}:\n`;
            successMsg += logOutput.split('\n').map(line => `  • ${line}`).join('\n');
            successMsg += `\n\n🔄 ${toSmallCaps('please restart the bot to apply changes')}`;
            
            await sock.sendMessage(m.chat, {
                text: successMsg,
                edit: loadingMsg.key
            });
            
        } catch (error) {
            console.error("Update error:", error);
            
            let errorMsg = `❌ ${toSmallCaps('update failed')}!\n\n`;
            errorMsg += `${toSmallCaps('error')}: ${error.message}\n\n`;
            
            if (error.message.includes("not a git repository")) {
                errorMsg += `💡 ${toSmallCaps('this bot is not a git repository')}\n`;
                errorMsg += `${toSmallCaps('please clone from github to use this feature')}`;
            } else if (error.message.includes("could not resolve host")) {
                errorMsg += `💡 ${toSmallCaps('no internet connection')}`;
            } else {
                errorMsg += `💡 ${toSmallCaps('try manually')}: git pull origin main`;
            }
            
            await sock.sendMessage(m.chat, {
                text: errorMsg,
                edit: loadingMsg.key
            });
        }
    }
};