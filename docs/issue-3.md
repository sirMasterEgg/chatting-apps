# Issue #3 — Implementasi Fitur Tambahan

**Label:** `enhancement`, `ux`, `hardening`
**Estimasi:** 3–4 hari
**Depends on:** Issue #2

---

## Latar Belakang

Fitur dasar sudah berjalan. Issue ini menaikkan kualitas pengalaman pakai
(typing indicator, preview gambar, reconnect) dan menambah pengamanan minimum
(rate limiting, sanitasi input) tanpa mengubah prinsip inti: **pesan tetap
realtime dan tidak pernah disimpan.**

---

## Ruang Lingkup

### 1. Typing Indicator dan Notifikasi Join/Leave

**Server**

- [ ] Handler `typing:start` dan `typing:stop`: simpan `Set<socketId>` per room
      di memori (di dalam objek `Room`, bukan store terpisah).
- [ ] Broadcast `typing:update` berisi daftar username yang sedang mengetik ke
      semua anggota room **kecuali** pengirimnya sendiri.
- [ ] Auto-expire: bila `typing:stop` tidak datang dalam 5 detik, hapus otomatis
      dari set dan broadcast ulang. Ini mencegah indikator nyangkut saat koneksi
      putus mendadak.
- [ ] Saat user leave/disconnect, bersihkan juga entrinya dari set typing.

**Client**

- [ ] Emit `typing:start` saat pengguna mulai mengetik, dengan **throttle** agar
      tidak lebih dari satu emit per 2 detik.
- [ ] Emit `typing:stop` saat input kosong, saat pesan terkirim, atau setelah
      1,5 detik tanpa ketikan (debounce).
- [ ] Komponen `TypingIndicator` di bawah `MessageList`:
  - 1 orang → "Budi sedang mengetik..."
  - 2 orang → "Budi dan Siti sedang mengetik..."
  - lebih dari 2 → "3 orang sedang mengetik..."
- [ ] Indikator menempati tinggi tetap agar daftar pesan tidak melompat saat
      indikator muncul dan hilang.

**Notifikasi join/leave**

- [ ] Rapikan pesan sistem dari Issue #2: styling khusus (teks kecil, terpusat,
      warna redup), dengan ikon masuk/keluar.
- [ ] Pesan sistem berturut-turut dari orang yang sama dalam 5 detik digabung
      agar tidak membanjiri layar.

### 2. Preview Gambar dan Progress Upload

- [ ] **Preview sebelum kirim** — setelah memilih file, tampilkan chip/kartu
      preview di atas input:
  - gambar → thumbnail kecil
  - file lain → ikon berdasarkan ekstensi, nama file, dan ukuran terformat
  - tombol X untuk membatalkan lampiran sebelum terkirim
- [ ] **Progress** — tampilkan progress bar dua fase:
  1. pembacaan file (`FileReader.onprogress`)
  2. pengiriman socket (dari emit sampai ack diterima; bila granularitas byte
     tidak tersedia, gunakan indeterminate spinner)
- [ ] **Lightbox** — klik gambar di daftar pesan membuka overlay layar penuh:
      tutup dengan Esc atau klik latar, tombol unduh di pojok.
- [ ] **Validasi lampiran** di client:
  - ukuran maksimum 5MB, dengan pesan yang menyebutkan ukuran file aktual
  - whitelist tipe gambar untuk render inline (`image/png`, `image/jpeg`,
    `image/gif`, `image/webp`); tipe gambar lain diperlakukan sebagai file biasa
  - tolak `dataUrl` yang gagal dibaca dan tampilkan error, jangan diam saja
- [ ] **Paste dan drag-drop** — mendukung paste gambar dari clipboard dan
      drag-drop file ke area chat, keduanya melewati jalur validasi yang sama.
- [ ] **Manajemen memori** — batasi jumlah pesan yang ditahan di state client
      (misalnya 200 pesan terakhir); buang yang paling lama agar data URL gambar
      tidak menumpuk dan membuat tab berat. Konsisten dengan konsep "tidak
      disimpan".

### 3. UX Polish dan Reconnect

- [ ] **Auto-scroll pintar** — scroll ke bawah otomatis saat ada pesan baru,
      **kecuali** pengguna sedang menggulir ke atas membaca pesan lama.
- [ ] **Tombol "Pesan baru"** — muncul saat ada pesan masuk sementara pengguna
      berada di posisi scroll atas; klik untuk melompat ke bawah.
- [ ] **Badge judul tab** — jumlah pesan belum dibaca di `document.title` saat
      tab tidak aktif (pakai Page Visibility API), reset saat tab kembali fokus.
- [ ] **Auto-reconnect** — aktifkan `reconnection` Socket.IO dengan backoff.
  - Tampilkan banner status koneksi: "Menghubungkan ulang..." /
    "Koneksi terputus".
  - Input pesan disabled selama socket terputus.
- [ ] **Rejoin otomatis** — pada event `connect` setelah reconnect, emit ulang
      `room:join` memakai session yang tersimpan.
  - Bila ack gagal karena username sudah dipakai socket lama yang belum
    dibersihkan, tampilkan dialog dan tawarkan kembali ke landing page.
  - Setelah rejoin berhasil, tampilkan pesan sistem "Koneksi tersambung kembali.
    Pesan selama terputus tidak dapat dipulihkan." — jujur menyampaikan
    konsekuensi desain tanpa persistensi.
