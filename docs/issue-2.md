# Issue #2 — Implementasi Fitur Dasar

**Label:** `feature`, `core`
**Estimasi:** 3–5 hari
**Depends on:** Issue #1

---

## Latar Belakang

Setelah fondasi project siap, issue ini mengimplementasikan alur utama aplikasi:
landing page → join room → chatting realtime (teks, gambar, file) → daftar user
online → keluar room → room dihapus otomatis saat kosong.

Prinsip yang tidak boleh dilanggar: **tidak ada satu pun pesan atau file yang
ditulis ke database, disk, atau storage eksternal.** Seluruh state hidup di
memori server dan hilang saat proses restart.

---

## Ruang Lingkup

### 1. Server — In-Memory Room Store

`apps/server/src/store/roomStore.ts`

- [ ] Struktur data:
  ```ts
  type Room = {
    id: string;
    users: Map<string, User>;   // key: socket.id
    createdAt: number;
  };
  const rooms = new Map<string, Room>();
  ```
- [ ] `joinRoom(roomId, user)` — buat room bila belum ada, lalu tambahkan user.
      Mengembalikan `{ room, isNewRoom }`.
- [ ] `leaveRoom(socketId)` — hapus user dari room-nya. **Jika `users.size === 0`
      setelah penghapusan, hapus room dari `Map`** (memenuhi flow poin 9).
- [ ] `getUsers(roomId)` — daftar user online di room.
- [ ] `isUsernameTaken(roomId, username)` — pengecekan case-insensitive.
- [ ] `getRoomOfSocket(socketId)` — lookup cepat untuk handler `disconnect`.
- [ ] **Tidak ada pesan yang disimpan di store ini.** Pesan hanya di-broadcast
      lalu langsung dilupakan server.

### 2. Server — Socket.IO Handlers

`apps/server/src/socket/handlers/`

- [ ] **`room:join`**
  - Validasi `username` (3–20 karakter, trim, tidak kosong) dan `roomId`
    (3–32 karakter alfanumerik + `-` / `_`).
  - Tolak lewat ack `{ ok: false, error }` bila username sudah dipakai di room
    yang sama atau validasi gagal.
  - `socket.join(roomId)`, simpan `{ roomId, username }` di `socket.data`.
  - Balas ack `{ ok: true, users }`.
  - Broadcast `users:update` ke seluruh room.
  - Broadcast pesan sistem `message:new` bertipe `system`:
    "&lt;username&gt; bergabung ke room".
- [ ] **`message:send`**
  - Validasi berdasarkan `kind`:
    - `text` → `text` wajib ada, panjang ≤ `MAX_TEXT_LENGTH`, non-kosong setelah trim.
    - `image` / `file` → `attachment` wajib ada, `size` ≤ `MAX_FILE_SIZE`,
      `dataUrl` berformat `data:<mime>;base64,...` yang valid.
  - Tolak bila socket belum join room mana pun.
  - Server yang menentukan `id` (uuid), `sentAt`, dan `author` — **jangan pernah
    percaya nilai tersebut dari client**.
  - `io.to(roomId).emit('message:new', message)` — dikirim ke semua termasuk
    pengirim, sehingga client tidak perlu logika optimistic yang rumit.
  - Setelah emit, objek pesan dilepas (tidak disimpan ke variabel mana pun).
- [ ] **`room:leave`** — jalankan alur keluar, lalu `socket.leave(roomId)`.
- [ ] **`disconnect`** — jalankan alur keluar yang sama (tab ditutup / koneksi putus).
- [ ] Alur keluar dipakai bersama oleh `room:leave` dan `disconnect`:
  1. `leaveRoom(socket.id)`
  2. Broadcast pesan sistem "&lt;username&gt; meninggalkan room"
  3. Broadcast `users:update`
  4. Bila room jadi kosong, room sudah otomatis terhapus oleh store

### 3. Server — Konfigurasi Payload

- [ ] Pastikan `maxHttpBufferSize` cukup untuk base64 dari file 5MB (≈6.7MB)
      ditambah overhead.
- [ ] Tolak payload di atas batas dengan ack error yang informatif, bukan
      memutus koneksi diam-diam.

### 4. Client — Socket Layer

`apps/client/src/lib/socket.ts` dan `apps/client/src/context/SocketContext.tsx`

- [ ] Buat instance `io(VITE_SERVER_URL, { autoConnect: false })` yang diketik
      dengan `Socket<ServerToClientEvents, ClientToServerEvents>`.
- [ ] `SocketProvider` yang membungkus RoomPage: connect saat mount,
      disconnect saat unmount.
- [ ] Hook `useSocket()` untuk mengakses instance.

### 5. Client — Session State

`apps/client/src/context/SessionContext.tsx`

- [ ] Simpan `{ username, roomId }` hasil input landing page di React state
      (boleh dicerminkan ke `sessionStorage` supaya refresh halaman room tidak
      langsung menendang pengguna).
