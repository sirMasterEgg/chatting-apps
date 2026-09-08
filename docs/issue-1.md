# Issue #1 — Setup & Konfigurasi Awal Project

**Label:** `setup`, `chore`
**Estimasi:** 1–2 hari
**Blocking:** Issue #2, Issue #3

---

## Latar Belakang

Project ini adalah website chatting realtime tanpa persistensi. Pesan hanya
hidup selama sesi socket berlangsung dan tidak pernah disimpan ke database,
file, maupun storage lain. Issue ini menyiapkan fondasi repo, tooling, dan
struktur folder agar implementasi fitur di Issue #2 dan #3 bisa langsung jalan.

## Tujuan

Menyiapkan monorepo berbasis **npm workspaces** yang berisi client (React +
Vite + TS) dan server (Express + TS), lengkap dengan shared types, konfigurasi
Tailwind, dan script development yang menjalankan keduanya sekaligus.

---

## Ruang Lingkup

### 1. Inisialisasi Monorepo

- [ ] `git init` dan buat `.gitignore` (node_modules, dist, .env, .env.local, logs)
- [ ] Buat `package.json` di root dengan `"private": true` dan workspaces:
      `apps/client`, `apps/server`, `packages/shared`
- [ ] Tambahkan `concurrently` di root untuk menjalankan client + server bersamaan
- [ ] Node.js minimal versi 20 LTS (catat di `.nvmrc` dan field `engines`)

### 2. Package `packages/shared`

Berisi kontrak yang dipakai bersama client dan server agar tidak ada duplikasi tipe.

- [ ] `types.ts` — tipe domain:
  ```ts
  export type MessageKind = 'text' | 'image' | 'file' | 'system';

  export interface User {
    id: string;        // socket id
    username: string;
  }

  export interface Attachment {
    name: string;      // nama file asli
    mimeType: string;
    size: number;      // bytes (ukuran asli sebelum base64)
    dataUrl: string;   // data:<mime>;base64,<...>
  }

  export interface ChatMessage {
    id: string;              // uuid dibuat di server
    roomId: string;
    kind: MessageKind;
    author: User | null;     // null untuk pesan sistem
    text?: string;
    attachment?: Attachment;
    sentAt: number;          // epoch ms, diisi server
  }
  ```
- [ ] `events.ts` — kontrak event Socket.IO yang diketik:
  ```ts
  export interface ClientToServerEvents {
    'room:join': (p: { roomId: string; username: string },
                  ack: (r: { ok: true; users: User[] } | { ok: false; error: string }) => void) => void;
    'room:leave': () => void;
    'message:send': (p: { kind: MessageKind; text?: string; attachment?: Attachment },
                     ack: (r: { ok: boolean; error?: string }) => void) => void;
    'typing:start': () => void;
    'typing:stop': () => void;
  }

  export interface ServerToClientEvents {
    'message:new': (m: ChatMessage) => void;
    'users:update': (users: User[]) => void;
    'typing:update': (usernames: string[]) => void;
    'room:error': (p: { code: string; message: string }) => void;
  }
  ```
- [ ] `constants.ts` — batas yang dipakai kedua sisi:
      `MAX_FILE_SIZE = 5 * 1024 * 1024`, `MAX_TEXT_LENGTH = 2000`,
      `ALLOWED_IMAGE_TYPES`, `USERNAME_MIN/MAX`, `ROOM_ID_PATTERN`
- [ ] Export semua lewat `index.ts`, `"type": "module"`, tanpa build step
      (di-resolve langsung dari TS oleh Vite dan `tsx`)

### 3. Package `apps/server` (Express + TypeScript + Socket.IO)

- [ ] Scaffold dengan dependencies:
      `express`, `socket.io`, `cors`, `dotenv`, `uuid`
