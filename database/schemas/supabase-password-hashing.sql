-- ============================================
-- PASSWORD HASHING IMPLEMENTATION
-- Implementasi password hashing yang aman
-- Jalankan di Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENABLE PGCRYPTO EXTENSION
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 2. FUNCTION UNTUK HASH PASSWORD
-- ============================================

-- Hash password menggunakan bcrypt (cost factor 10)
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  -- Validasi password minimal 6 karakter
  IF length(password) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter';
  END IF;
  
  -- Hash dengan bcrypt
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNCTION UNTUK VERIFY PASSWORD
-- ============================================

CREATE OR REPLACE FUNCTION verify_password(password text, hash text)
RETURNS boolean AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCTION UNTUK SECURE LOGIN
-- ============================================

CREATE OR REPLACE FUNCTION secure_login(
  p_username text,
  p_password text,
  p_ip_address inet DEFAULT NULL
)
RETURNS TABLE (
  kasir_data jsonb,
  success boolean,
  message text
) AS $$
DECLARE
  v_kasir record;
  v_rate_limit_ok boolean;
BEGIN
  -- Rate limiting check
  BEGIN
    SELECT check_rate_limit(
      COALESCE(p_ip_address::text, p_username),
      'login',
      5,  -- max 5 attempts
      15  -- dalam 15 menit
    ) INTO v_rate_limit_ok;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      NULL::jsonb,
      false,
      SQLERRM;
    RETURN;
  END;
  
  -- Cari kasir berdasarkan username
  SELECT * INTO v_kasir
  FROM kasir
  WHERE username = p_username;
  
  -- Jika kasir tidak ditemukan
  IF v_kasir IS NULL THEN
    RETURN QUERY SELECT 
      NULL::jsonb,
      false,
      'Username atau Password salah!'::text;
    RETURN;
  END IF;
  
  -- Verify password
  IF NOT verify_password(p_password, v_kasir.password) THEN
    RETURN QUERY SELECT 
      NULL::jsonb,
      false,
      'Username atau Password salah!'::text;
    RETURN;
  END IF;
  
  -- Login berhasil - ambil data lengkap dengan cabang
  SELECT row_to_json(k.*) INTO v_kasir
  FROM (
    SELECT 
      kasir.*,
      row_to_json(cabang.*) as cabang
    FROM kasir
    LEFT JOIN cabang ON kasir.cabang_id = cabang.id
    WHERE kasir.username = p_username
  ) k;
  
  -- Reset rate limit untuk user ini
  DELETE FROM rate_limit 
  WHERE identifier = COALESCE(p_ip_address::text, p_username)
    AND action = 'login';
  
  RETURN QUERY SELECT 
    v_kasir::jsonb,
    true,
    'Login berhasil'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCTION UNTUK CHANGE PASSWORD
-- ============================================

