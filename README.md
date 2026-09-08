# Realtime Chat App

Website chatting realtime **tanpa persistensi apa pun**. Pesan, gambar, dan
file hidup selama sesi socket berlangsung dan hilang begitu semua peserta
keluar dari room atau server di-restart — tidak ada database, tidak ada
penulisan ke disk, tidak ada storage eksternal.

## Arsitektur

Monorepo npm workspaces:

```
apps/client     React + Vite + TypeScript + Tailwind CSS (UI)
apps/server     Express + Socket.IO + TypeScript (realtime signaling)
packages/shared Tipe domain, kontrak event Socket.IO, dan konstanta bersama
```

- Client dan server berbagi tipe (`ChatMessage`, `User`, dll) dan kontrak
  event Socket.IO (`ClientToServerEvents` / `ServerToClientEvents`) dari
  `packages/shared`, sehingga payload tidak pernah lepas dari pengecekan tipe.
- Server menyimpan state room (daftar user per room) di memori
  (`Map<roomId, Room>`). **Pesan tidak pernah disimpan** — begitu di-broadcast
  ke room lewat Socket.IO, objek pesan langsung dilupakan.
- Room otomatis dibuat saat user pertama join, dan otomatis dihapus dari
  memori saat user terakhir keluar.

## Menjalankan secara lokal

Prasyarat: Node.js 20 LTS ke atas (lihat `.nvmrc`).

```bash
npm install                        # instal seluruh workspace dari root
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env
npm run dev                        # jalankan server (:4000) + client (:5173) bersamaan
```

Buka `http://localhost:5173`, isi username dan Room ID (atau klik "Buat Room
Baru"), lalu bagikan Room ID ke orang lain untuk chat bersama secara realtime.

## Script lain

```bash
npm run build       # build shared, server, dan client
npm run typecheck    # typecheck seluruh workspace
npm run lint          # ESLint seluruh workspace
```

## Prinsip desain: tanpa persistensi

- Tidak ada database, ORM, atau file storage di dependency mana pun.
- Riwayat pesan tidak dikirim ke user yang baru join — mereka mulai dari
  riwayat kosong.
- Merestart server menghapus seluruh room dan pesan tanpa jejak di disk.

## Struktur implementasi

Pekerjaan dibagi menjadi tiga tahap (lihat `docs/issue-1.md`, `docs/issue-2.md`,
`docs/issue-3.md` untuk detail lengkap):

1. **Setup & konfigurasi** — monorepo, shared types, scaffold client/server.
2. **Fitur dasar** — join room, chat teks/gambar/file, daftar user online.
3. **Fitur tambahan** — typing indicator, preview/lightbox gambar, reconnect,
   rate limiting, dan hardening server.