- [ ] devDependencies: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`
- [ ] `tsconfig.json`: target ES2022, module NodeNext, `strict: true`,
      path alias `@shared/*` → `../../packages/shared/*`
- [ ] Struktur folder:
  ```
  apps/server/
  ├── src/
  │   ├── index.ts          # entry: buat http server + attach socket.io
  │   ├── app.ts            # express app + middleware + health route
  │   ├── config/env.ts     # baca & validasi env var
  │   ├── socket/
  │   │   ├── index.ts      # registrasi handler & tipe generic Socket.IO
  │   │   └── handlers/     # (diisi di Issue #2)
  │   ├── store/
  │   │   └── roomStore.ts  # in-memory store (diisi di Issue #2)
  │   └── utils/
  └── package.json
  ```
- [ ] Endpoint `GET /health` mengembalikan `{ status: 'ok', uptime }`
- [ ] Konfigurasi CORS mengambil origin dari `CLIENT_ORIGIN`
- [ ] Naikkan `maxHttpBufferSize` Socket.IO ke ~8MB agar payload base64 5MB muat
- [ ] Script: `dev` (`tsx watch src/index.ts`), `build` (`tsc`), `start`

### 4. Package `apps/client` (React + Vite + TS)

- [ ] Scaffold `npm create vite@latest` template `react-ts`
- [ ] Dependencies: `react-router-dom`, `@tanstack/react-query`, `socket.io-client`
- [ ] devDependencies: `tailwindcss`, `@tailwindcss/vite` (Tailwind v4),
      `typescript`, `@types/react`, `@types/react-dom`
- [ ] Setup Tailwind: import `tailwindcss` di `src/index.css`, daftarkan plugin
      Tailwind di `vite.config.ts`
- [ ] Alias `@` → `src` dan `@shared` → `packages/shared` di `vite.config.ts`
      **dan** `tsconfig.json` (harus sinkron)
- [ ] Struktur folder:
  ```
  apps/client/
  ├── src/
  │   ├── main.tsx            # QueryClientProvider + RouterProvider
  │   ├── router.tsx          # definisi route
  │   ├── pages/
  │   │   ├── LandingPage.tsx # (diisi di Issue #2)
  │   │   └── RoomPage.tsx    # (diisi di Issue #2)
  │   ├── components/
  │   │   ├── ui/             # komponen presentational generik
  │   │   └── chat/           # komponen khusus chat
  │   ├── hooks/
  │   ├── lib/
  │   │   └── socket.ts       # factory instance socket
  │   ├── context/
  │   ├── types/
  │   └── index.css
  └── package.json
  ```
- [ ] Route dasar: `/` → LandingPage, `/room/:roomId` → RoomPage,
      `*` → redirect ke `/` (halaman masih placeholder di issue ini)
- [ ] `QueryClient` dibuat sekali di luar komponen dengan default
      `refetchOnWindowFocus: false`

> **Catatan React Query:** karena data chat mengalir lewat socket dan tidak
> pernah dipersist, React Query hanya dipakai untuk hal berbasis HTTP —
> misalnya health check server / cek ketersediaan room sebelum join. Jangan
> paksakan cache React Query sebagai sumber kebenaran daftar pesan.

### 5. Environment & Tooling

- [ ] `apps/server/.env.example`: `PORT=4000`, `CLIENT_ORIGIN=http://localhost:5173`
- [ ] `apps/client/.env.example`: `VITE_SERVER_URL=http://localhost:4000`
- [ ] ESLint + Prettier di root, satu konfigurasi untuk semua workspace
- [ ] Script root:
      `dev` (concurrently client+server), `build`, `lint`, `typecheck`
- [ ] `README.md`: cara install, cara menjalankan, penjelasan arsitektur singkat,
      dan penegasan bahwa **tidak ada data yang dipersist**

---

## Acceptance Criteria

1. `npm install` di root memasang dependencies seluruh workspace dalam satu perintah.
2. `npm run dev` menyalakan server di `:4000` dan client di `:5173` bersamaan.
3. `curl http://localhost:4000/health` mengembalikan `{ "status": "ok", ... }`.
4. Membuka `http://localhost:5173/` menampilkan placeholder LandingPage dengan
   styling Tailwind yang jelas terpakai (bukan CSS default).
5. Navigasi manual ke `/room/abc` menampilkan placeholder RoomPage.
6. `npm run typecheck` lolos tanpa error di seluruh workspace.
7. Import `import type { ChatMessage } from '@shared/types'` berhasil di
   client maupun server tanpa error resolusi.
8. Tidak ada dependency database, ORM, atau library storage apa pun di
   `package.json` mana pun.

## Di Luar Ruang Lingkup

- Implementasi logika join room, pengiriman pesan, dan daftar user online → Issue #2
- Typing indicator, preview gambar, reconnect, rate limiting → Issue #3
- Deployment, CI/CD, dan Dockerfile
