-- ============================================
-- TABEL: shift_rekap
-- Deskripsi: Menyimpan data rekap tutup shift kasir
-- ============================================

CREATE TABLE IF NOT EXISTS shift_rekap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kasir_id BIGINT,  -- Kasir menggunakan BIGINT, bukan UUID
  nama_kasir TEXT NOT NULL,
  cabang_id UUID,   -- Cabang menggunakan UUID
  nama_cabang TEXT,
  
  -- Waktu shift
  shift_mulai TIMESTAMPTZ NOT NULL,
  shift_selesai TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ringkasan transaksi
  total_transaksi INTEGER DEFAULT 0,
  total_penjualan NUMERIC(15, 2) DEFAULT 0,
  
  -- Detail Tunai
  tunai_count INTEGER DEFAULT 0,
  tunai_total NUMERIC(15, 2) DEFAULT 0,
  tunai_fisik NUMERIC(15, 2) DEFAULT 0,
  tunai_selisih NUMERIC(15, 2) DEFAULT 0,
  
  -- Detail QRIS
  qr_count INTEGER DEFAULT 0,
  qr_total NUMERIC(15, 2) DEFAULT 0,
  qr_fisik NUMERIC(15, 2) DEFAULT 0,
  qr_selisih NUMERIC(15, 2) DEFAULT 0,
  
  -- Detail Transfer
  transfer_count INTEGER DEFAULT 0,
  transfer_total NUMERIC(15, 2) DEFAULT 0,
  transfer_detail JSONB, -- Array of {bank, sistem, fisik, selisih}
  
  -- Total selisih dan catatan
  total_selisih NUMERIC(15, 2) DEFAULT 0,
  catatan TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_shift_rekap_kasir ON shift_rekap(kasir_id);
CREATE INDEX IF NOT EXISTS idx_shift_rekap_cabang ON shift_rekap(cabang_id);
CREATE INDEX IF NOT EXISTS idx_shift_rekap_tanggal ON shift_rekap(shift_selesai);
CREATE INDEX IF NOT EXISTS idx_shift_rekap_created ON shift_rekap(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE shift_rekap ENABLE ROW LEVEL SECURITY;

-- Policy: Semua user yang terautentikasi bisa melihat shift_rekap
CREATE POLICY "Authenticated users can view shift_rekap"
  ON shift_rekap FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Semua user yang terautentikasi bisa insert shift_rekap
CREATE POLICY "Authenticated users can insert shift_rekap"
  ON shift_rekap FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger untuk update updated_at
CREATE OR REPLACE FUNCTION update_shift_rekap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shift_rekap_updated_at
  BEFORE UPDATE ON shift_rekap
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_rekap_updated_at();

-- Komentar tabel
COMMENT ON TABLE shift_rekap IS 'Menyimpan data rekap tutup shift kasir dengan detail per metode pembayaran';
COMMENT ON COLUMN shift_rekap.transfer_detail IS 'JSONB array berisi detail transfer per bank: [{bank, sistem, fisik, selisih}]';
