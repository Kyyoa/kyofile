# 📁 kyofile — Titip & Berbagi Berkas Kilat

Pilih berkas, dapatkan tautan instan, lalu bagikan. Tanpa akun, tanpa pelacakan.

**Live:** https://kyofile.galaci.my.id

## Fitur

- 📤 Upload langsung via signed URL (bytes tidak lewat server — hemat bandwidth)
- 🔗 Tautan instan `/f/<slug>` berupa **lembar informasi berkas** (ukuran, tipe, SHA-256, hitungan unduhan)
- ⤓ Tombol unduh paksa nama file asli
- 🧬 Dedup SHA-256 — file identik langsung dapat tautan tanpa upload ulang
- ⏳ Masa berlaku tautan: 1 jam / 1 hari / 7 hari / 30 hari / 90 hari idle
- 🧹 Janitor otomatis tiap jam (berkas kedaluwarsa + idle purge)
- 🛡️ Antibot tanpa captcha (honeypot + timestamp), rate-limit per IP, blocklist executable
- 🗄️ Multi-backend storage pool dengan failover otomatis

## Tech Stack

Next.js 14 (App Router) · TypeScript · Supabase (Postgres + Storage) · Vercel

## Jalankan Lokal

```bash
cp .env.example .env.local   # isi nilai-nilainya
npm install
npm run dev
```

## Setup Database

Jalankan `supabase/schema.sql` di project Supabase meta, buat bucket
`uploads` (private) di tiap project pool, lalu isi env sesuai `.env.example`.

## Struktur API

| Endpoint | Fungsi |
|---|---|
| `POST /api/v1/upload/init` | Minta tiket + signed URL |
| `POST /api/v1/upload/finalize` | Verifikasi & catat metadata |
| `GET /f/[slug]` | Lembar informasi berkas |
| `GET /api/v1/download/[slug]` | Redirect signed URL (mode attachment) |
| `GET /api/v1/file/[slug]` | Metadata JSON mesin |
| `POST /api/v1/report` | Laporkan penyalahgunaan |
| `GET /api/cron/janitor` | Pembersihan berkala (perlu `Bearer CRON_SECRET`) |

## Lisensi

MIT
