-- ============================================
-- SUPABASE SECURITY SETUP
-- Implementasi keamanan lengkap untuk semua tabel
-- Jalankan di Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS) UNTUK SEMUA TABEL
-- ============================================

-- Enable RLS untuk tabel utama
ALTER TABLE kasir ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_rekap ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (jika ada yang terlalu permisif)
-- ============================================

-- Drop policies yang terlalu permisif
DROP POLICY IF EXISTS "Allow anon read bank_account" ON bank_account;
DROP POLICY IF EXISTS "Allow anon insert bank_account" ON bank_account;
DROP POLICY IF EXISTS "Allow anon all shift_rekap" ON shift_rekap;

-- ============================================
-- 3. BUAT FUNCTION UNTUK AUTENTIKASI
-- ============================================

-- Function untuk mendapatkan kasir_id dari JWT atau session
CREATE OR REPLACE FUNCTION auth.kasir_id() 
RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'kasir_id',
    current_setting('app.kasir_id', true)
  );
$$ LANGUAGE sql STABLE;

-- Function untuk cek apakah user adalah admin
CREATE OR REPLACE FUNCTION auth.is_admin() 
RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'admin',
    (current_setting('app.role', true)) = 'admin',
    false
  );
$$ LANGUAGE sql STABLE;

-- Function untuk mendapatkan cabang_id kasir
CREATE OR REPLACE FUNCTION auth.kasir_cabang_id() 
RETURNS uuid AS $$
  SELECT cabang_id FROM kasir 
  WHERE id = auth.kasir_id()::text
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================
-- 4. POLICIES UNTUK TABEL KASIR
-- ============================================

-- Kasir hanya bisa melihat data diri sendiri, admin bisa lihat semua
CREATE POLICY "kasir_select_policy" ON kasir
  FOR SELECT
  USING (
    auth.is_admin() OR 
    id = auth.kasir_id()
  );

-- Hanya admin yang bisa insert kasir baru
CREATE POLICY "kasir_insert_policy" ON kasir
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Hanya admin yang bisa update kasir
CREATE POLICY "kasir_update_policy" ON kasir
  FOR UPDATE
  USING (auth.is_admin());

-- Hanya admin yang bisa delete kasir
CREATE POLICY "kasir_delete_policy" ON kasir
  FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- 5. POLICIES UNTUK TABEL CABANG
-- ============================================

-- Semua kasir bisa melihat data cabang (untuk dropdown)
CREATE POLICY "cabang_select_policy" ON cabang
  FOR SELECT
  USING (true);

-- Hanya admin yang bisa insert cabang
CREATE POLICY "cabang_insert_policy" ON cabang
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Hanya admin yang bisa update cabang
CREATE POLICY "cabang_update_policy" ON cabang
  FOR UPDATE
  USING (auth.is_admin());

-- Hanya admin yang bisa delete cabang
CREATE POLICY "cabang_delete_policy" ON cabang
  FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- 6. POLICIES UNTUK TABEL BARANG
-- ============================================

-- Kasir hanya bisa lihat barang di cabangnya, admin bisa lihat semua
CREATE POLICY "barang_select_policy" ON barang
  FOR SELECT
  USING (
    auth.is_admin() OR 
    cabang_id = auth.kasir_cabang_id()
  );

-- Hanya admin yang bisa insert barang
CREATE POLICY "barang_insert_policy" ON barang
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Hanya admin yang bisa update barang
CREATE POLICY "barang_update_policy" ON barang
  FOR UPDATE
  USING (auth.is_admin());

-- Hanya admin yang bisa delete barang
CREATE POLICY "barang_delete_policy" ON barang
  FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- 7. POLICIES UNTUK TABEL TRANSAKSI
-- ============================================

-- Kasir hanya bisa lihat transaksi di cabangnya, admin bisa lihat semua
CREATE POLICY "transaksi_select_policy" ON transaksi
  FOR SELECT
  USING (
    auth.is_admin() OR 
    cabang_id = auth.kasir_cabang_id()
  );

-- Kasir hanya bisa insert transaksi untuk cabangnya sendiri
CREATE POLICY "transaksi_insert_policy" ON transaksi
  FOR INSERT
  WITH CHECK (
    auth.is_admin() OR 
    cabang_id = auth.kasir_cabang_id()
  );

-- Tidak ada yang bisa update transaksi (immutable)
CREATE POLICY "transaksi_update_policy" ON transaksi
  FOR UPDATE
  USING (false);

-- Hanya admin yang bisa delete transaksi (untuk koreksi)
CREATE POLICY "transaksi_delete_policy" ON transaksi
  FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- 8. POLICIES UNTUK TABEL BANK_ACCOUNT
-- ============================================

