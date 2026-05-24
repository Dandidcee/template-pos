# 🚀 Panduan Instalasi Template Kasir POS (Zero-VPS Setup)

Selamat datang di Panduan Instalasi Sistem Kasir POS! Aplikasi ini dirancang menggunakan arsitektur modern (React + Supabase Edge Functions) yang memungkinkan Anda **beroperasi tanpa perlu menyewa VPS atau backend server terpisah**.

Semua data dan logika backend akan ditangani secara gratis oleh Supabase, dan website (frontend) bisa Anda hosting di layanan gratis seperti Vercel atau hosting cPanel murah.

Berikut adalah 4 Langkah Mudah untuk menjalankan sistem kasir Anda:

---

## Langkah 1: Setup Database Supabase (Gratis)

Supabase adalah tempat Anda menyimpan semua data kasir, produk, dan transaksi.

1. Buka [Supabase.com](https://supabase.com) dan buat akun gratis.
2. Buat **New Project**. Beri nama "Kasir POS" dan buat password database yang kuat.
3. Tunggu sekitar 2 menit sampai project selesai disiapkan.
4. Pergi ke menu **Project Settings** -> **API**. 
5. Salin dan simpan dua hal ini, Anda akan membutuhkannya di Langkah 3:
   - **Project URL**
   - **Project API Keys (anon / public)**

## Langkah 2: Setup Tabel Database

Kita perlu membuat tabel-tabel (Barang, Transaksi, Pengaturan, dll) di dalam Supabase Anda.

1. Di Supabase, cari menu **SQL Editor** di panel kiri.
2. Buka file `database/INSTALL_DATABASE.sql` dari folder template, lalu *Copy* semua isinya.
3. *Paste* ke dalam layar SQL Editor di Supabase, lalu klik tombol **RUN**.
   *(Semua tabel dan aturan keamanan otomatis dibuat dalam satu kali klik!)*

> 🔑 **Akun Admin Default:**
> Anda bisa langsung login dengan **Username:** `admin` dan **Password:** `admin123`

## Langkah 3: Menjalankan Backend (Edge Functions)

Ini adalah langkah paling sakti! Alih-alih menyewa server Node.js, kita akan melempar kode backend ke dalam Supabase Anda.

1. Pastikan Anda sudah menginstal [Node.js](https://nodejs.org) di komputer Anda.
2. Buka folder template ini menggunakan aplikasi **Terminal** (atau Command Prompt / VS Code Terminal).
3. Ketik perintah berikut untuk login ke Supabase dari komputer Anda:
   ```bash
   npx supabase login
   ```
   *(Browser akan terbuka, ikuti instruksinya untuk memberikan akses)*
4. Hubungkan terminal Anda ke proyek Supabase baru Anda (ganti kode di bawah dengan kode proyek Anda yang ada di URL Supabase):
   ```bash
   npx supabase link --project-ref [KODE_PROJECT_ANDA]
   ```
5. Deploy kedua fungsi sekaligus hanya dengan satu perintah:
   ```bash
   npm run deploy-backend
   ```
   *(Perintah ini akan secara otomatis mengunggah midtrans-create-token dan midtrans-webhook dengan konfigurasi yang tepat)*
   
> [!SUCCESS]
> **Selesai!** Backend Midtrans Anda sekarang sudah berjalan secara live di cloud Supabase tanpa biaya server tambahan.

## Langkah 4: Setup Website (Frontend) & Hosting

Sekarang kita akan menghubungkan kode website dengan Supabase Anda.

1. Di dalam folder template, duplikat file `.env.example` dan ubah namanya menjadi `.env`.
2. Buka file `.env` dan masukkan data dari Supabase (Langkah 1):
   ```env
   VITE_SUPABASE_URL=https://KODE_PROJECT_ANDA.supabase.co
   VITE_SUPABASE_ANON=KODE_ANON_KEY_ANDA
   ```
3. Uji coba jalankan di komputer Anda:
   ```bash
   npm install
   npm run dev
   ```
   Website kasir Anda sudah bisa diakses di `http://localhost:5173`.

### 🌐 Cara Hosting (Online)
Karena website ini hanyalah *statis*, Anda bisa menggunakan **Vercel** secara gratis:
1. Upload folder template ini ke akun GitHub Anda.
2. Buka [Vercel.com](https://vercel.com) dan buat akun.
3. Klik **Add New Project**, lalu pilih repository GitHub Anda tadi.
4. Di bagian *Environment Variables*, masukkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON` persis seperti di file `.env` Anda.
5. Klik **Deploy**! Dalam 1 menit, Kasir POS Anda sudah online dan bisa diakses dari seluruh dunia.

### 🔗 Cara Menyambungkan Domain Hostinger (Atau Layanan Lain) ke Vercel
Jika Anda sudah membeli nama domain (misalnya `tokosaya.com`), Anda bisa langsung menyambungkannya secara gratis:
1. Di *dashboard* Vercel project Anda, masuk ke menu **Settings** > **Domains**.
2. Masukkan nama domain Anda (misal `tokosaya.com`), klik **Add**.
3. Vercel akan memberikan alamat IP (*A Record*) atau *CNAME*.
4. Buka *dashboard* penyedia domain Anda (misal: Hostinger, Niagahoster), cari menu **DNS Management**.
5. Tambahkan *A Record* atau *CNAME* yang diberikan oleh Vercel. Selesai! Tidak perlu sewa hosting bulanan.

---

> [!TIP]
> **Cara Mengaktifkan Pembayaran Midtrans (Otomatis)**
> Setelah aplikasi berjalan:
> 1. Login ke website Kasir Anda sebagai Admin.
> 2. Masuk ke halaman **Pengaturan**.
> 3. Masukkan **Midtrans Server Key** Anda di kolom yang tersedia dan aktifkan Metode Pembayaran Midtrans.
> 4. Di Dashboard Midtrans Anda (midtrans.com), atur **Notification URL** ke:  
>    `https://[KODE_PROJECT_ANDA].supabase.co/functions/v1/midtrans-webhook`

---

## Fitur Tambahan (Opsional)

Aplikasi ini dilengkapi dengan fitur premium yang bisa Anda aktifkan kapan saja melalui menu **Pengaturan** (Login sebagai Admin):

- 🏬 **Mode Multi-Cabang:** Aktifkan jika toko Anda memiliki lebih dari satu cabang. Anda bisa menambah kasir khusus untuk cabang tertentu.
- 👥 **Sistem Member (Loyalitas):** Berikan poin setiap kali pelanggan berbelanja. Poin ini bisa dikumpulkan dan ditukar dengan diskon langsung di Kasir.
- 🎉 **Diskon Global:** Buat event diskon (misal: "Diskon Kemerdekaan 10%") yang otomatis memotong harga semua transaksi.
- 📱 **QRIS Manual:** Unggah gambar QRIS statis Anda agar bisa discan langsung oleh pelanggan di layar kasir jika Anda tidak menggunakan Midtrans.
