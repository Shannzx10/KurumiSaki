### KurumiSaki - WhatsApp Bot

<div align="center">

![KurumiSaki Banner](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLIpP8a2eFxRSnGn5_DYlRRYCX1BMaYmzkTTltSpuEfnONrEO9dC5jPUs&s=10)

![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-cloud--ready-success.svg)

**WhatsApp Bot Modern dengan Arsitektur Hybrid (Local/Cloud), Support Docker, dan Database Terdistribusi.**

[Features](#-features) • [Installation](#-installation) • [Cloud Deployment](#-cloud-deployment) • [Configuration](#%EF%B8%8F-configuration)

</div>

---

## 📝 Changelog

### [1.0.4] - 2026-01-01

Update besar untuk stabilitas deployment di Cloud (Hugging Face, Railway, Render) dan Database Terdistribusi.

#### ☁️ Cloud & Deployment
- **Turso Integration:** Menambahkan support penuh untuk Database Turso (`@libsql/client`).
- **Auto-Pairing Mechanism:** Bot sekarang bisa membaca `PAIRING_NUMBER` dari Environment Variable. Tidak perlu input manual di console saat deploy di Cloud.
- **Docker Support:** Menambahkan `Dockerfile` yang sudah dioptimasi dengan `ffmpeg` dan dependencies pendukung.
- **Hugging Face Compatibility:** Integrasi otomatis port `7860` agar bot tetap hidup di Free Tier HF Spaces.

#### 🔧 Core Updates
- **ApiServer Integration:** Mengintegrasikan `ApiServer.js` langsung ke `index.js` untuk handling port dan monitoring, menggantikan manual HTTP server.
- **Hybrid Auth:** Logika `Connection.js` diperbarui untuk memilih antara `SQLiteAuth` (Lokal) atau `TursoAuth` (Cloud) secara otomatis.
- **Env Configuration:** Migrasi kredensial sensitif (API Key, Token DB) ke file `.env`.
- **Async Store:** `MessageStore` di-refactor agar mendukung operasi *asynchronous* untuk database cloud.

---

## ✨ Features

### 🔥 Core Features
- **Hybrid Database:** Otomatis memilih penyimpanan:
  - **Lokal:** Menggunakan `SQLite` (File `.db` di folder database).
  - **Cloud:** Menggunakan `Turso/LibSQL` (Koneksi via Internet, cocok untuk Docker/Hugging Face).
- **Auto-Pairing System:** Mekanisme pairing pintar yang bisa membaca nomor dari Environment Variable.
- **Port Handling:** Terintegrasi dengan API Server untuk menjaga bot tetap hidup di layanan Cloud (Keep-Alive).
- **Multi-prefix:** Support prefix `!`, `.`, `/`, atau tanpa prefix.

### 🚀 Advanced Capabilities
- 🛡️ **Anti-Spam & Rate Limiter:** Proteksi canggih untuk mencegah abuse.
- 📦 **Message Store:** Menyimpan riwayat pesan (kompatibel dengan Turso).
- 🔄 **Hot Reload:** Update fitur tanpa mematikan bot.
- 📊 **System Monitor:** Cek penggunaan RAM dan status bot via command.

---

## 🚀 Installation (Local / PC)

Cara ini jika Anda ingin menjalankan bot di Laptop/PC sendiri.

### 1. Clone & Install
```bash
git clone [https://github.com/Shannzx10/KurumiSaki.git](https://github.com/Shannzx10/KurumiSaki.git)
cd kurumisaki-bot
npm install

```

### 2. Setup Config

Rename file `.env.example` menjadi `.env`, lalu isi sesuai kebutuhan.

```env
TURSO_URL=libsql://nama-db-anda.turso.io
TURSO_AUTH_TOKEN=ey...

GEMINI_APIKEY=AIza...

PORT=7860
SECRET_KEY=shannz-secret-key
```

### 3. Jalankan Bot

```bash
npm start

```

Bot akan mendeteksi nomor WhatsApp Anda di terminal untuk pairing.

---

## ☁️ Cloud Deployment (Hugging Face / Railway)

Cara ini agar bot online 24 jam gratis tanpa menyalakan PC. Karena di Cloud kita tidak bisa input manual, kita pakai fitur **Auto-Pairing**.

### Persiapan (Wajib)

1. Siapkan akun **Turso** (untuk database sesi).
2. Siapkan **API Key Gemini** (untuk fitur AI).
3. Siapkan **Nomor WhatsApp** yang akan dijadikan bot.

### Deploy ke Hugging Face Spaces (Gratis)

1. Buat Space baru -> Pilih SDK **Docker** -> Template **Blank**.
2. Masuk ke **Settings** -> **Variables and secrets**.
3. Tambahkan **Secrets** (Penting agar bot jalan otomatis):
* `TURSO_URL`: URL Database Turso (contoh: `libsql://db-shannz.turso.io`)
* `TURSO_AUTH_TOKEN`: Token Auth Turso.
* `PAIRING_NUMBER`: Nomor bot (contoh: `6281234567890`). **Wajib diisi agar tidak nyangkut minta input.**
* `GEMINI_APIKEY`: API Key Google Anda.


4. Upload semua file bot ini ke Space tersebut.
5. Tunggu proses **Building**.
6. Setelah status **Running**, cek tab **Logs**.
7. Kode Pairing akan muncul otomatis di Logs. Masukkan ke WhatsApp Anda.

> **Note:** Bot otomatis membuka port `7860` agar Space tidak mati (Sleep).

---

## ⚙️ Configuration Guide

Bot ini menggunakan sistem konfigurasi bertingkat.

### 1. `.env` (Environment Variables)

Digunakan untuk data rahasia dan konfigurasi server.

| Variable | Fungsi | Wajib di Cloud? |
| --- | --- | --- |
| `TURSO_URL` | Koneksi ke Database Cloud | ✅ Ya |
| `TURSO_AUTH_TOKEN` | Password Database Cloud | ✅ Ya |
| `PAIRING_NUMBER` | Nomor HP Bot untuk Auto-Pairing | ✅ Ya |
| `PORT` | Port Server (Default: 7860) | ❌ (Default OK) |
| `SECRET_KEY` | Kunci akses API Panel | ❌ (Opsional) |

### 2. `config.js` (Bot Logic)

Digunakan untuk pengaturan fitur bot.

```javascript
export default {
    botName: "KurumiSaki",
    // Logic otomatis membaca dari ENV
    turso: {
        enabled: !!process.env.TURSO_URL, 
        // ...
    },
    // Fitur lainnya
    antiSpam: { enabled: true },
    groupCache: { enabled: true }
};

```

---

## 🏗️ Architecture

```
kurumisaki-bot/
├── .env                    # Rahasia (Jangan di-upload)
├── .env.example            # Contoh config
├── Dockerfile              # Konfigurasi Docker
├── index.js                # Entry point & Port Listener
├── config.js               # Main Logic Config
├── core/
│   ├── Connection.js       # Auto-Pairing Logic ada disini
│   ├── ApiServer.js        # API & Web Panel Backend
│   ├── TursoAuth.js     # Cloud Session Handler
│   ├── TursoMessageStore.js    # Cloud Message Storage
│   └── ...
└── ...

```

---

## 🤝 Contributing

Contributions are welcome! Please fork, create feature branch, and submit PR.

---

## 👨‍💻 Author

**Shannz**

* GitHub: [@Shannzx10](https://github.com/Shannzx10)