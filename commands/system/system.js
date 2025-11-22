import os from "os";
import { performance } from "perf_hooks";
import { exec } from "child_process";
import { promisify } from "util";
import { toSmallCaps } from "../../utility/Font.js";

const execPromise = promisify(exec);

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatUptime = seconds => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const getCPUUsage = () => {
    return new Promise(resolve => {
        const startUsage = process.cpuUsage();
        const startTime = performance.now();

        setTimeout(() => {
            const endUsage = process.cpuUsage(startUsage);
            const endTime = performance.now();
            const elapsedTime = endTime - startTime;

            const userPercent = (endUsage.user / 1000 / elapsedTime) * 100;
            const systemPercent = (endUsage.system / 1000 / elapsedTime) * 100;
            const totalPercent = userPercent + systemPercent;

            resolve({
                user: userPercent.toFixed(2),
                system: systemPercent.toFixed(2),
                total: totalPercent.toFixed(2)
            });
        }, 100);
    });
};

const getLoadAverage = () => {
    const loadavg = os.loadavg();
    return {
        "1min": loadavg[0].toFixed(2),
        "5min": loadavg[1].toFixed(2),
        "15min": loadavg[2].toFixed(2)
    };
};

const getNetworkStats = async () => {
    try {
        if (process.platform === "linux") {
            const { stdout } = await execPromise("cat /proc/net/dev");
            const lines = stdout.split("\n");
            let totalRx = 0;
            let totalTx = 0;

            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const parts = line.split(/\s+/);
                if (parts[0].includes(":")) {
                    totalRx += parseInt(parts[1]) || 0;
                    totalTx += parseInt(parts[9]) || 0;
                }
            }

            return {
                received: formatBytes(totalRx),
                transmitted: formatBytes(totalTx),
                total: formatBytes(totalRx + totalTx)
            };
        }
        return null;
    } catch (e) {
        return null;
    }
};

const getDiskUsage = async () => {
    try {
        if (process.platform === "linux") {
            const { stdout } = await execPromise("df -h / | tail -1");
            const parts = stdout.trim().split(/\s+/);
            return {
                total: parts[1],
                used: parts[2],
                available: parts[3],
                usedPercent: parts[4]
            };
        } else if (process.platform === "win32") {
            const { stdout } = await execPromise(
                "wmic logicaldisk get size,freespace,caption"
            );
            return { info: stdout.trim() };
        }
        return null;
    } catch (e) {
        return null;
    }
};

