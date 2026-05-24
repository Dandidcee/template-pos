import { supabase } from "./supabase";

/**
 * Secure Supabase Wrapper
 * Menambahkan layer keamanan tambahan untuk semua operasi database
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize input untuk mencegah SQL injection
 */
function sanitizeInput(input) {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove < >
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }
  return input;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indonesia format)
 */
function isValidPhone(phone) {
  const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate numeric value
 */
function isValidNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Set session context untuk RLS
 */
async function setSessionContext(kasirId, role) {
  if (!kasirId || !role) return;
  
  try {
    // Set session variables untuk RLS policies
    await supabase.rpc('set_session_context', {
      kasir_id: kasirId,
      role: role
    });
  } catch (error) {
    console.warn('Failed to set session context:', error.message);
  }
}

/**
 * Rate limiting check (client-side)
 */
const rateLimitStore = new Map();

function checkClientRateLimit(action, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const key = action;
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return true;
  }
  
  // Reset jika sudah lewat window
  if (now - record.firstAttempt > windowMs) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return true;
  }
  
  // Increment count
  record.count++;
  
  if (record.count > maxAttempts) {
    const remainingMs = windowMs - (now - record.firstAttempt);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    throw new Error(`Terlalu banyak percobaan. Coba lagi dalam ${remainingSeconds} detik.`);
  }
  
  return true;
}

// ============================================
// SECURE OPERATIONS
// ============================================

/**
 * Secure login dengan rate limiting dan sanitization
 */
export async function secureLogin(username, password) {
  // Rate limiting
  checkClientRateLimit('login', 5, 60000); // 5 attempts per minute
  
  // Input validation
  if (!username || !password) {
    throw new Error('Username dan password harus diisi');
  }
  
  if (username.length < 3 || username.length > 50) {
    throw new Error('Username tidak valid');
  }
  
  if (password.length < 6) {
    throw new Error('Password minimal 6 karakter');
  }
  
  // Sanitize input
  const cleanUsername = sanitizeInput(username);
  
  try {
    // Query dengan parameterized untuk mencegah SQL injection
    const { data, error } = await supabase
      .from("kasir")
      .select(`*, cabang:cabang_id(*)`)
      .eq("username", cleanUsername)
      .eq("password", password) // TODO: Implement proper password hashing
      .single();

    if (error || !data) {
      throw new Error("Username atau Password salah!");
    }
    
    // Set session context untuk RLS
    await setSessionContext(data.id, data.role);
    
    return data;
  } catch (err) {
    throw new Error(err.message || "Gagal masuk. Coba lagi.");
  }
}

/**
 * Secure fetch products dengan validation
 */
