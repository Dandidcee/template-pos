-- ============================================
-- SQL Command untuk Tabel Bank Account & Shift Rekap
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Buat tabel bank_account
CREATE TABLE IF NOT EXISTS bank_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_bank text NOT NULL,
  nomor_rekening text,
  atas_nama text,
  aktif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Tambah comment untuk dokumentasi
COMMENT ON TABLE bank_account IS 'Daftar rekening bank yang digunakan untuk transaksi';
COMMENT ON COLUMN bank_account.nama_bank IS 'Nama bank (BCA, Mandiri, BRI, dll)';
COMMENT ON COLUMN bank_account.nomor_rekening IS 'Nomor rekening bank';
COMMENT ON COLUMN bank_account.atas_nama IS 'Nama pemilik rekening';
COMMENT ON COLUMN bank_account.aktif IS 'Status aktif/nonaktif bank';

-- 3. Insert data bank default
INSERT INTO bank_account (nama_bank, nomor_rekening, atas_nama, aktif) VALUES
('BCA', '1234567890', 'Toko Senin', true),
('Mandiri', '0987654321', 'Toko Senin', true),
('BRI', '1122334455', 'Toko Senin', true),
('BNI', '5544332211', 'Toko Senin', true),
('CIMB Niaga', '6677889900', 'Toko Senin', true),
('Permata', '9988776655', 'Toko Senin', true);

-- 4. Buat tabel shift_rekap untuk menyimpan rekap tutup shift
CREATE TABLE IF NOT EXISTS shift_rekap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kasir_id text,
  nama_kasir text NOT NULL,
  cabang_id uuid REFERENCES cabang(id),
  nama_cabang text,
  shift_mulai timestamptz NOT NULL,
  shift_selesai timestamptz DEFAULT now(),
  
  -- Transaksi
  total_transaksi integer DEFAULT 0,
  total_penjualan numeric DEFAULT 0,
  
  -- Tunai
  tunai_count integer DEFAULT 0,
  tunai_total numeric DEFAULT 0,
  tunai_fisik numeric DEFAULT 0,
  tunai_selisih numeric DEFAULT 0,
  
  -- QRIS
  qr_count integer DEFAULT 0,
  qr_total numeric DEFAULT 0,
  qr_fisik numeric DEFAULT 0,
  qr_selisih numeric DEFAULT 0,
  
  -- Transfer
  transfer_count integer DEFAULT 0,
  transfer_total numeric DEFAULT 0,
  transfer_detail jsonb DEFAULT '[]'::jsonb,
  
  -- Total Selisih
  total_selisih numeric DEFAULT 0,
  
  -- Catatan
  catatan text,
  
  created_at timestamptz DEFAULT now()
);

-- 5. Tambah comment untuk dokumentasi
COMMENT ON TABLE shift_rekap IS 'Rekap shift kasir (tutup shift)';
COMMENT ON COLUMN shift_rekap.shift_mulai IS 'Waktu mulai shift (login)';
COMMENT ON COLUMN shift_rekap.shift_selesai IS 'Waktu selesai shift (tutup shift)';
COMMENT ON COLUMN shift_rekap.tunai_fisik IS 'Jumlah uang tunai fisik yang dihitung';
COMMENT ON COLUMN shift_rekap.tunai_selisih IS 'Selisih tunai (fisik - sistem)';
COMMENT ON COLUMN shift_rekap.qr_fisik IS 'Saldo QRIS saat tutup shift';
COMMENT ON COLUMN shift_rekap.qr_selisih IS 'Selisih QRIS (fisik - sistem)';
COMMENT ON COLUMN shift_rekap.transfer_detail IS 'Detail transfer per bank: [{bank, sistem, fisik, selisih}]';
COMMENT ON COLUMN shift_rekap.total_selisih IS 'Total selisih semua metode pembayaran';

-- 6. Izinkan akses anonim (sesuaikan dengan kebutuhan security)
ALTER TABLE bank_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read bank_account" ON bank_account FOR SELECT USING (true);
CREATE POLICY "Allow anon insert bank_account" ON bank_account FOR INSERT WITH CHECK (true);

ALTER TABLE shift_rekap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all shift_rekap" ON shift_rekap FOR ALL USING (true);

-- 7. Verifikasi tabel sudah dibuat
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('bank_account', 'shift_rekap')
ORDER BY table_name, ordinal_position;

-- ============================================
-- SELESAI
-- ============================================
-- Tabel bank_account dan shift_rekap sudah siap
-- Dropdown bank akan mengambil data dari bank_account
-- Rekap shift akan disimpan di shift_rekap
-- ============================================
