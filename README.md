### KurumiSaki - WhatsApp Bot

<div align="center">

![KurumiSaki Banner](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLIpP8a2eFxRSnGn5_DYlRRYCX1BMaYmzkTTltSpuEfnONrEO9dC5jPUs&s=10)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-production--ready-success.svg)

**Production-ready WhatsApp bot dengan fitur lengkap untuk handle banyak user secara bersamaan**

[Features](#-features) • [Installation](#-installation) • [Configuration](#%EF%B8%8F-configuration) • [Commands](#-commands) • [Architecture](#-architecture)

</div>

---

## 📝 Changelog

### [1.0.2] - 2024-11-26

#### 🚀 Core Features
- Penyesuaian di `ModuleLoader.js`
- Add `middlewares` object di config.js
- Add `Button.js` utility
- Fix cek owner & @lid di `Serializer.js`
- Add module `axios`

#### 🔧 Commands Update
- `menu` - Button implementation
- `ytdl` - Button implementation
- `yts` - Button implementation
- `tourl` - Button implementation

#### 🛠️ Add Commands
- `spodl` - Spotify downloader
- `setmw` - Middleware management


### ℹ️ Note 
`Button.js adalah logika helper button, dibutuhkan karena baileys sendiri sudah tidak support, Untuk testing nya saya pakai wa bisnis aman dan sukses 100%`

## Supported Button Types (Native Flow Names)

| Name | Purpose | buttonParamsJson (required keys) |
|------|---------|----------------------------------|
| `quick_reply` | Simple reply that sends its `id` back | `{ display_text, id }` |
| `single_select` | In‑button picker list | `{ title, sections:[{ title?, rows:[{ id, title, description?, header? }] }] }` |
| `cta_url` | Open URL | `{ display_text, url, merchant_url? }` |
| `cta_copy` | Copy text to clipboard | `{ display_text, copy_code }` |
| `cta_call` | Tap to dial | `{ display_text, phone_number }` |
| `cta_catalog` | Open business catalog | `{ display_text? }` (WA may ignore extra keys) |
| `send_location` | Request user location (special flow) | `{ display_text? }` |
| `review_and_pay` | Order / payment summary (special) | Payment structured payload (server‑validated) |
| `payment_info` | Payment info flow | Payment structured payload |
| `mpm` | Multi product message (catalog) | Vendor internal structure |
| `wa_payment_transaction_details` | Show transaction | Transaction reference keys |
| `automated_greeting_message_view_catalog` | Greeting -> catalog | (Minimal / internal) |

---

## ✨ Features

### 🔥 Core Features
- ⚡ **Multi-prefix Support** - Gunakan `!`, `.`, atau `/` sebagai prefix
- 🔐 **Role-based Access Control** - Owner, Admin, dan User permissions
- 🛡️ **Anti-Spam System** - Rate limiting dan auto-ban untuk spam users
- 📦 **Message Store** - Simpan dan kelola history pesan
- 🗂️ **Group Cache** - Cache metadata group untuk performa optimal
- 🔄 **Auto Reconnect** - Otomatis reconnect saat koneksi putus

### 🚀 Advanced Features
- 🧹 **Session Cleaner** - Auto cleanup session files yang tidak penting
- 🚦 **Rate Limiter** - Advanced rate limiting per user dan group
- 💾 **Memory Monitor** - Real-time memory monitoring dengan auto GC
- 📋 **Queue Manager** - Message queue system untuk handle concurrent users
- 📊 **System Monitoring** - Monitor bot health dan performance
- 🔄 **Hot Reload** - Reload plugins tanpa restart bot
- 🔒 **Plugin Validator** - Auto validate plugin sebelum install

### 🛠️ Developer Features
- 📝 **Plugin System** - Modular command system dengan hot-reload
- 🔧 **Middleware Support** - Custom middleware untuk setiap command
- 🎯 **Command Handler** - Advanced command handler dengan cooldown
- 🐛 **Debug Mode** - Eval dan Exec untuk debugging (owner only)
- 📚 **TypeScript-like Structure** - Clean dan maintainable code structure

---

## 📋 Requirements

- **Node.js** >= 22.0.0
- **npm** atau **yarn**
- **WhatsApp Account** untuk bot
- **RAM** minimal 512MB (recommended 1GB+)

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/Shannzx10/KurumiSaki.git
cd kurumisaki-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

Edit `config.js` sesuai kebutuhan:

```javascript
export default {
    botName: "KurumiSaki",
    owners: ["6282142770930"], // Ganti dengan nomor kamu
    prefix: ["!", ".", "/"],
    mode: "public", // public | private | self
    // ... konfigurasi lainnya
};
```

### 4. Run Bot

```bash
# Normal mode
npm start

# Stable mode (recommended) - dengan auto-restart dan error handling
npm run stable
```

### 5. Pairing Code

Saat pertama kali run, bot akan meminta nomor WhatsApp:
```
📱 Enter WhatsApp number (e.g. 628xxx): 628123456789
✅ Code: XXXX-XXXX
```

Masukkan kode pairing ke WhatsApp kamu.

---

## ⚙️ Configuration

### Basic Config

```javascript
{
    botName: "KurumiSaki",           // Nama bot
    version: "2.0.0",                // Versi
    owner: "Shannz",                 // Owner name
    owners: ["6282142770930"],       // Owner numbers
    prefix: ["!", ".", "/"],         // Prefix commands
    mode: "public",                  // Bot mode
    cooldown: 3000,                  // Global cooldown (ms)
}
```

### Anti-Spam Config

```javascript
antiSpam: {
    enabled: true,                   // Enable/disable anti-spam
    maxPerMinute: 10,               // Max commands per minute
    banTime: 300000                 // Ban duration (ms)
}
```

### Group Cache Config

```javascript
groupCache: {
    enabled: true,                   // Enable/disable cache
    ttl: 300000,                    // Cache lifetime (5 menit)
    autoCleanup: true,              // Auto cleanup expired cache
    cleanupInterval: 600000         // Cleanup interval (10 menit)
}
```

---

## 📖 Commands

#### 1. Update Bot
```bash
!update
```
Update bot ke versi terbaru dari GitHub. Bot akan otomatis pull perubahan terbaru dan install dependencies jika diperlukan.

**Features:**
- ✅ Auto check updates
- ✅ Show commit history
- ✅ Auto install dependencies
- ✅ Stash local changes

---

#### 2. Add Plugin
```bash
!addplugin <category>
```
Tambah plugin baru dengan reply/send file `.js`. Bot akan otomatis validasi isi file untuk memastikan itu adalah plugin yang valid.

**Features:**
- ✅ Auto detect plugin structure
- ✅ Validate before install
- ✅ Prevent bot corruption
- ✅ Support categories

**Example:**
```bash
# Reply file plugin.js dengan:
!addplugin general

# Atau kirim file dengan caption:
!addplugin tools
```

> ⚠️ **Security**: Bot akan menolak file yang bukan plugin valid untuk mencegah kerusakan!

---

#### 3. Delete Plugin
```bash
!delplugin <plugin_name>
```
Hapus plugin dari bot.

---

#### 4. Reload Plugin
```bash
!reload <plugin_name>
```
Reload plugin tanpa restart bot (hot-reload).

---

#### 5. Cleanup Manager
```bash
!cleanup [option]
```

**Example:**
```bash
!cleanup --session    # Clean session files
!cleanup --memory     # Trigger GC
!cleanup --all        # Clean everything
```

---

#### 6. Message Store Manager
```bash
!store [option]
```

**Example:**
```bash
!store --status              # Show statistics
!store --search hello        # Search messages
!store --get ABC123          # Get specific message
```

---

#### 7. Cache Manager
```bash
!cache [option]
```

**Example:**
```bash
!cache --status      # Show cache stats
!cache --clear       # Clear all cache
!cache --cleanup     # Manual cleanup
```

---

#### 8. System Monitor
```bash
!system [option]
```
Monitor bot system status dan performance.

**Options:**
- `--memory` - Show memory stats
- `--rate` - Show rate limiter stats
- `--queue` - Show queue stats
- `--session` - Show session info

**Example:**
```bash
!system              # Show all stats
!system --memory     # Show memory only
```

---

#### 9. Restart Bot
```bash
!restart
```
Restart bot untuk apply perubahan atau fix issues.

---

#### 10. Set Mode
```bash
!setmode <mode>
```
Ubah mode bot.

**Modes:**
- `public` - Semua user bisa pakai
- `private` - Hanya user terdaftar
- `self` - Hanya owner

---

## 🏗️ Architecture

### Project Structure

```
kurumisaki-bot/
├── index.js                 # Entry point
├── config.js               # Configuration
├── core/                   # Core libraries
│   ├── CommandHandler.js   # Command handler
│   ├── Connection.js       # WhatsApp connection
│   ├── MessageStore.js     # Message storage
│   ├── ModuleLoader.js     # Plugin loader
│   ├── Serializer.js       # Message serializer
│   ├── Logger.js           # Logger utility
│   ├── GroupCache.js       # Group cache manager
│   ├── SessionCleaner.js   # Session cleaner
│   ├── RateLimiter.js      # Rate limiter
│   ├── MemoryMonitor.js    # Memory monitor
│   └── QueueManager.js     # Queue manager
├── commands/               # Command plugins
│   ├── general/           # General commands
│   ├── group/             # Group commands
│   ├── owner/             # Owner commands
│   ├── system/            # System commands
│   └── _antilink.js.         # Middleware Logic
├── utility/               # Utility functions
│   └── Font.js           # Font utilities
├── session/               # Session data (auto-generated)
└── package.json
```

---

## 📝 Creating Plugins

### Basic Plugin Structure

```javascript
//plugins/general/pluginname.js
import { toSmallCaps } from "../../utility/Font.js";

export default {
    name: "pluginname",
    aliases: ["alias1", "alias2"],
    desc: "Plugin description",
    usage: "pluginname [args]",
    category: "general",
    cooldown: 3,
    
    async execute({ m, args, sock, reply }) {
        // Your code here
        await reply("Hello World!");
    }
};
```

### Plugin Options

```javascript
{
    name: "commandname",        // Required
    aliases: ["alias"],         // Optional
    desc: "Description",        // Optional
    usage: "command [args]",    // Optional
    category: "general",        // Optional
    cooldown: 3,               // Seconds
    isOwner: false,            // Owner only
    isAdmin: false,            // Admin only
    isGroup: false,            // Group only
    isPrivate: false,          // Private only
    isBotAdmin: false,         // Bot must be admin
}
```

### Context Object

```javascript
{
    m,              // Message object
    args,           // Arguments array
    sock,           // Socket connection
    config,         // Bot config
    handler,        // Command handler
    store,          // Message store
    groupCache,     // Group cache
    reply,          // Quick reply
    react,          // Quick react
    isOwner,        // Is owner
    isGroup,        // Is group chat
}
```

### Creating Middleware

Buat file dengan prefix `_` di folder `plugins/`:

```javascript
// plugins/_logger.js
export default async function(ctx) {
    console.log(`Command: ${ctx.m.text}`);
    return true; // Return false to block command
}
```

---

## 🔧 Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name kurumisaki

# With auto-restart
pm2 start index.js --name kurumisaki --watch

# View logs
pm2 logs kurumisaki

# Restart
pm2 restart kurumisaki

# Stop
pm2 stop kurumisaki

# Auto start on boot
pm2 startup
pm2 save
```

---

## 🛡️ Security

### Best Practices

1. ✅ **Jangan share `creds.json`** - Contains bot credentials
2. ✅ **Use `.gitignore`** - Exclude sensitive files
3. ✅ **Owner verification** - Always verify owner
4. ✅ **Rate limiting** - Prevent spam abuse
5. ✅ **Plugin validation** - Validate before install
6. ✅ **Regular cleanup** - Clean session regularly

### .gitignore

```gitignore
# Session
session/
*.session

# Node modules
node_modules/

# Logs
*.log

# Environment
.env
```

---

## 🐛 Troubleshooting

### Bot tidak merespon
1. Check console untuk error
2. Pastikan prefix sudah benar
3. Check mode bot (public/private/self)
4. Restart bot dengan `!restart`

### High memory usage
```bash
!cleanup --memory
!system --memory
```

### Session error
```bash
!cleanup --session
# Atau hapus folder session dan login ulang
```

---

## 📊 Performance

### Benchmarks

**Test Environment:**
- CPU: 2 vCPU
- RAM: 1GB
- Network: 10Mbps

**Results:**
- ✅ Handle 100+ concurrent users
- ✅ Response time < 500ms
- ✅ Memory usage: 200-400MB
- ✅ Uptime: 99.9%

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Shannz**
- GitHub: [@yourusername](https://github.com/Shannzx10)
- WhatsApp: [+62 821-4277-0930](https://wa.me/6282142770930)

---

## 🙏 Acknowledgments

- [IKYYYOFC](https://github.com/ikyyyofc) - Debugging Helper
- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [Pino](https://github.com/pinojs/pino) - Logging

---

## 📞 Support

Jika ada pertanyaan atau butuh bantuan:

- 💬 WhatsApp: [+62 821-4277-0930](https://wa.me/6283151548026)
- 🐛 Issues: [GitHub Issues](https://github.com/Shannzx10/KurumiSaki/issues)

---

## 🗺️ Roadmap

- [✅] Web Dashboard
- [✅] Database integration
- [✅] Multi-device support
- [✅] AI integration
- [✅] Payment gateway
- [✅] REST API
- [✅] Docker support

---

<div align="center">

**Made with ❤️ by Shannz**

⭐ Star this repo if you find it useful!

</div>