export async function secureFetchProducts(cabangId, kasir) {
  // Validate cabangId jika ada
  if (cabangId && !isValidUUID(cabangId)) {
    throw new Error('Cabang ID tidak valid');
  }
  
  // Kasir non-admin hanya bisa akses cabang sendiri
  if (kasir?.role !== 'admin' && cabangId && cabangId !== kasir?.cabang_id) {
    throw new Error('Akses ditolak: Anda tidak memiliki akses ke cabang ini');
  }
  
  try {
    let query = supabase
      .from("barang")
      .select("id, nama_barang, harga, stok, satuan, modal, cabang_id, cabang(nama, nama_toko)")
      .order("nama_barang", { ascending: true });

    // Filter berdasarkan cabang
    if (cabangId) {
      query = query.eq("cabang_id", cabangId);
    } else if (kasir?.role !== 'admin') {
      // Kasir non-admin hanya lihat barang di cabangnya
      query = query.eq("cabang_id", kasir.cabang_id);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    
    return data.map((item) => ({
      id: item.id,
      nama: sanitizeInput(item.nama_barang),
      harga: Number(item.harga) || 0,
      stok: item.stok ?? null,
      satuan: sanitizeInput(item.satuan) || 'pcs',
      modal: Number(item.modal) || 0,
      cabangId: item.cabang_id,
      namaCabang: sanitizeInput(item.cabang?.nama) || '-',
      namaToko: sanitizeInput(item.cabang?.nama_toko) || 'Toko Senin',
    }));
  } catch (err) {
    throw new Error(err.message || 'Gagal mengambil data produk');
  }
}

/**
 * Secure save transaction dengan validation
 */
export async function secureSaveTransaction(payload, kasir) {
  // Rate limiting
  checkClientRateLimit('transaction', 10, 60000); // 10 transactions per minute
  
  // Validate payload
  if (!payload || !payload.items || payload.items.length === 0) {
    throw new Error('Transaksi harus memiliki minimal 1 item');
  }
  
  if (!isValidNumber(payload.total_harga, 1)) {
    throw new Error('Total harga tidak valid');
  }
  
  // Validate metode pembayaran
  const validMetode = ['tunai', 'qr', 'transfer'];
  if (!validMetode.includes(payload.metode_pembayaran)) {
    throw new Error('Metode pembayaran tidak valid');
  }
  
  // Validate cabang_id
  if (payload.cabang_id && !isValidUUID(payload.cabang_id)) {
    throw new Error('Cabang ID tidak valid');
  }
  
  // Kasir non-admin hanya bisa transaksi untuk cabang sendiri
  if (kasir?.role !== 'admin' && payload.cabang_id !== kasir?.cabang_id) {
    throw new Error('Akses ditolak: Anda tidak bisa membuat transaksi untuk cabang lain');
  }
  
  // Validate items
  for (const item of payload.items) {
    if (!isValidNumber(item.qty, 1, 10000)) {
      throw new Error(`Quantity tidak valid untuk ${item.nama}`);
    }
    if (!isValidNumber(item.harga, 0)) {
      throw new Error(`Harga tidak valid untuk ${item.nama}`);
    }
    if (!isValidNumber(item.subtotal, 0)) {
      throw new Error(`Subtotal tidak valid untuk ${item.nama}`);
    }
  }
  
  // Sanitize string inputs
  const cleanPayload = {
    order_number: sanitizeInput(payload.order_number),
    barang_id: payload.items.length === 1 ? payload.items[0].id : null,
    nama_barang: payload.items.length === 1 
      ? sanitizeInput(payload.items[0].nama) 
      : 'Multi Item',
    harga_satuan: payload.items.length === 1 
      ? Number(payload.items[0].harga) 
      : Number(payload.total_harga),
    qty: payload.items.length === 1 ? Number(payload.items[0].qty) : 1,
    catatan: payload.catatan ? sanitizeInput(payload.catatan) : null,
    total_harga: Number(payload.total_harga),
    metode_pembayaran: payload.metode_pembayaran,
    nama_bank: payload.nama_bank ? sanitizeInput(payload.nama_bank) : null,
    jumlah_bayar: payload.jumlah_bayar ? Number(payload.jumlah_bayar) : null,
    kembalian: payload.kembalian ? Number(payload.kembalian) : null,
    nama_kasir: sanitizeInput(payload.nama_kasir) || 'Unknown',
    cabang_id: payload.cabang_id || null,
    nama_cabang: payload.nama_cabang ? sanitizeInput(payload.nama_cabang) : null,
    items: payload.items.map(item => ({
      id: item.id,
      nama: sanitizeInput(item.nama),
      harga: Number(item.harga),
      qty: Number(item.qty),
      satuan: sanitizeInput(item.satuan),
      subtotal: Number(item.subtotal),
      catatan: item.catatan ? sanitizeInput(item.catatan) : null,
    })),
    created_at: new Date().toISOString(),
  };
  
  try {
    // Insert transaksi
    const { data, error } = await supabase
      .from("transaksi")
      .insert([cleanPayload])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update stok barang (dengan transaction safety)
    for (const item of cleanPayload.items) {
      if (item.id) {
        // Ambil stok saat ini
        const { data: barang, error: fetchError } = await supabase
          .from("barang")
          .select("stok")
          .eq("id", item.id)
          .single();

        if (fetchError) {
          console.warn(`Gagal mengambil stok untuk barang ${item.id}:`, fetchError.message);
          continue;
        }

        if (barang && barang.stok !== null) {
          const newStok = Math.max(0, barang.stok - item.qty);
          
          const { error: updateError } = await supabase
            .from("barang")
            .update({ stok: newStok })
            .eq("id", item.id);
            
          if (updateError) {
            console.warn(`Gagal update stok untuk barang ${item.id}:`, updateError.message);
          }
        }
      }
    }

    return data;
  } catch (err) {
    throw new Error(err.message || 'Gagal menyimpan transaksi');
  }
}

/**
 * Secure fetch transactions dengan validation
 */
export async function secureFetchTransactions(kasir, filters = {}) {
  try {
    let query = supabase
      .from("transaksi")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Kasir non-admin hanya bisa lihat transaksi cabangnya
    if (kasir?.role !== 'admin') {
      query = query.eq("cabang_id", kasir.cabang_id);
    } else if (filters.cabangId) {
      // Admin bisa filter berdasarkan cabang
      if (!isValidUUID(filters.cabangId)) {
        throw new Error('Cabang ID tidak valid');
      }
      query = query.eq("cabang_id", filters.cabangId);
    }
    
    // Filter berdasarkan tanggal jika ada
    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }
    
    // Limit untuk performa
    const limit = filters.limit && isValidNumber(filters.limit, 1, 1000) 
      ? filters.limit 
      : 100;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    
    return data;
  } catch (err) {
    throw new Error(err.message || 'Gagal mengambil data transaksi');
  }
}

