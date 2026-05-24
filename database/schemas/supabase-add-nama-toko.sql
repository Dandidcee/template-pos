-- ============================================
-- SQL Command untuk Menambahkan Nama Toko di Tabel Cabang
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Tambah kolom nama_toko ke tabel cabang
ALTER TABLE cabang 
ADD COLUMN IF NOT EXISTS nama_toko text DEFAULT 'Toko Senin';

-- 2. Tambah comment untuk dokumentasi
COMMENT ON COLUMN cabang.nama_toko IS 'Nama toko yang ditampilkan di aplikasi dan struk';

-- 3. Update data existing dengan nama toko default
UPDATE cabang 
SET nama_toko = 'Toko Senin' 
WHERE nama_toko IS NULL;

-- 4. Verifikasi kolom sudah ditambahkan
SELECT id, nama, alamat, nama_toko FROM cabang;

-- ============================================
-- SELESAI
-- ============================================
-- Kolom nama_toko sudah ditambahkan ke tabel cabang
-- Setiap cabang bisa punya nama toko sendiri
-- Nama toko akan tampil di struk dan aplikasi
-- ============================================