CREATE OR REPLACE FUNCTION change_password(
  p_kasir_id text,
  p_old_password text,
  p_new_password text
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  v_kasir record;
BEGIN
  -- Ambil data kasir
  SELECT * INTO v_kasir
  FROM kasir
  WHERE id = p_kasir_id;
  
  IF v_kasir IS NULL THEN
    RETURN QUERY SELECT false, 'Kasir tidak ditemukan'::text;
    RETURN;
  END IF;
  
  -- Verify old password
  IF NOT verify_password(p_old_password, v_kasir.password) THEN
    RETURN QUERY SELECT false, 'Password lama salah'::text;
    RETURN;
  END IF;
  
  -- Validasi new password
  IF length(p_new_password) < 6 THEN
    RETURN QUERY SELECT false, 'Password baru minimal 6 karakter'::text;
    RETURN;
  END IF;
  
  -- Update password
  UPDATE kasir
  SET password = hash_password(p_new_password)
  WHERE id = p_kasir_id;
  
  RETURN QUERY SELECT true, 'Password berhasil diubah'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCTION UNTUK RESET PASSWORD (ADMIN ONLY)
-- ============================================

CREATE OR REPLACE FUNCTION admin_reset_password(
  p_admin_id text,
  p_kasir_id text,
  p_new_password text
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  v_admin record;
BEGIN
  -- Verify admin
  SELECT * INTO v_admin
  FROM kasir
  WHERE id = p_admin_id AND role = 'admin';
  
  IF v_admin IS NULL THEN
    RETURN QUERY SELECT false, 'Akses ditolak: Hanya admin yang bisa reset password'::text;
    RETURN;
  END IF;
  
  -- Validasi new password
  IF length(p_new_password) < 6 THEN
    RETURN QUERY SELECT false, 'Password baru minimal 6 karakter'::text;
    RETURN;
  END IF;
  
  -- Update password
  UPDATE kasir
  SET password = hash_password(p_new_password)
  WHERE id = p_kasir_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Kasir tidak ditemukan'::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Password berhasil direset'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. MIGRATE EXISTING PASSWORDS
-- ============================================

-- PERINGATAN: Ini akan hash semua password yang ada
-- Jalankan hanya sekali saat pertama kali setup
-- Setelah ini, password lama tidak akan bisa digunakan

-- Uncomment dan jalankan jika ingin migrate existing passwords
/*
DO $$
DECLARE
  v_kasir record;
BEGIN
  FOR v_kasir IN SELECT id, password FROM kasir LOOP
    -- Cek apakah password sudah di-hash (bcrypt hash dimulai dengan $2)
    IF NOT v_kasir.password LIKE '$2%' THEN
      -- Hash password yang masih plain text
      UPDATE kasir
      SET password = hash_password(v_kasir.password)
      WHERE id = v_kasir.id;
      
      RAISE NOTICE 'Password di-hash untuk kasir ID: %', v_kasir.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration selesai!';
END $$;
*/

-- ============================================
-- 8. TRIGGER UNTUK AUTO-HASH PASSWORD BARU
-- ============================================

-- Function untuk trigger
CREATE OR REPLACE FUNCTION auto_hash_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Jika password diubah dan belum di-hash
  IF NEW.password IS DISTINCT FROM OLD.password THEN
    -- Cek apakah password sudah di-hash
    IF NOT NEW.password LIKE '$2%' THEN
      NEW.password := hash_password(NEW.password);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger ke tabel kasir
DROP TRIGGER IF EXISTS kasir_hash_password_trigger ON kasir;
CREATE TRIGGER kasir_hash_password_trigger
  BEFORE INSERT OR UPDATE OF password ON kasir
  FOR EACH ROW
  EXECUTE FUNCTION auto_hash_password();

-- ============================================
-- 9. TESTING
-- ============================================

-- Test hash password
SELECT hash_password('test123');

-- Test verify password
SELECT verify_password('test123', hash_password('test123')) as should_be_true;
SELECT verify_password('wrong', hash_password('test123')) as should_be_false;

-- Test secure login (ganti dengan username yang ada)
-- SELECT * FROM secure_login('admin', 'password123', '127.0.0.1'::inet);

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

-- Grant execute permission untuk functions
GRANT EXECUTE ON FUNCTION hash_password(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION verify_password(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION secure_login(text, text, inet) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION change_password(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION admin_reset_password(text, text, text) TO authenticated, anon;

-- ============================================
-- SELESAI
-- ============================================
-- Password hashing sudah diimplementasi:
-- ✅ Function hash_password() untuk hash password baru
-- ✅ Function verify_password() untuk verify login
-- ✅ Function secure_login() untuk login yang aman
-- ✅ Function change_password() untuk ganti password
-- ✅ Function admin_reset_password() untuk reset password
-- ✅ Trigger auto-hash untuk password baru
-- 
-- CARA MENGGUNAKAN:
-- 
-- 1. Login (dari aplikasi):
--    SELECT * FROM secure_login('username', 'password', '127.0.0.1'::inet);
-- 
-- 2. Ganti password:
--    SELECT * FROM change_password('kasir_id', 'old_pass', 'new_pass');
-- 
-- 3. Reset password (admin):
--    SELECT * FROM admin_reset_password('admin_id', 'kasir_id', 'new_pass');
-- 
-- 4. Tambah kasir baru (password akan auto-hash):
--    INSERT INTO kasir (username, password, nama_lengkap, role, cabang_id)
--    VALUES ('newuser', 'password123', 'Nama Lengkap', 'kasir', 'cabang_id');
-- 
-- MIGRASI PASSWORD LAMA:
-- Uncomment section 7 untuk migrate existing passwords
-- ============================================