-- Semua kasir bisa melihat bank aktif (untuk dropdown)
CREATE POLICY "bank_select_policy" ON bank_account
  FOR SELECT
  USING (aktif = true OR auth.is_admin());

-- Hanya admin yang bisa insert bank
CREATE POLICY "bank_insert_policy" ON bank_account
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Hanya admin yang bisa update bank
CREATE POLICY "bank_update_policy" ON bank_account
  FOR UPDATE
  USING (auth.is_admin());

-- Hanya admin yang bisa delete bank
CREATE POLICY "bank_delete_policy" ON bank_account
  FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- 9. POLICIES UNTUK TABEL SHIFT_REKAP
-- ============================================

-- Kasir hanya bisa lihat rekap shift sendiri, admin bisa lihat semua
CREATE POLICY "shift_select_policy" ON shift_rekap
  FOR SELECT
  USING (
    auth.is_admin() OR 
    kasir_id = auth.kasir_id()
  );

-- Kasir hanya bisa insert rekap shift sendiri
CREATE POLICY "shift_insert_policy" ON shift_rekap
  FOR INSERT
  WITH CHECK (
    kasir_id = auth.kasir_id() OR 
    auth.is_admin()
  );

-- Tidak ada yang bisa update shift_rekap (immutable)
CREATE POLICY "shift_update_policy" ON shift_rekap
  FOR UPDATE
  USING (false);

-- Hanya admin yang bisa delete shift_rekap
CREATE POLICY "shift_delete_policy" ON shift_rekap
  FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- 10. BUAT TABEL AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL, -- INSERT, UPDATE, DELETE
  record_id text,
  old_data jsonb,
  new_data jsonb,
  kasir_id text,
  kasir_role text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS untuk audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Hanya admin yang bisa melihat audit log
CREATE POLICY "audit_select_policy" ON audit_log
  FOR SELECT
  USING (auth.is_admin());

-- Sistem bisa insert audit log (via trigger)
CREATE POLICY "audit_insert_policy" ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- Tidak ada yang bisa update atau delete audit log
CREATE POLICY "audit_update_policy" ON audit_log
  FOR UPDATE
  USING (false);

CREATE POLICY "audit_delete_policy" ON audit_log
  FOR DELETE
  USING (false);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_kasir_id ON audit_log(kasir_id);

-- ============================================
-- 11. TRIGGER FUNCTION UNTUK AUDIT LOG
-- ============================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    operation,
    record_id,
    old_data,
    new_data,
    kasir_id,
    kasir_role,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE 
      WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)
      ELSE NULL
    END,
    CASE 
      WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)
      ELSE NULL
    END,
    auth.kasir_id(),
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'role',
      current_setting('app.role', true)
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. ATTACH TRIGGERS KE TABEL PENTING
-- ============================================

-- Trigger untuk tabel kasir
DROP TRIGGER IF EXISTS kasir_audit_trigger ON kasir;
CREATE TRIGGER kasir_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON kasir
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Trigger untuk tabel barang
DROP TRIGGER IF EXISTS barang_audit_trigger ON barang;
CREATE TRIGGER barang_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON barang
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Trigger untuk tabel transaksi
DROP TRIGGER IF EXISTS transaksi_audit_trigger ON transaksi;
CREATE TRIGGER transaksi_audit_trigger
  AFTER INSERT OR DELETE ON transaksi
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Trigger untuk tabel bank_account
DROP TRIGGER IF EXISTS bank_audit_trigger ON bank_account;
CREATE TRIGGER bank_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bank_account
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================
-- 13. VALIDASI DATA - CONSTRAINTS
-- ============================================

-- Validasi harga tidak boleh negatif
ALTER TABLE barang 
  ADD CONSTRAINT barang_harga_positive CHECK (harga >= 0),
  ADD CONSTRAINT barang_modal_positive CHECK (modal >= 0),
  ADD CONSTRAINT barang_stok_not_negative CHECK (stok >= 0 OR stok IS NULL);

-- Validasi transaksi
ALTER TABLE transaksi
  ADD CONSTRAINT transaksi_total_positive CHECK (total_harga > 0),
  ADD CONSTRAINT transaksi_qty_positive CHECK (qty > 0);

-- Validasi metode pembayaran
ALTER TABLE transaksi
  ADD CONSTRAINT transaksi_metode_valid 
  CHECK (metode_pembayaran IN ('tunai', 'qr', 'transfer'));

-- ============================================
-- 14. FUNCTION UNTUK VALIDASI PASSWORD
-- ============================================

CREATE OR REPLACE FUNCTION validate_password_strength(password text)
RETURNS boolean AS $$
BEGIN
  -- Password minimal 6 karakter
  IF length(password) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 15. FUNCTION UNTUK HASH PASSWORD (jika belum ada)