- [ ] Bila `RoomPage` diakses langsung tanpa session (misalnya URL di-paste),
      redirect ke `/` (memenuhi flow poin 8).

### 6. Client — Landing Page

`apps/client/src/pages/LandingPage.tsx`

- [ ] Form dengan dua input: **Username** dan **Room ID**, plus tombol **Masuk**.
- [ ] Tombol "Buat Room Baru" yang mengisi field Room ID dengan id acak
      (misalnya `crypto.randomUUID().slice(0, 8)`).
- [ ] Validasi client-side selaras dengan aturan server; tombol disabled selama
      input tidak valid atau saat proses join sedang berjalan.
- [ ] Saat submit: connect socket → emit `room:join` → tunggu ack.
  - Ack sukses → simpan session → `navigate('/room/' + roomId)`
  - Ack gagal → tampilkan pesan error di bawah field terkait, socket
    di-disconnect kembali
- [ ] Tidak ada perbedaan UI antara "membuat" dan "bergabung" — server yang
      memutuskan (memenuhi flow poin 3 dan 4).

### 7. Client — Room Page

`apps/client/src/pages/RoomPage.tsx`

Layout dua kolom: area chat di kiri (fleksibel), daftar user online di kanan
(lebar tetap sekitar 240px, sesuai flow poin 6).

- [ ] **Header** — menampilkan Room ID, tombol salin Room ID, dan tombol
      **Keluar** yang emit `room:leave`, membersihkan session, lalu
      `navigate('/')`.
- [ ] **`MessageList`** — merender daftar pesan dari state lokal
      (`useState<ChatMessage[]>`) yang diisi listener `message:new`.
  - Pesan milik sendiri rata kanan, pesan orang lain rata kiri.
  - Pesan `system` tampil sebagai teks kecil terpusat.
  - Tampilkan username dan jam kirim.
- [ ] **`MessageItem`** — render berdasarkan `kind`:
  - `text` → teks dengan `white-space: pre-wrap` dan pemenggalan kata panjang
  - `image` → `<img>` dari `attachment.dataUrl`
  - `file` → kartu berisi ikon, nama file, ukuran, dan tombol unduh
    (`<a href={dataUrl} download={name}>`)
- [ ] **`MessageInput`** — textarea (Enter kirim, Shift+Enter baris baru),
      tombol lampiran, tombol kirim.
  - Baca file lewat `FileReader.readAsDataURL`.
  - Tolak file di atas `MAX_FILE_SIZE` di client sebelum dikirim, dengan pesan jelas.
  - Deteksi `kind` dari `mimeType`: `image/*` → `image`, selain itu → `file`.
- [ ] **`UserList`** — daftar user online dari listener `users:update`, lengkap
      dengan jumlah user dan penanda "(kamu)" pada diri sendiri.
- [ ] Bersihkan semua listener socket di cleanup `useEffect` agar tidak terjadi
      duplikasi pesan saat re-render atau StrictMode.

### 8. Cleanup Otomatis

- [ ] Verifikasi bahwa saat user terakhir keluar, entri room benar-benar terhapus
      dari `Map` (log sementara boleh dipakai untuk pembuktian).
- [ ] Pesan lama **tidak** ikut terkirim ke user yang baru bergabung — user baru
      mulai dengan riwayat kosong. Ini konsekuensi yang disengaja dari konsep
      "tidak pernah disimpan", dan perlu ditegaskan di UI lewat pesan sistem awal
      seperti "Pesan tidak disimpan di mana pun. Riwayat sebelum kamu bergabung
      tidak tersedia."

---

## Acceptance Criteria

1. Dua browser berbeda dengan username berbeda dan Room ID sama dapat saling
   bertukar pesan teks secara realtime (di bawah 1 detik pada jaringan lokal).
2. Room ID yang belum pernah dipakai otomatis terbentuk saat user pertama join.
3. Gambar terkirim dan tampil sebagai gambar di semua client dalam room.
4. File non-gambar terkirim dan dapat diunduh dengan nama file asli yang utuh.
5. Daftar user online di panel kanan bertambah saat ada yang join dan berkurang
   saat ada yang keluar atau menutup tab.
6. Menekan tombol Keluar mengembalikan pengguna ke landing page dan menghapus
   dirinya dari daftar user online di client lain.
7. Setelah semua user keluar, room hilang dari memori server; user yang join
   dengan Room ID sama sesudahnya mendapat room baru yang kosong.
8. Username yang sudah dipakai di room yang sama ditolak dengan pesan error yang
   terbaca di landing page.
9. File di atas 5MB ditolak di client dengan pesan jelas dan tidak dikirim.
10. Restart server membuat seluruh room dan pesan hilang, dan tidak ada file baru
    yang tertinggal di disk.

## Di Luar Ruang Lingkup

- Typing indicator, preview/lightbox gambar, progress bar upload → Issue #3
- Auto-reconnect dan rejoin otomatis → Issue #3
- Rate limiting dan sanitasi input → Issue #3