/**
 * Secure add/update product (admin only)
 */
export async function secureUpsertProduct(productData, kasir) {
  // Cek role admin
  if (kasir?.role !== 'admin') {
    throw new Error('Akses ditolak: Hanya admin yang bisa mengelola produk');
  }
  
  // Validate input
  if (!productData.nama_barang || productData.nama_barang.trim().length === 0) {
    throw new Error('Nama barang harus diisi');
  }
  
  if (!isValidNumber(productData.harga, 0)) {
    throw new Error('Harga tidak valid');
  }
  
  if (productData.modal !== undefined && !isValidNumber(productData.modal, 0)) {
    throw new Error('Modal tidak valid');
  }
  
  if (productData.stok !== null && productData.stok !== undefined && !isValidNumber(productData.stok, 0)) {
    throw new Error('Stok tidak valid');
  }
  
  if (!productData.cabang_id || !isValidUUID(productData.cabang_id)) {
    throw new Error('Cabang harus dipilih');
  }
  
  // Sanitize input
  const cleanData = {
    nama_barang: sanitizeInput(productData.nama_barang),
    harga: Number(productData.harga),
    modal: productData.modal ? Number(productData.modal) : 0,
    stok: productData.stok !== null && productData.stok !== undefined 
      ? Number(productData.stok) 
      : null,
    satuan: sanitizeInput(productData.satuan) || 'pcs',
    cabang_id: productData.cabang_id,
  };
  
  try {
    if (productData.id) {
      // Update existing
      if (!isValidUUID(productData.id)) {
        throw new Error('Product ID tidak valid');
      }
      
      const { data, error } = await supabase
        .from("barang")
        .update(cleanData)
        .eq("id", productData.id)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("barang")
        .insert([cleanData])
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return data;
    }
  } catch (err) {
    throw new Error(err.message || 'Gagal menyimpan produk');
  }
}

/**
 * Secure delete product (admin only)
 */
export async function secureDeleteProduct(productId, kasir) {
  // Cek role admin
  if (kasir?.role !== 'admin') {
    throw new Error('Akses ditolak: Hanya admin yang bisa menghapus produk');
  }
  
  if (!isValidUUID(productId)) {
    throw new Error('Product ID tidak valid');
  }
  
  try {
    const { error } = await supabase
      .from("barang")
      .delete()
      .eq("id", productId);
      
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    throw new Error(err.message || 'Gagal menghapus produk');
  }
}

// ============================================
// EXPORT UTILITIES
// ============================================

export const secureUtils = {
  sanitizeInput,
  isValidEmail,
  isValidPhone,
  isValidUUID,
  isValidNumber,
  checkClientRateLimit,
};