export default {
    name: "system",
    aliases: ["sys", "status"],
    desc: "Monitor bot system status",
    usage: "system",
    category: "owner",
    ownerOnly: true,
    
    async execute({ m, sock, config, handler, memoryMonitor, rateLimiter, queueManager, sessionCleaner }) {
        const startTime = performance.now();
        const [cpuUsage, networkStats, diskUsage] = await Promise.all([
            getCPUUsage(),
            getNetworkStats(),
            getDiskUsage()
        ]);

        const loadAvg = getLoadAverage();
        const stats = handler.getStats();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = ((usedMem / totalMem) * 100).toFixed(2);
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;
        const processMemUsage = process.memoryUsage();
        const heapUsedPercent = (
            (processMemUsage.heapUsed / processMemUsage.heapTotal) * 100
        ).toFixed(2);
        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);

        let msg = `⚡ *${toSmallCaps("Bot System Diagnostics")}* ⚡\n\n`;

        msg += `╭─ 📊 ${toSmallCaps("Performance")} ─\n`;
        msg += `│ ${toSmallCaps("response time")}: *${responseTime} ms*\n`;
        msg += `│ ${toSmallCaps("bot uptime")}: *${formatUptime(process.uptime())}*\n`;
        msg += `│ ${toSmallCaps("os uptime")}: *${formatUptime(os.uptime())}*\n`;
        msg += `│ ${toSmallCaps("messages")}: *${stats.messagesReceived}*\n`;
        msg += `│ ${toSmallCaps("commands run")}: *${stats.commandsRun}*\n`;
        msg += `╰─────────────\n\n`;

        msg += `╭─ 🧠 ${toSmallCaps("CPU")} ─\n`;
        msg += `│ *${toSmallCaps("Model")}*: ${cpuModel}\n`;
        msg += `│ *${toSmallCaps("Cores")}*: ${cpuCores}\n`;
        msg += `│ *${toSmallCaps("Load (1m)")}*: ${loadAvg["1min"]}\n`;
        msg += `│ *${toSmallCaps("Load (5m)")}*: ${loadAvg["5min"]}\n`;
        msg += `│ *${toSmallCaps("Load (15m)")}*: ${loadAvg["15min"]}\n`;
        msg += `│ *${toSmallCaps("Process Usage")}*: ${cpuUsage.total}%\n`;
        msg += `╰─────────────\n\n`;

        msg += `╭─ 🧮 ${toSmallCaps("Memory (System)")} ─\n`;
        msg += `│ *${toSmallCaps("Total")}*: ${formatBytes(totalMem)}\n`;
        msg += `│ *${toSmallCaps("Used")}*: ${formatBytes(usedMem)} (*${memPercent}%*)\n`;
        msg += `│ *${toSmallCaps("Free")}*: ${formatBytes(freeMem)}\n`;
        msg += `╰─────────────\n\n`;

        msg += `╭─ 🔬 ${toSmallCaps("Memory (Process)")} ─\n`;
        msg += `│ *${toSmallCaps("RSS")}*: ${formatBytes(processMemUsage.rss)}\n`;
        msg += `│ *${toSmallCaps("Heap Used")}*: ${formatBytes(processMemUsage.heapUsed)}\n`;
        msg += `│ *${toSmallCaps("Heap Total")}*: ${formatBytes(processMemUsage.heapTotal)}\n`;
        msg += `│ *${toSmallCaps("Heap Usage")}*: ${heapUsedPercent}%\n`;
        msg += `│ *${toSmallCaps("External")}*: ${formatBytes(processMemUsage.external)}\n`;
        msg += `╰─────────────\n\n`;

        if (memoryMonitor) {
            const memStats = memoryMonitor.getStats();
            if (memStats) {
                msg += `╭─ 📈 ${toSmallCaps("Memory Monitor")} ─\n`;
                msg += `│ *${toSmallCaps("Avg Heap")}*: ${formatBytes(memStats.average.heapUsed * 1024 * 1024)}\n`;
                msg += `│ *${toSmallCaps("Avg RSS")}*: ${formatBytes(memStats.average.rss * 1024 * 1024)}\n`;
                msg += `│ *${toSmallCaps("Samples")}*: ${memStats.samples}\n`;
                msg += `╰─────────────\n\n`;
            }
        }

        if (diskUsage && diskUsage.total) {
            msg += `╭─ 💿 ${toSmallCaps("Disk Usage")} ─\n`;
            msg += `│ *${toSmallCaps("Total")}*: ${diskUsage.total}\n`;
            msg += `│ *${toSmallCaps("Used")}*: ${diskUsage.used} (*${diskUsage.usedPercent}*)\n`;
            msg += `│ *${toSmallCaps("Available")}*: ${diskUsage.available}\n`;
            msg += `╰─────────────\n\n`;
        }

        if (networkStats) {
            msg += `╭─ 📡 ${toSmallCaps("Network Stats")} ─\n`;
            msg += `│ *${toSmallCaps("Received")}*: ${networkStats.received}\n`;
            msg += `│ *${toSmallCaps("Transmitted")}*: ${networkStats.transmitted}\n`;
            msg += `│ *${toSmallCaps("Total")}*: ${networkStats.total}\n`;
            msg += `╰─────────────\n\n`;
        }

        if (rateLimiter) {
            const rlStats = rateLimiter.getStats();
            msg += `╭─ 🚦 ${toSmallCaps("Rate Limiter")} ─\n`;
            msg += `│ *${toSmallCaps("Active Users")}*: ${rlStats.activeUsers}\n`;
            msg += `│ *${toSmallCaps("Banned Users")}*: ${rlStats.bannedUsers}\n`;
            msg += `│ *${toSmallCaps("Active Groups")}*: ${rlStats.activeGroups}\n`;
            msg += `╰─────────────\n\n`;
        }

        if (queueManager) {
            const qStats = queueManager.getStats();
            msg += `╭─ 📋 ${toSmallCaps("Queue Manager")} ─\n`;
            msg += `│ *${toSmallCaps("Total Chats")}*: ${qStats.totalChats}\n`;
            msg += `│ *${toSmallCaps("Queued Tasks")}*: ${qStats.totalQueued}\n`;
            msg += `│ *${toSmallCaps("Processing")}*: ${qStats.activeProcessing}\n`;
            msg += `╰─────────────\n\n`;
        }

        if (sessionCleaner) {
            const size = await sessionCleaner.getSessionSize();
            msg += `╭─ 📁 ${toSmallCaps("Session Info")} ─\n`;
            msg += `│ *${toSmallCaps("Size")}*: ${sessionCleaner.formatSize(size)}\n`;
            msg += `│ *${toSmallCaps("Auto-clean")}*: ${config.sessionCleaner.enabled ? "Enabled" : "Disabled"}\n`;
            msg += `╰─────────────\n\n`;
        }

        msg += `╭─ 💻 ${toSmallCaps("System Info")} ─\n`;
        msg += `│ *${toSmallCaps("Platform")}*: ${os.platform()} (${os.arch()})\n`;
        msg += `│ *${toSmallCaps("Hostname")}*: ${os.hostname()}\n`;
        msg += `│ *${toSmallCaps("Node Version")}*: ${process.version}\n`;
        msg += `│ *${toSmallCaps("PID")}*: ${process.pid}\n`;
        msg += `╰─────────────`;

        await sock.sendMessage(m.chat, {
            text: msg,
            contextInfo: {
                externalAdReply: {
                    title: 'SYSTEM STATUS',
                    body: 'complete bot system diagnostics',
                    renderLargerThumbnail: true,
                    mediaType: 1,
                    thumbnailUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKeQadew5jbQfvNfcL6Nb76xtm64YaCHCNM4KyiVB-sfYROpeMWXk02_Yc&s=10'
                }
            }
        }, { quoted: m });
    }
};