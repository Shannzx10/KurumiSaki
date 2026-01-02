import config from "./config.js";
import { CommandHandler } from "./core/CommandHandler.js";
import { MessageStore } from "./core/MessageStore.js";
import { TursoMessageStore } from "./core/TursoMessageStore.js";
import { ModuleLoader } from "./core/ModuleLoader.js";
import { Connection } from "./core/Connection.js";
import { ApiServer } from "./core/ApiServer.js";
import chalk from "chalk";

console.clear();

const g1 = "#FF6B6B";
const g2 = "#4ECDC4";
const g3 = "#45B7D1";
const g4 = "#96CEB4";

console.log("");
console.log(chalk.hex(g1)("    ██╗  ██╗██╗   ██╗██████╗ ██╗   ██╗███╗   ███╗██╗"));
console.log(chalk.hex(g1)("    ██║ ██╔╝██║   ██║██╔══██╗██║   ██║████╗ ████║██║"));
console.log(chalk.hex(g2)("    █████╔╝ ██║   ██║██████╔╝██║   ██║██╔████╔██║██║"));
console.log(chalk.hex(g3)("    ██╔═██╗ ██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║██║"));
console.log(chalk.hex(g4)("    ██║  ██╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║██║"));
console.log(chalk.hex(g4)("    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝"));
console.log("");
console.log(chalk.hex(g2)("    " + "━".repeat(51)));
console.log(chalk.white.bold(`      🚀 ${config.botName} `) + chalk.gray(`v${config.version}`));
console.log(chalk.gray(`      👨‍💻 Developer: ${config.owner}`));
console.log(chalk.hex(g2)("    " + "━".repeat(51)));
console.log("");
console.log(chalk.hex("#FFD93D")("    ● ") + chalk.hex("#6BCF7F")("● ") + chalk.hex("#FF6B9D")("● ") + chalk.white.bold(" Status"));
console.log("");
console.log(chalk.cyan("      🔧 Mode       : ") + chalk.hex("#96CEB4").bold(config.mode));
console.log(chalk.cyan("      🔑 Prefix     : ") + chalk.hex("#FFB6B9").bold(config.prefix.join(", ")));
console.log(chalk.cyan("      ⚡ Anti-Spam  : ") + chalk.hex(config.antiSpam.enabled ? "#6BCF7F" : "#FF6B6B").bold(config.antiSpam.enabled ? "Enabled" : "Disabled"));
console.log(chalk.cyan("      ☁️  Cloud DB   : ") + chalk.hex(config.turso?.enabled ? "#6BCF7F" : "#FF6B6B").bold(config.turso?.enabled ? "Turso Active" : "Local SQLite"));
console.log("");
console.log(chalk.hex(g2)("    " + "━".repeat(51)));
console.log(chalk.hex("#FFD93D")("    ⚙️  Initializing components..."));
console.log(chalk.hex(g2)("    " + "━".repeat(51)));
console.log("");

const handler = new CommandHandler();

const store = config.turso?.enabled 
    ? new TursoMessageStore(config) 
    : new MessageStore(config);

const loader = new ModuleLoader(handler, config);
const api = new ApiServer(loader, config);
api.start();
const connection = new Connection(config, handler, loader, store);

connection.start().catch(err => {
    console.error(chalk.red("💥 Fatal Error:"), err);
    process.exit(1);
});