import { GoogleGenAI } from "@google/genai";
import { toSmallCaps } from "../../utility/Font.js";
import config from "../../config.js";
import fs from 'fs/promises';
import path from 'path';

const ai = new GoogleGenAI({
    apiKey: config.geminiApikey || "APIKEY_GEMINI"
});

const userSessions = new Map();
const sessionConfig = new Map();

export default {
    name: "kurumi",
    aliases: ["ai", "gpt", "ask"],
    desc: "AI Assistant yang tau semua isi project + punya memory!",
    usage: "kurumi <pertanyaan>\nkurumi --status (cek session)\nkurumi --use-session (aktifkan)\nkurumi --use-no-session (matikan)\nkurumi --clear (hapus history)\nkurumi --ask <pertanyaan> (bertanya)",
    category: "owner",
    ownerOnly: true,
    cooldown: 10,
    
    async execute({ m, args }) {
        const userId = m.sender;

        if (!sessionConfig.has(userId)) {
            sessionConfig.set(userId, { enabled: false });
        }

        if (args.length === 0) {
            return await m.reply(
                `🤖 ${toSmallCaps('kurumi ai assistant')}\n\n` +
                `${toSmallCaps('usage')}:\n` +
                `• .kurumi <pertanyaan> - Tanya langsung\n` +
                `• .kurumi --status - Cek config session\n` +
                `• .kurumi --use-session - Aktifkan memory\n` +
                `• .kurumi --use-no-session - Matikan memory\n` +
                `• .kurumi --clear - Hapus history chat\n` +
                `• .kurumi --ask <tanya> - Bertanya (auto detect session)\n\n` +
                `💡 Kurumi bakal auto baca file yang relevan!`
            );
        }

        const command = args[0];

        if (command === '--status') {
            const config = sessionConfig.get(userId);
            const session = userSessions.get(userId);
            const historyCount = session ? session.length : 0;
            
            let msg = `╭─── ${toSmallCaps('session status')} ───\n`;
            msg += `│\n`;
            msg += `│ 🔧 ${toSmallCaps('session')}: ${config.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n`;
            msg += `│ 💬 ${toSmallCaps('history')}: ${historyCount} pesan\n`;
            msg += `│ 🧠 ${toSmallCaps('memory')}: ${config.enabled ? 'ON - Kurumi inget percakapan' : 'OFF - Setiap pertanyaan fresh'}\n`;
            msg += `│\n`;
            msg += `╰───────────────────`;
            
            return await m.reply(msg);
        }

        if (command === '--use-session') {
            sessionConfig.set(userId, { enabled: true });
            return await m.reply(
                `✅ ${toSmallCaps('session aktif!')}\n\n` +
                `Sekarang Kurumi bakal inget percakapan lo. ` +
                `Bisa diskusi bolak-balik kayak chat biasa! 🧠`
            );
        }

        if (command === '--use-no-session') {
            sessionConfig.set(userId, { enabled: false });
            return await m.reply(
                `❌ ${toSmallCaps('session nonaktif!')}\n\n` +
                `Kurumi sekarang fresh setiap pertanyaan. ` +
                `History gak bakal dipake lagi.`
            );
        }

        if (command === '--clear') {
            userSessions.delete(userId);
            return await m.reply(
                `🗑️ ${toSmallCaps('history cleared!')}\n\n` +
                `Semua percakapan sebelumnya udah dihapus. ` +
                `Mulai dari awal lagi!`
            );
        }

        let question;
        if (command === '--ask') {
            question = args.slice(1).join(" ");
            if (!question) {
                return await m.reply("❌ Pertanyaannya mana bro?\nContoh: .kurumi --ask dimana m.reply dibuat?");
            }
        } else {
            question = args.join(" ");
        }

        await m.react("🔍");
        
        try {
            const structure = await getProjectStructure();
            await m.react("📖");
            const relevantFiles = await findRelevantFiles(question, structure);
            await m.react("🧠");
            const fileContents = await readFiles(relevantFiles);
            await m.react("⚡");

            const config = sessionConfig.get(userId);
            const useSession = config.enabled;
            
            const response = await askGeminiWithContext(
                question, 
                fileContents, 
                structure, 
                userId, 
                useSession
            );
            
            await m.react("✅");

            if (response.length > 4000) {
                const chunks = splitMessage(response, 4000);
                for (const chunk of chunks) {
                    await m.reply(chunk);
                }
            } else {
                await m.reply(response);
            }

        } catch (error) {
            await m.react("❌");
            await m.reply(`❌ ${toSmallCaps('error')}: ${error.message}`);
            console.error("Kurumi Error:", error);
        }
    }
};

function splitMessage(text, maxLength) {
    const chunks = [];
    let current = '';
    const lines = text.split('\n');
    
    for (const line of lines) {
        if ((current + line + '\n').length > maxLength) {
            if (current) chunks.push(current.trim());
            current = line + '\n';
        } else {
            current += line + '\n';
        }
    }
    
    if (current) chunks.push(current.trim());
    return chunks;
}

async function getProjectStructure() {
    const projectPath = process.cwd();
    const fileList = [];

    async function scanDir(currentPath, relativePath = '') {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (['node_modules', '.git', 'sessions', 'package-lock.json'].includes(entry.name)) {
                    continue;
                }
                
                const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
                
                if (entry.isDirectory()) {
                    await scanDir(path.join(currentPath, entry.name), relPath);
                } else if (entry.name.endsWith('.js')) {
                    fileList.push(relPath);
                }
            }
        } catch (err) {
            console.error(`Error scanning ${currentPath}:`, err.message);
        }
    }

    await scanDir(projectPath);
    return fileList;
}

