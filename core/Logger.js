import chalk from "chalk";

export class Logger {
    static logMessage(m) {
        if (['protocolMessage', 'senderKeyDistributionMessage'].includes(m.type)) return;
        
        const typeEmoji = {
            conversation: '💬',
            extendedTextMessage: '💬',
            imageMessage: '🖼️',
            videoMessage: '🎥',
            audioMessage: '🎵',
            documentMessage: '📄',
            stickerMessage: '🎨',
            locationMessage: '📍',
            contactMessage: '👤',
            pollCreationMessage: '📊',
            reactionMessage: '❤️'
        };
        
        const emoji = typeEmoji[m.type] || '📨';
        const sender = m.sender.split("@")[0];
        const chat = m.chat.split("@")[0];
        
        const preview = m.text 
            ? (m.text.length > 60 ? m.text.substring(0, 60) + '...' : m.text)
            : `[${m.type}]`;
            
        const timestamp = new Date().toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const chatDisplay = chat.length > 15 ? chat.substring(0, 15) + '...' : chat;
        const senderDisplay = sender.length > 12 ? sender.substring(0, 12) + '...' : sender;
        
        console.log(chalk.cyan('╭─────────────────────────────────────────────'));
        console.log(chalk.cyan('│') + ' ' + emoji + '  ' + chalk.white.bold(m.isGroup ? 'GROUP MESSAGE' : 'PRIVATE MESSAGE'));
        console.log(chalk.cyan('├─────────────────────────────────────────────'));
        console.log(chalk.cyan('│') + ' 🕐 ' + chalk.gray('Time    : ') + chalk.white(timestamp));
        console.log(chalk.cyan('│') + ' 💭 ' + chalk.gray('Chat    : ') + chalk.yellow(chatDisplay));
        console.log(chalk.cyan('│') + ' 👤 ' + chalk.gray('From    : ') + chalk.green(senderDisplay));
        console.log(chalk.cyan('│') + ' 📝 ' + chalk.gray('Message : ') + chalk.white(preview));
        console.log(chalk.cyan('╰─────────────────────────────────────────────') + '\n');
    }

    static logSuccess(message) {
        console.log(chalk.green('✅ ' + message));
    }

    static logError(message) {
        console.log(chalk.red('❌ ' + message));
    }

    static logWarning(message) {
        console.log(chalk.yellow('⛔ ' + message));
    }

    static logInfo(message) {
        console.log(chalk.cyan('🔄 ' + message));
    }
}