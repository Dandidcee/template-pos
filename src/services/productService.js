import { supabase } from "../lib/supabase";

// ── Nama tabel & kolom di Supabase ───────────────────
const TABLE_BARANG    = "barang";
const TABLE_TRANSAKSI = "transaksi";

// ── 1. Ambil semua produk ────────────────────────────
export async function fetchProducts(cabangId, isAdmin = false) {
  let query = supabase
    .from(TABLE_BARANG)
    .select("id, nama_barang, harga, stok, satuan, modal, cabang_id, cabang(nama)")
    .order("nama_barang", { ascending: true });

  if (cabangId) {
    query = query.eq("cabang_id", cabangId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  
  return data.map((item) => ({
    id          : item.id,
    nama_barang : item.nama_barang,
    harga       : Number(item.harga),
    stok        : item.stok ?? null,
    satuan      : item.satuan || 'pcs',
    // Hanya tampilkan modal untuk admin (security)
    modal       : isAdmin ? (item.modal || 0) : undefined,
    cabang_id   : item.cabang_id,
    cabang      : item.cabang || null,
  }));
}

// ── 1.5 Pengaturan (Pajak & Biaya Layanan) ───────────
export async function fetchPengaturan() {
  const { data, error } = await supabase
    .from("pengaturan")
    .select("*")
    .eq("id", 1)
    .single();
    
    if (error && error.code !== 'PGRST116') {
    console.error("Gagal mengambil pengaturan:", error.message);
    return { 
      biaya_layanan: 0, 
      pajak_persen: 0,
      pembayaran_tunai_aktif: true,
      pembayaran_midtrans_aktif: false,
      pembayaran_qris_aktif: false,
      pembayaran_transfer_aktif: false,
      qris_image_url: null,
      mode_cabang_aktif: true,
      nama_toko: 'Toko Senin'
    };
  }
  
  return data || { 
    biaya_layanan: 0, 
    pajak_persen: 0,
    pembayaran_tunai_aktif: true,
    pembayaran_midtrans_aktif: false,
    pembayaran_qris_aktif: false,
    pembayaran_transfer_aktif: false,
    qris_image_url: null,
    nama_toko: 'Toko Senin'
  };
}

export async function updatePengaturan(payload) {
  const { data, error } = await supabase
    .from("pengaturan")
    .upsert({ id: 1, ...payload, updated_at: new Date().toISOString() })
    .select()
    .single();
    
  if (error) throw new Error(error.message);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pengaturanUpdated'));
    localStorage.setItem('pengaturan_updated', Date.now().toString());
  }

  return data;
}

// ── 1.6 Pengaturan Rahasia (Midtrans Server Key) ────────
export async function updatePengaturanRahasia(serverKey, isProduction) {
  const { error } = await supabase
    .from("pengaturan_rahasia")
    .update({ 
      midtrans_server_key: serverKey,
      midtrans_is_production: isProduction,
      updated_at: new Date().toISOString() 
    })
    .eq('id', 1);
    
  if (error) throw new Error(error.message);
  return true;
}

// ── 2. Simpan transaksi ke Supabase ──────────────────
export async function saveTransaction(payload, retryCount = 0) {
  const maxRetries = 5; // Maksimal 5 kali retry
  
  try {
    const { data, error } = await supabase
      .from(TABLE_TRANSAKSI)
      .insert([
        {
          order_number      : payload.order_number,
          barang_id         : payload.items && payload.items.length === 1 ? payload.items[0].id : null,
          nama_barang       : payload.items && payload.items.length === 1 ? payload.items[0].nama : 'Multi Item',
          harga_satuan      : payload.items && payload.items.length === 1 ? payload.items[0].harga : payload.total_harga,
          qty               : payload.items && payload.items.length === 1 ? payload.items[0].qty : 1,
          catatan           : payload.catatan || null,
          subtotal          : payload.subtotal || 0,
          pajak             : payload.pajak || 0,
          biaya_layanan     : payload.biaya_layanan || 0,
          total_harga       : payload.total_harga,
          metode_pembayaran : payload.metode_pembayaran,
          nama_bank         : payload.nama_bank || null,
          jumlah_bayar      : payload.jumlah_bayar || null,
          kembalian         : payload.kembalian || null,
          nama_kasir        : payload.nama_kasir || 'Unknown',
          cabang_id         : payload.cabang_id || null,
          nama_cabang       : payload.nama_cabang || null,
          pelanggan_id      : payload.pelanggan_id || null,
          poin_didapat      : payload.poin_didapat || 0,
          poin_dipakai      : payload.poin_dipakai || 0,
          diskon_global_rp  : payload.diskon_global_rp || 0,
          diskon_poin_rp    : payload.diskon_poin_rp || 0,
          items             : payload.items || [],

          // Midtrans fields (hanya diisi kalau metode QRIS/Transfer)
          payment_status    : payload.payment_status || (payload.metode_pembayaran === 'tunai' ? 'success' : 'pending'),
          midtrans_transaction_id : payload.midtrans_transaction_id || null,
          midtrans_payment_type   : payload.midtrans_payment_type || null,
          midtrans_transaction_time : payload.midtrans_transaction_time || null,
          midtrans_response       : payload.midtrans_response || null,
          created_at        : new Date().toISOString(),
        },
      ])
      .select()
      .single();

    // Jika error duplicate key (order_number sudah ada), auto-increment dan retry
    if (error && error.code === '23505' && retryCount < maxRetries) {
      // Extract sequence number dari order_number (e.g., TS-20260518-005 → 005)
      const match = payload.order_number.match(/-(\d{3})$/);
      if (match) {
        const currentSeq = parseInt(match[1], 10);
        const newSeq = String(currentSeq + 1).padStart(3, '0');
        const newOrderNumber = payload.order_number.replace(/-(\d{3})$/, `-${newSeq}`);
        
        // Retry dengan order number baru
        return saveTransaction({
          ...payload,
          order_number: newOrderNumber
        }, retryCount + 1);
      }
    }

    if (error) throw new Error(error.message);

    // Otomatis memotong stok barang HANYA untuk transaksi yang sudah berhasil (tunai atau Midtrans success)
    const isSuccessPayment = payload.payment_status === 'success' || payload.metode_pembayaran === 'tunai';
    
    if (isSuccessPayment && payload.items && payload.items.length > 0) {
      for (const item of payload.items) {
        if (item.id) {
          const { data: barang } = await supabase
            .from(TABLE_BARANG)
            .select("stok")
            .eq("id", item.id)
            .single();

          if (barang && barang.stok !== null) {
            const newStok = Math.max(0, barang.stok - item.qty);
            await supabase
              .from(TABLE_BARANG)
              .update({ stok: newStok })
              .eq("id", item.id);
          }
        }
      }
    }

    // Eksekusi Poin Member jika ada pelanggan (Hanya untuk transaksi sukses)
    if (isSuccessPayment && payload.pelanggan_id && (payload.poin_didapat > 0 || payload.poin_dipakai > 0)) {
      await supabase.rpc('proses_poin_pelanggan', {
        p_pelanggan_id: payload.pelanggan_id,
        p_poin_didapat: payload.poin_didapat || 0,
        p_poin_dipakai: payload.poin_dipakai || 0
      });
    }

    // Buat notifikasi untuk kasir setelah transaksi berhasil
    if (payload.kasir_id) {
      const rupiah = (num) => {
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(num);
      };

      await supabase.from("notifikasi").insert([{
        kasir_id: payload.kasir_id,
        judul: "Transaksi Berhasil",
        pesan: `Transaksi ${payload.order_number} sebesar ${rupiah(payload.total_harga)} berhasil disimpan.`,
        tipe: "success",
        dibaca: false,
        created_at: new Date().toISOString(),
      }]);
      
      // Trigger refresh notification badge
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('refreshNotifications'));
      }
    }

    return data;
  } catch (err) {
    // Jika error bukan duplicate dan sudah retry, throw error
    throw err;
  }
}

