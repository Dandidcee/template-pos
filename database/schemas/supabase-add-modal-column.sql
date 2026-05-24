-- ============================================
-- SQL Command untuk Menambahkan Kolom Modal
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Tambah kolom modal (harga beli/modal) ke tabel barang
ALTER TABLE barang 
ADD COLUMN IF NOT EXISTS modal numeric DEFAULT 0;

-- 2. Tambah comment untuk dokumentasi
COMMENT ON COLUMN barang.modal IS 'Harga modal/beli produk (hanya untuk admin, tidak tampil di kasir/struk)';

-- 3. Update existing data dengan modal 0 (opsional, bisa diisi manual nanti)
UPDATE barang 
SET modal = 0 
WHERE modal IS NULL;

-- 4. Verifikasi kolom sudah ditambahkan
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'barang' AND column_name = 'modal';

-- ============================================
-- SELESAI
-- ============================================
-- Kolom 'modal' sekarang tersedia di tabel barang
-- Admin dapat mengisi harga modal saat menambah/edit produk
-- Harga modal tidak akan tampil di kasir atau struk
-- Akan digunakan untuk laporan keuntungan kotor
-- ============================================