- [ ] **Penanganan username duplikat di landing page** — error dari ack
      ditampilkan inline, field username otomatis fokus, dan disarankan
      alternatif seperti `username2`.
- [ ] **Empty state** — room kosong menampilkan ajakan yang jelas beserta Room ID
      dan tombol salin, supaya mudah mengundang orang lain.
- [ ] **Responsif** — di layar sempit, `UserList` menjadi drawer yang dibuka
      lewat tombol di header, bukan kolom tetap.
- [ ] **Aksesibilitas** — `aria-live="polite"` pada daftar pesan, fokus ring yang
      terlihat, dan seluruh aksi utama dapat dijangkau dengan keyboard.

### 4. Rate Limiting dan Sanitasi

**Server (wajib — client tidak boleh dipercaya)**

- [ ] Rate limit per socket menggunakan token bucket di memori:
  - pesan teks: maksimum 10 per 10 detik
  - lampiran: maksimum 3 per 30 detik
  - `room:join`: maksimum 5 percobaan per menit per IP
- [ ] Pelanggaran dibalas ack `{ ok: false, error: 'RATE_LIMITED' }` plus event
      `room:error`; pelanggaran berulang (misalnya 5 kali berturut-turut) memicu
      disconnect.
- [ ] Validasi payload ketat di setiap handler: cek tipe, panjang, dan bentuk
      sebelum diproses. Tolak properti tak dikenal, jangan sebarkan objek client
      apa adanya ke room.
- [ ] Batasi `MAX_USERS_PER_ROOM` (misalnya 50) dan `MAX_ROOMS` agar satu proses
      tidak dihabiskan memorinya.
- [ ] Validasi `dataUrl`: prefix wajib cocok pola `data:<mime>;base64,`, mime
      harus ada di whitelist, dan panjang base64 harus konsisten dengan `size`
      yang dilaporkan.
- [ ] Sanitasi `username` dan `roomId`: trim, hilangkan karakter kontrol dan
      zero-width, tolak yang tidak cocok pola.

**Client**

- [ ] Render teks pesan sebagai teks biasa lewat React (**jangan pernah pakai
      `dangerouslySetInnerHTML`**).
- [ ] Bila menambahkan auto-link URL, gunakan library linkify yang memasang
      `rel="noopener noreferrer nofollow"` dan `target="_blank"`, serta hanya
      mengizinkan skema `http` dan `https`.
- [ ] Nama file di kartu unduhan di-escape dan dipotong; ekstensi tetap
      ditampilkan agar tidak menutupi ekstensi asli.
- [ ] Tampilkan cooldown di UI saat kena rate limit, jangan hanya diam.

### 5. Hardening Server Tambahan

- [ ] `helmet` pada Express, dan CORS dibatasi ke `CLIENT_ORIGIN` saja
      (tidak `*` di production).
- [ ] Timeout socket idle: putuskan socket yang terhubung tetapi tidak pernah
      join room dalam 60 detik.
- [ ] Error handler global untuk `uncaughtException` dan `unhandledRejection`
      supaya satu payload buruk tidak menjatuhkan seluruh proses.

---

## Acceptance Criteria

1. Mengetik di satu browser memunculkan indikator "sedang mengetik" di browser
   lain, dan indikator hilang sendiri dalam 5 detik meski koneksi diputus paksa.
2. Memilih gambar menampilkan thumbnail preview sebelum dikirim, dan lampiran
   bisa dibatalkan sebelum terkirim.
3. Klik gambar terkirim membuka lightbox yang bisa ditutup dengan Esc.
4. Menggulir ke atas lalu menerima pesan baru tidak memaksa scroll ke bawah;
   tombol "Pesan baru" muncul dan berfungsi.
5. Mematikan server saat room aktif memunculkan banner "Menghubungkan ulang";
   menyalakan server kembali membuat client rejoin otomatis dan kembali bisa
   mengirim pesan tanpa reload manual.
6. Mengirim lebih dari 10 pesan dalam 10 detik memicu pesan rate limit di UI dan
   pesan berlebih tidak sampai ke client lain.
7. Mengirim payload dengan `dataUrl` tidak valid atau `size` palsu ditolak server
   dan tidak muncul di client mana pun.
8. Mengirim teks `<img src=x onerror=alert(1)>` tampil sebagai teks apa adanya,
   tidak dieksekusi sebagai HTML.
9. Kirim 300 pesan berturut-turut: state client memangkas ke 200 pesan terakhir
   dan penggunaan memori tab tetap stabil.
10. Di viewport 375px, daftar user online dapat dibuka lewat drawer dan seluruh
    kontrol utama tetap terjangkau.
11. `npm run typecheck` dan `npm run lint` tetap bersih setelah semua perubahan.

## Di Luar Ruang Lingkup

- Persistensi pesan dalam bentuk apa pun (bertentangan dengan konsep produk)
- Autentikasi akun, room privat berpassword, dan enkripsi end-to-end
- Panggilan suara/video
- Deployment dan CI/CD