// ── 3. Ambil riwayat transaksi ────────────────────────
export async function fetchTransactions({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from(TABLE_TRANSAKSI)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

// ==========================================
// CABANG API
// ==========================================

export async function fetchCabangList() {
  const { data, error } = await supabase.from('cabang').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching cabang:', error.message);
    throw error;
  }
  return data;
}

export async function addCabang(cabang) {
  const { data, error } = await supabase.from('cabang').insert([cabang]).select();
  if (error) {
    console.error('Error adding cabang:', error.message);
    throw error;
  }
  return data[0];
}

export async function updateCabang(id, updates) {
  const { data, error } = await supabase.from('cabang').update(updates).eq('id', id).select();
  if (error) {
    console.error('Error updating cabang:', error.message);
    throw error;
  }
  return data[0];
}

export async function deleteCabang(id) {
  const { error } = await supabase.from('cabang').delete().eq('id', id);
  if (error) {
    console.error('Error deleting cabang:', error.message);
    throw error;
  }
  return true;
}


// ==========================================
// PELANGGAN API
// ==========================================

export async function fetchPelangganList() {
  const { data, error } = await supabase.from('pelanggan').select('*').order('nama', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addPelanggan(pelanggan) {
  const { data, error } = await supabase.from('pelanggan').insert([pelanggan]).select();
  if (error) throw error;
  return data[0];
}

export async function updatePelanggan(id, updates) {
  const { data, error } = await supabase.from('pelanggan').update(updates).eq('id', id).select();
  if (error) throw error;
  return data[0];
}

export async function deletePelanggan(id) {
  const { error } = await supabase.from('pelanggan').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function updatePoinPelangganManual(id, pointDiff) {
  const { data: current } = await supabase.from('pelanggan').select('point').eq('id', id).single();
  if (!current) throw new Error('Pelanggan tidak ditemukan');
  
  const { data, error } = await supabase.from('pelanggan').update({ point: Number(current.point) + Number(pointDiff) }).eq('id', id).select();
  if (error) throw error;
  return data[0];
}
