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

### [1.0.1] - 2024-11-24

#### 🚀 Core Features
- Penyesuaian di `Connection.js`, `MessageHandler.js`
- Add `geminiApikey` di config.js
- Add `Uploader.js` utility
- Update baileys to `rc.9`
- Add module `@google/genai`, `yt-search`, `mime-types`, dan `wa-sticker-formatter`

#### 🔧 Commands Update
- `addplugin` - Fix bug folder
- `delplugin` - Fix bug folder
- `reload` - Fix bug folder
- `menu` - Fix bug owner named

#### 🛠️ Add Commands
- `kurumi` - Ai support script
- `cekip` - Cek IP bot
- `ytdl` - Youtube downloader mp3 & mp4
- `yts` - Youtube search
- `toimg` - Convert sticker to image/video
- `tourl` - Upload all media file to cloud
- `sticker` - Convert image/video to sticker 
- `swm` - Rename package & author sticker 

---