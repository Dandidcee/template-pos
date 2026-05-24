-- ==========================================
-- 13. PELANGGAN, MEMBER & DISKON
-- ==========================================

-- 1. Buat Tabel Pelanggan
CREATE TABLE IF NOT EXISTS pelanggan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama TEXT NOT NULL,
    alamat TEXT,
    nik TEXT,
    no_hp TEXT,
    point NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Pelanggan
ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users on pelanggan" ON pelanggan FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users on pelanggan" ON pelanggan FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users on pelanggan" ON pelanggan FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users on pelanggan" ON pelanggan FOR DELETE USING (true);

-- 2. Tambah Kolom ke Tabel Pengaturan (Member & Diskon)
ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS mode_member_aktif BOOLEAN DEFAULT false;
ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS member_rasio_dapat_poin NUMERIC DEFAULT 1000;
ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS member_bisa_tukar_diskon BOOLEAN DEFAULT false;
ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS member_rasio_tukar_poin NUMERIC DEFAULT 100;
ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS diskon_global_aktif BOOLEAN DEFAULT false;
ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS diskon_global_nama TEXT DEFAULT 'Diskon Spesial';
ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS diskon_global_persen NUMERIC DEFAULT 0;

-- 3. Tambah Kolom ke Tabel Transaksi
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS pelanggan_id UUID REFERENCES pelanggan(id) ON DELETE SET NULL;
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS poin_didapat NUMERIC DEFAULT 0;
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS poin_dipakai NUMERIC DEFAULT 0;
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS diskon_global_rp NUMERIC DEFAULT 0;
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS diskon_poin_rp NUMERIC DEFAULT 0;

-- 4. Supabase RPC untuk memotong poin dengan aman
CREATE OR REPLACE FUNCTION proses_poin_pelanggan(
    p_pelanggan_id UUID,
    p_poin_didapat NUMERIC,
    p_poin_dipakai NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_pelanggan_id IS NOT NULL THEN
        UPDATE pelanggan 
        SET point = point + p_poin_didapat - p_poin_dipakai,
            updated_at = NOW()
        WHERE id = p_pelanggan_id;
    END IF;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