async function findRelevantFiles(question, allFiles) {
    const prompt = `
Kamu adalah analyzer untuk WhatsApp bot project, Analisis dengan benar dan pelan-pelan, Pilih file yang benar-benar relevan.

SEMUA FILE DI PROJECT:
${allFiles.map(f => `- ${f}`).join('\n')}

PERTANYAAN USER:
${question}

TASK: Tentukan file mana yang PALING RELEVAN untuk jawab pertanyaan ini.

RULES:
1. Jika pertanyaan tentang "m.reply", "m.react", "serialize" → Wajib include core/Serializer.js
2. Jika tentang "command", "plugin", "execute" → Include core/CommandHandler.js
3. Jika tentang "connection", "reconnect", "socket" → Include core/Connection.js
4. Jika tentang "middleware" atau mention file _xxx.js → Include file middleware yang dimaksud
5. Jika minta "buatkan middleware" → Include semua file commands/_*.js sebagai referensi
6. Jika minta "buatkan plugin" → Include 5-10 contoh plugin dari commands/<category>/
7. Jika pertanyaan umum → Include index.js, CommandHandler.js, Connection.js
8. MAKSIMAL 15 file, prioritaskan yang paling relevan

Jawab HANYA dengan JSON array string:
["file1.js", "file2.js", "file3.js"]

TIDAK BOLEH ada text lain, ingat HANYA JSON array tidak ada yang lain!
`;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
    });

    let responseText = result.text.trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
        const files = JSON.parse(responseText);
        const validFiles = [];
        for (const file of files) {
            if (allFiles.includes(file)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            return [
                'index.js',
                'core/CommandHandler.js',
                'core/Connection.js',
                'core/Serializer.js'
            ].filter(f => allFiles.includes(f));
        }
        
        return validFiles;
    } catch (err) {
        console.error("Error parsing JSON:", responseText);
        return [
            'index.js',
            'core/CommandHandler.js',
            'core/Connection.js',
            'core/Serializer.js'
        ].filter(f => allFiles.includes(f));
    }
}

async function readFiles(filePaths) {
    const projectPath = process.cwd();
    const contents = [];

    for (const filePath of filePaths) {
        try {
            const fullPath = path.join(projectPath, filePath);
            const content = await fs.readFile(fullPath, 'utf-8');
            contents.push({
                path: filePath,
                content: content
            });
        } catch (err) {
            console.error(`Error reading ${filePath}:`, err.message);
        }
    }

    return contents;
}

async function askGeminiWithContext(question, fileContents, allFiles, userId, useSession) {
    let context = '=== PROJECT FILES ===\n\n';
    
    for (const file of fileContents) {
        context += `--- ${file.path} ---\n${file.content}\n\n`;
    }

    let conversationHistory = [];
    
    if (useSession) {
        if (!userSessions.has(userId)) {
            userSessions.set(userId, []);
        }
        
        const session = userSessions.get(userId);
        const recentHistory = session.slice(-5);

        for (const chat of recentHistory) {
            conversationHistory.push({
                role: 'user',
                parts: [{ text: chat.question }]
            });
            conversationHistory.push({
                role: 'model',
                parts: [{ text: chat.answer }]
            });
        }
    }

    const systemPrompt = `
Lo adalah Kurumi, AI assistant expert WhatsApp bot berbasis Baileys dengan PERSONALITY SANTAI & ASIK.

STYLE JAWABAN:
- Pakai bahasa gaul (gw, lo, cuy, bro, gass, cuuss, nih)
- Langsung to the point, gak bertele-tele
- Code dulu, penjelasan minimal (kecuali diminta detail)
- Jawab seolah ngobrol sama temen developer
- Emoji secukupnya aja

CONTOH STYLE:
❌ "Baik, saya akan membantu Anda..."
✅ "GASS! Gw bikinin..."

❌ "Berdasarkan analisis mendalam terhadap..."
✅ "Nih cek, di Serializer.js line 45..."

❌ "Silakan simpan code berikut..."
✅ "Simpen code ini di..."

STRUKTUR PROJECT:
${allFiles.map(f => `- ${f}`).join('\n')}

FILE YANG UDAH GW BACA (INI REFERENSI LO):
${context}

RULES PENTING:
1. Jawab based on CODE ASLI yang gw kasih di atas
2. Kalo ditanya "dimana X?" → Kasih tau file & baris code-nya
3. Kalo disuruh "buatkan X" → Generate code PERSIS kayak contoh yang ada
4. Kalo ada error → Analisis dari code yang ada, jangan nebak ga jelas
5. SELALU pake referensi code asli, JANGAN asal jawab
6. Kalo kasih code, pake \`\`\`javascript
7. Simpel, ringkas, akurat dan, ga basa basi (to-the-point)

STRUKTUR CODE:
- Middleware (commands/_xxx.js): export default async function({ m, sock }) { ... return true/false }
- Plugin (commands/category/xxx.js): export default { name, execute, category, ... }
- Text formatting: pake toSmallCaps() dari utility/Font.js

${useSession ? '💬 SESSION AKTIF: Lo bisa refer ke percakapan sebelumnya. Kalo user bilang "itu tadi", "yang barusan", dll, lo tau maksudnya apa.' : ''}

JAWAB SEKARANG dengan style SANTAI tapi AKURAT!
`;

    const contents = [
        {
            role: 'user',
            parts: [{ text: systemPrompt }]
        },
        ...conversationHistory,
        {
            role: 'user',
            parts: [{ text: question }]
        }
    ];

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contents
    });

    const answer = result.text;

    if (useSession) {
        const session = userSessions.get(userId);
        session.push({
            question: question,
            answer: answer,
            timestamp: Date.now()
        });

        if (session.length > 20) {
            session.shift();
        }
    }

    return answer;
}