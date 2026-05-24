# 🏪 Sistem Kasir POS - Toko Senin

Aplikasi Point of Sale (POS) modern dengan sistem multi-cabang, manajemen kasir, dan fitur keamanan lengkap.

![React](https://img.shields.io/badge/React-18.3-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)
![Security](https://img.shields.io/badge/Security-85%2F100-brightgreen)

## ✨ Fitur Utama

### 🔐 Keamanan
- **Row Level Security (RLS)** - Isolasi data per cabang
- **Password Hashing** - Bcrypt dengan cost factor 10
- **Audit Log** - Tracking semua perubahan data
- **Rate Limiting** - Mencegah brute force attacks
- **Input Validation & Sanitization** - Mencegah XSS dan SQL injection
- **Role-Based Access Control** - Admin vs Kasir

### 🏢 Multi-Cabang
- Sistem cabang dengan isolasi data
- Setiap cabang punya nama toko sendiri
- Kasir hanya akses data cabangnya
- Admin bisa akses semua cabang

### 💰 Transaksi
- Kasir dengan multiple items
- Metode pembayaran: Tunai, QRIS, Transfer Bank
- Struk digital dengan preview dan cetak
- Riwayat transaksi lengkap
- Filter berdasarkan periode dan cabang

### 📦 Manajemen Stok
- CRUD produk (admin only)
- Tracking stok otomatis
- Harga modal untuk perhitungan keuntungan
- Filter per cabang

### 📊 Laporan
- Laporan penjualan dengan filter periode
- Laporan keuntungan (admin only)
- Download PDF untuk semua laporan
- KPI cards: Total penjualan, modal, keuntungan, margin

### 👥 Manajemen Kasir
- CRUD kasir (admin only)
- Role: Admin dan Kasir
- Assignment ke cabang
- Reset password (admin)

### 🏦 Manajemen Bank
- CRUD rekening bank
- Toggle aktif/nonaktif
- Dropdown bank di kasir

### ⏰ Shift Management
- Mulai shift dan tutup shift
- Rekap shift dengan input saldo bank
- Ringkasan transaksi per shift
- Catatan shift

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm atau yarn
- Akun Supabase

### Installation

1. **Clone repository**
```bash
git clone https://github.com/Dandidcee/Kasir-Pos.git
cd Kasir-Pos
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` dan isi dengan credentials Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON=your-anon-key
```

4. **Setup database**

Jalankan SQL files berikut di Supabase SQL Editor (urutan penting):

```sql
-- 1. Setup tabel dasar (jika belum ada)
-- Buat tabel: kasir, cabang, barang, transaksi

-- 2. Setup keamanan (WAJIB)
-- File: supabase-security-setup.sql

-- 3. Setup password hashing (SANGAT DIREKOMENDASIKAN)
-- File: supabase-password-hashing.sql

-- 4. Setup fitur tambahan
-- File: supabase-add-modal-column.sql
-- File: supabase-bank-account.sql
-- File: supabase-add-nama-toko.sql
```

5. **Run development server**
```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## 📁 Struktur Project

```
├── src/
│   ├── components/          # React components
│   │   ├── KasirPage.jsx   # Halaman kasir utama
│   │   ├── TopNav.jsx      # Navigation bar
│   │   ├── SideNav.jsx     # Sidebar navigation
│   │   ├── BottomNav.jsx   # Mobile bottom nav
│   │   ├── ReceiptModal.jsx # Modal struk
│   │   └── TutupShiftModal.jsx # Modal tutup shift
│   ├── pages/              # Page components
│   │   ├── LoginPage.jsx
│   │   ├── RiwayatPage.jsx
│   │   ├── StokPage.jsx
│   │   ├── LaporanPage.jsx
│   │   ├── LaporanKeuntunganPage.jsx
│   │   ├── ManajemenKasirPage.jsx
│   │   └── ManajemenBankPage.jsx
│   ├── context/            # React context
│   │   └── AuthContext.jsx
│   ├── lib/                # Libraries
│   │   ├── supabase.js     # Supabase client
│   │   └── secureSupabase.js # Secure wrapper
│   ├── services/           # API services
│   │   └── productService.js
│   └── hooks/              # Custom hooks
│       └── useProducts.js
├── supabase-*.sql          # Database setup files
├── SECURITY*.md            # Security documentation
└── README.md
```

## 🔒 Security

Aplikasi ini dilengkapi dengan sistem keamanan yang komprehensif:

- **Security Score: 85/100** (Production Ready)
- Row Level Security (RLS) untuk semua tabel
- Password hashing dengan bcrypt
- Audit log untuk tracking perubahan
- Rate limiting untuk mencegah brute force
- Input validation dan sanitization

**Dokumentasi Keamanan:**
- [`README-SECURITY.md`](./README-SECURITY.md) - Quick reference
- [`SECURITY-QUICKSTART.md`](./SECURITY-QUICKSTART.md) - Implementation guide
- [`SECURITY.md`](./SECURITY.md) - Comprehensive documentation
- [`SECURITY-CODE-EXAMPLES.md`](./SECURITY-CODE-EXAMPLES.md) - Code examples

## 📖 Dokumentasi

### Fitur
- [`FITUR-MODAL.md`](./FITUR-MODAL.md) - Fitur modal/harga beli
- [`FITUR-SHIFT-REKAP.md`](./FITUR-SHIFT-REKAP.md) - Fitur shift management
- [`LAPORAN-KEUNTUNGAN.md`](./LAPORAN-KEUNTUNGAN.md) - Laporan keuntungan

### Testing
- [`TEST-CHECKLIST.md`](./TEST-CHECKLIST.md) - Testing checklist

### Security
- [`SECURITY.md`](./SECURITY.md) - Security documentation
- [`SECURITY-QUICKSTART.md`](./SECURITY-QUICKSTART.md) - Quick start guide
- [`SECURITY-CODE-EXAMPLES.md`](./SECURITY-CODE-EXAMPLES.md) - Code examples
- [`SECURITY-IMPLEMENTATION-SUMMARY.md`](./SECURITY-IMPLEMENTATION-SUMMARY.md) - Implementation summary

## 🛠️ Tech Stack

- **Frontend:** React 18.3, Vite 6.0
- **Styling:** TailwindCSS 3.4, Material Icons
- **Database:** Supabase (PostgreSQL)
- **PDF Generation:** jsPDF, jsPDF-AutoTable
- **Authentication:** Custom auth dengan Supabase
- **State Management:** React Context API

## 👥 User Roles

### Admin
- Akses semua data (semua cabang)
- CRUD kasir, produk, bank
- Lihat laporan keuntungan
- Download PDF reports
- Reset password kasir
- Lihat audit log

### Kasir
- Akses data cabang sendiri saja
- Buat transaksi
- Lihat riwayat transaksi
- Lihat stok produk
- Mulai/tutup shift
- Tidak bisa edit produk
- Tidak bisa lihat modal/keuntungan

## 🚀 Deployment

### Build untuk production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

### Deploy ke hosting
Aplikasi ini bisa di-deploy ke:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

**Jangan lupa:**
1. Set environment variables di hosting
2. Enable HTTPS
3. Configure CORS di Supabase
4. Run security setup SQL di production database

## 🔧 Configuration

### Supabase Setup

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL files di SQL Editor
3. Copy URL dan Anon Key ke `.env`
4. Enable RLS untuk semua tabel
5. Configure CORS jika perlu

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON=your-anon-key


```

## 🐛 Troubleshooting

### Login gagal setelah implement password hashing
```sql
-- Reset password di Supabase SQL Editor
UPDATE kasir 
SET password = crypt('password_baru', gen_salt('bf', 10))
WHERE username = 'username';
```

### RLS terlalu ketat
```sql
-- Cek policies
SELECT * FROM pg_policies WHERE tablename = 'nama_tabel';
```

### Build error
```bash
# Clear cache dan reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

Jika menemukan bug atau punya pertanyaan:
1. Buka issue di GitHub
2. Sertakan detail error dan langkah reproduksi
3. Screenshot jika memungkinkan

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [TailwindCSS](https://tailwindcss.com) - CSS Framework
- [Material Icons](https://fonts.google.com/icons) - Icon library
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation

---

**Version:** 1.0.0  
**Last Updated:** 2026-05-13  
**Status:** ✅ Production Ready