-- ============================================

-- CATATAN: Ini contoh sederhana. Untuk production, gunakan bcrypt atau argon2
-- Supabase Auth sudah handle ini, tapi jika pakai custom auth:

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_password(password text, hash text)
RETURNS boolean AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. RATE LIMITING - FUNCTION
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address atau kasir_id
  action text NOT NULL, -- 'login', 'transaction', etc
  attempt_count integer DEFAULT 1,
  first_attempt timestamptz DEFAULT now(),
  last_attempt timestamptz DEFAULT now(),
  blocked_until timestamptz,
  UNIQUE(identifier, action)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit(identifier, action);

-- Function untuk cek rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean AS $$
DECLARE
  v_record rate_limit%ROWTYPE;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Cek apakah ada record
  SELECT * INTO v_record
  FROM rate_limit
  WHERE identifier = p_identifier 
    AND action = p_action
  FOR UPDATE;
  
  -- Jika blocked, cek apakah masih dalam periode block
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > now() THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan. Coba lagi dalam % menit', 
      EXTRACT(EPOCH FROM (v_record.blocked_until - now())) / 60;
  END IF;
  
  -- Jika tidak ada record atau sudah lewat window, reset
  IF v_record IS NULL OR v_record.first_attempt < v_window_start THEN
    INSERT INTO rate_limit (identifier, action, attempt_count, first_attempt, last_attempt)
    VALUES (p_identifier, p_action, 1, now(), now())
    ON CONFLICT (identifier, action) 
    DO UPDATE SET 
      attempt_count = 1,
      first_attempt = now(),
      last_attempt = now(),
      blocked_until = NULL;
    RETURN true;
  END IF;
  
  -- Increment attempt
  UPDATE rate_limit
  SET 
    attempt_count = attempt_count + 1,
    last_attempt = now(),
    blocked_until = CASE 
      WHEN attempt_count + 1 >= p_max_attempts 
      THEN now() + (p_window_minutes || ' minutes')::interval
      ELSE NULL
    END
  WHERE identifier = p_identifier AND action = p_action;
  
  -- Cek apakah sudah melebihi limit
  IF v_record.attempt_count + 1 >= p_max_attempts THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan. Coba lagi dalam % menit', p_window_minutes;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 17. INDEXES UNTUK PERFORMA
-- ============================================

-- Index untuk tabel kasir
CREATE INDEX IF NOT EXISTS idx_kasir_username ON kasir(username);
CREATE INDEX IF NOT EXISTS idx_kasir_cabang_id ON kasir(cabang_id);

-- Index untuk tabel barang
CREATE INDEX IF NOT EXISTS idx_barang_cabang_id ON barang(cabang_id);
CREATE INDEX IF NOT EXISTS idx_barang_nama ON barang(nama_barang);

-- Index untuk tabel transaksi
CREATE INDEX IF NOT EXISTS idx_transaksi_cabang_id ON transaksi(cabang_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_created_at ON transaksi(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_order_number ON transaksi(order_number);
CREATE INDEX IF NOT EXISTS idx_transaksi_nama_kasir ON transaksi(nama_kasir);

-- Index untuk tabel shift_rekap
CREATE INDEX IF NOT EXISTS idx_shift_kasir_id ON shift_rekap(kasir_id);
CREATE INDEX IF NOT EXISTS idx_shift_cabang_id ON shift_rekap(cabang_id);
CREATE INDEX IF NOT EXISTS idx_shift_created_at ON shift_rekap(created_at DESC);

-- ============================================
-- 18. VERIFIKASI SETUP
-- ============================================

-- Cek RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('kasir', 'cabang', 'barang', 'transaksi', 'bank_account', 'shift_rekap', 'audit_log')
ORDER BY tablename;

-- Cek policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- SELESAI
-- ============================================
-- Security setup lengkap sudah diterapkan:
-- ✅ Row Level Security (RLS) untuk semua tabel
-- ✅ Policies berdasarkan role (admin vs kasir)
-- ✅ Audit log untuk tracking perubahan
-- ✅ Data validation constraints
-- ✅ Rate limiting function
-- ✅ Password hashing functions
-- ✅ Performance indexes
-- 
-- CATATAN PENTING:
-- 1. Untuk menggunakan RLS, aplikasi harus set session variables:
--    SET app.kasir_id = 'xxx';
--    SET app.role = 'admin' atau 'kasir';
-- 
-- 2. Atau gunakan Supabase Auth dengan JWT claims
-- 
-- 3. Rate limiting perlu dipanggil manual di aplikasi
-- 
-- 4. Audit log otomatis via triggers
-- ============================================
