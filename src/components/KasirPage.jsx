import { useState, useEffect, useRef } from "react";

const MOTIVASI = [
  { icon: "verified",          text: "Selalu berikan pelayanan terbaik dan jujur kepada setiap pelanggan." },
  { icon: "sentiment_satisfied", text: "Sambut setiap pelanggan dengan ramah dan penuh semangat." },
  { icon: "workspace_premium",  text: "Kepuasan pelanggan adalah tolak ukur kualitas kerja kita." },
  { icon: "loyalty",            text: "Tawarkan program loyalitas kepada pelanggan setia." },
  { icon: "trending_up",        text: "Konsisten dan teliti adalah kunci kasir yang andal." },
  { icon: "local_activity",     text: "Setiap transaksi yang benar membangun kepercayaan toko." },
];
import { rupiah } from "../config";
import { supabase } from "../lib/supabase";
import { saveTransaction, fetchPengaturan, fetchPelangganList } from "../services/productService";
import useProducts from "../hooks/useProducts";
import ReceiptModal from "./ReceiptModal";
import SuccessModal from "./SuccessModal";
import MobileCartModal from "./MobileCartModal";
import MidtransPaymentModal from "./MidtransPaymentModal";
import { useAuth } from "../context/AuthContext";

const QUICK_AMOUNTS = [20000, 50000, 100000];
const inputCls = "h-12 w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-md px-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-on-surface placeholder:text-outline";

// LocalStorage keys
const STORAGE_KEY_CART = "kasir_cart_backup";
const STORAGE_KEY_FORM = "kasir_form_backup";
const STORAGE_KEY_PAYMENT = "kasir_payment_backup";

export default function KasirPage() {
  const [msgIdx, setMsgIdx]   = useState(0);
  const [fadeIn, setFadeIn]   = useState(true);

  // Ganti kata motivasi tanpa reload - simpan di state saja
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % MOTIVASI.length);
        setFadeIn(true);
      }, 500);
    }, 60_000);
    return () => clearInterval(interval);
  }, []); // Hapus dependency yang menyebabkan re-render

  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";
  
  // Admin-specific state
  const [adminCabangId, setAdminCabangId] = useState("");
  const [adminKasirId, setAdminKasirId] = useState("");
  const [cabangList, setCabangList] = useState([]);
  const [kasirList, setKasirList] = useState([]);
  
  const { products, loading, error } = useProducts(isAdmin ? adminCabangId || null : kasir?.cabang_id, false);

  // Form input state (current item being added)
  const [selectedId, setSelectedId]   = useState("");
  const [qty, setQty]                 = useState(1);
  const [catatan, setCatatan]         = useState("");
  
  // Unit conversion state
  const [inputUnit, setInputUnit]     = useState(""); // satuan yang dipilih user untuk input (kg, gram, liter, ml)
  const [inputValue, setInputValue]   = useState(""); // nilai yang diinput user
  
  // Cart & Payment state
  const [cart, setCart]               = useState([]);
  const [metode, setMetode]           = useState("tunai");
  const [jumlahUang, setJumlahUang]   = useState("");
  const [namaBank, setNamaBank]       = useState("");
  const [bankList, setBankList]       = useState([]);
  
  // UI state
  const [productOpen, setProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const productDropdownRef = useRef(null);
  const [showMobileCart, setShowMobileCart] = useState(false); // Mobile cart modal

  useEffect(() => {
    function handleClickOutside(event) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setProductOpen(false);
      }
      if (pelangganDropdownRef.current && !pelangganDropdownRef.current.contains(event.target)) {
        setPelangganOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tx state
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [lastTx, setLastTx]           = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [midtransModalOpen, setMidtransModalOpen] = useState(false);
  const [namaTokoGlobal, setNamaTokoGlobal] = useState("Toko Senin");
  const [pengaturan, setPengaturan] = useState({
    pembayaran_tunai_aktif: true,
    pembayaran_midtrans_aktif: false,
    pembayaran_qris_aktif: false,
    pembayaran_transfer_aktif: false,
    qris_image_url: "",
    mode_cabang_aktif: true,
    mode_member_aktif: false,
    member_rasio_dapat_poin: 1000,
    member_bisa_tukar_diskon: false,
    member_rasio_tukar_poin: 100,
    diskon_global_aktif: false,
    diskon_global_nama: 'Diskon Spesial',
    diskon_global_persen: 0
  });

  // Member / Pelanggan state
  const [pelangganList, setPelangganList] = useState([]);
  const [selectedPelanggan, setSelectedPelanggan] = useState(null);
  const [pelangganSearch, setPelangganSearch] = useState("");
  const [pelangganOpen, setPelangganOpen] = useState(false);
  const [gunakanPoin, setGunakanPoin] = useState(false);
  const pelangganDropdownRef = useRef(null);

  // Load pengaturan global
  useEffect(() => {
    async function loadConfig() {
      const p = await fetchPengaturan();
      if (p) {
        setNamaTokoGlobal(p.nama_toko || "Toko Senin");
        setPengaturan(p);
      }
    }
    loadConfig();
    fetchPelangganList().then(setPelangganList).catch(() => {});

    const handleRefresh = async () => {
      const p = await fetchPengaturan();
      if (p) {
        setNamaTokoGlobal(p.nama_toko || "Toko Senin");
        setPengaturan(p);
      }
    };

    window.addEventListener('pengaturanUpdated', handleRefresh);
    
    const handleStorage = (e) => {
      if (e.key === 'pengaturan_updated') handleRefresh();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('pengaturanUpdated', handleRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Load cabang dan kasir untuk admin (hanya sekali)
  useEffect(() => {
    async function loadAdminData() {
      if (isAdmin) {
        const { data: cabangData } = await supabase.from("cabang").select("id, nama").order("nama");
        if (cabangData) setCabangList(cabangData);
        
        const { data: kasirData } = await supabase
          .from("kasir")
          .select("id, nama_lengkap, username, cabang_id")
          .eq("role", "kasir")
          .order("nama_lengkap");
        if (kasirData) setKasirList(kasirData);
      }
    }
    loadAdminData();
  }, [isAdmin]); // Hanya load sekali saat isAdmin berubah

  // Auto-select cabang pertama jika mode cabang tidak aktif
  useEffect(() => {
    if (isAdmin && pengaturan && !pengaturan.mode_cabang_aktif && cabangList.length > 0 && !adminCabangId) {
      setAdminCabangId(cabangList[0].id);
    }
  }, [isAdmin, pengaturan, cabangList, adminCabangId]);

  // Load bank list (hanya sekali)
  useEffect(() => {
    async function loadBankList() {
      const { data } = await supabase
        .from("bank_account")
        .select("nama_bank, nomor_rekening, atas_nama")
        .eq("aktif", true)
        .order("nama_bank");
      if (data && data.length > 0) {
        setBankList(data);
        if (!namaBank) setNamaBank(data[0].nama_bank);
      }
    }
    loadBankList();
  }, []); // Hanya load sekali saat mount

  // ── AUTO-SAVE: Restore dari localStorage saat mount ──
  useEffect(() => {
    try {
      let hasRestoredData = false;
      
      // Restore cart
      const savedCart = localStorage.getItem(STORAGE_KEY_CART);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          setCart(parsedCart);
          hasRestoredData = true;
        }
      }

      // Restore form input
      const savedForm = localStorage.getItem(STORAGE_KEY_FORM);
      if (savedForm) {
        const form = JSON.parse(savedForm);
        if (form.selectedId) setSelectedId(form.selectedId);
        if (form.qty) setQty(form.qty);
        if (form.catatan) setCatatan(form.catatan);
        if (form.inputUnit) setInputUnit(form.inputUnit);
        if (form.inputValue) setInputValue(form.inputValue);
        if (form.selectedId || form.catatan || form.inputValue) hasRestoredData = true;
      }

      // Restore payment info
      const savedPayment = localStorage.getItem(STORAGE_KEY_PAYMENT);
      if (savedPayment) {
        const payment = JSON.parse(savedPayment);
        if (payment.metode) setMetode(payment.metode);
        if (payment.jumlahUang) setJumlahUang(payment.jumlahUang);
        if (payment.namaBank) setNamaBank(payment.namaBank);
        if (payment.jumlahUang) hasRestoredData = true;
      }

      // Show notification jika ada data yang di-restore
      if (hasRestoredData) {
        showToast("success", "Data transaksi sebelumnya berhasil dipulihkan");
      }
    } catch (err) {
      console.error("Failed to restore from localStorage:", err);
    }
  }, []); // Hanya restore sekali saat mount

  // ── AUTO-SAVE: Simpan cart ke localStorage setiap kali berubah ──
  useEffect(() => {
    if (cart.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
      } catch (err) {
        console.error("Failed to save cart to localStorage:", err);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_CART);
    }
  }, [cart]);

  // ── AUTO-SAVE: Simpan form input ke localStorage ──
  useEffect(() => {
    if (selectedId || qty > 1 || catatan || inputUnit || inputValue) {
      try {
        localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify({
          selectedId,
          qty,
          catatan,
          inputUnit,
          inputValue
        }));
      } catch (err) {
        console.error("Failed to save form to localStorage:", err);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_FORM);
    }
  }, [selectedId, qty, catatan, inputUnit, inputValue]);

  // ── AUTO-SAVE: Simpan payment info ke localStorage ──
  useEffect(() => {
    if (metode !== "tunai" || jumlahUang || namaBank) {
      try {
        localStorage.setItem(STORAGE_KEY_PAYMENT, JSON.stringify({
          metode,
          jumlahUang,
          namaBank
        }));
      } catch (err) {
        console.error("Failed to save payment to localStorage:", err);
      }
    }
  }, [metode, jumlahUang, namaBank]);

  const generateOrderNumber = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      
      // Get max sequence number for today (including cancelled transactions)
      const { data, error } = await supabase
        .from("transaksi")
        .select("order_number")
        .gte("created_at", todayIso)
        .order("order_number", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        // Extract sequence from last order number (e.g., TS-20260518-001 → 001)
        const lastOrderNumber = data[0].order_number;
        const match = lastOrderNumber.match(/-(\d{3})$/);
        
        if (match) {
          const lastSequence = parseInt(match[1], 10);
          const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const sequence = String(lastSequence + 1).padStart(3, "0");
          return `TS-${yyyymmdd}-${sequence}`;
        } else {
          // Fallback if format doesn't match
          const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          return `TS-${yyyymmdd}-001`;
        }
      } else {
        // First transaction of the day
        const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return `TS-${yyyymmdd}-001`;
      }
    } catch (err) {
      console.error("Generate order number error:", err);
      return `TS-${Date.now().toString().slice(-6)}`;
    }
  };

  // Remove useEffect for auto-generate (will be called manually when needed)

  // Derived
  const product     = products.find((p) => String(p.id) === String(selectedId));
  const harga       = product?.harga ?? 0;
  
  // Unit conversion logic
  const isWeightUnit = product?.satuan && ["kg", "gram"].includes(product.satuan);
  const isVolumeUnit = product?.satuan && ["liter", "ml"].includes(product.satuan);
  const needsConversion = isWeightUnit || isVolumeUnit;
  
  // Auto-set inputUnit saat produk dipilih
  useEffect(() => {
    if (product && needsConversion && !inputUnit) {
      setInputUnit(product.satuan);
    }
  }, [product, needsConversion]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Konversi satuan ke satuan dasar produk
  const convertToBaseUnit = (value, fromUnit, baseUnit) => {
    if (!value || !fromUnit || !baseUnit) return 0;
    const val = parseFloat(value);
    if (isNaN(val)) return 0;
    
    // Konversi berat
    if (baseUnit === "kg") {
      if (fromUnit === "kg") return val;
      if (fromUnit === "gram") return val / 1000;
    }
    if (baseUnit === "gram") {
      if (fromUnit === "gram") return val;
      if (fromUnit === "kg") return val * 1000;
    }
    
    // Konversi volume
    if (baseUnit === "liter") {
      if (fromUnit === "liter") return val;
      if (fromUnit === "ml") return val / 1000;
    }
    if (baseUnit === "ml") {
      if (fromUnit === "ml") return val;
      if (fromUnit === "liter") return val * 1000;
    }
    
    return val;
  };
  
  // Hitung qty final berdasarkan konversi
  const finalQty = needsConversion && inputValue && inputUnit
    ? convertToBaseUnit(inputValue, inputUnit, product.satuan)
    : qty;
  
  // Pembulatan untuk menghindari floating point error
  const totalCart = Math.round(cart.reduce((sum, item) => sum + item.subtotal, 0));

  // Diskon Global
  const diskonGlobalRp = pengaturan.diskon_global_aktif
    ? Math.round(totalCart * (pengaturan.diskon_global_persen / 100))
    : 0;

  // Diskon dari Poin Member
  const poinBisaDipakai = selectedPelanggan && pengaturan.mode_member_aktif && pengaturan.member_bisa_tukar_diskon && pengaturan.member_rasio_tukar_poin > 0
    ? Math.min(Number(selectedPelanggan.point), Math.floor(Math.max(0, totalCart - diskonGlobalRp) / pengaturan.member_rasio_tukar_poin))
    : 0;
  const poinDipakai = gunakanPoin ? poinBisaDipakai : 0;
  const diskonPoinRp = poinDipakai * pengaturan.member_rasio_tukar_poin;

  // Total setelah semua diskon
  const totalSetelahDiskon = Math.max(0, totalCart - diskonGlobalRp - diskonPoinRp);

  // Poin yang akan didapat dari transaksi ini
  const poinDidapat = pengaturan.mode_member_aktif && selectedPelanggan && pengaturan.member_rasio_dapat_poin > 0
    ? Math.floor(totalSetelahDiskon / pengaturan.member_rasio_dapat_poin)
    : 0;

  const bayar = Number(jumlahUang) || 0;
  const kembalian = metode === "tunai" && jumlahUang !== "" ? Math.round(bayar - totalSetelahDiskon) : null;

  const showToast = (type, msg) => setToast({ type, msg });
  const clearToast = () => setToast(null);

  // ── Handlers ────────────────────────────────────────
  const handleAddToCart = () => {
    if (!product) return;
    
    // Gunakan finalQty yang sudah dikonversi
    const qtyToAdd = finalQty;
    if (qtyToAdd < 0.001) {
      showToast("error", "Jumlah tidak valid!");
      return;
    }

    // Validasi stok jika produk memiliki tracking stok
    if (product.stok !== null && product.stok !== undefined) {
      // Hitung total qty yang sudah ada di keranjang untuk produk ini
      const existingInCart = cart
        .filter(c => c.id === product.id)
        .reduce((sum, c) => sum + c.qty, 0);
      
      const totalQty = existingInCart + qtyToAdd;
      
      if (totalQty > product.stok) {
        showToast("error", `Stok tidak cukup! Tersedia: ${product.stok} ${product.satuan}, Di keranjang: ${existingInCart} ${product.satuan}`);
        return;
      }
    }

    // Cek apakah item sudah ada di keranjang
    const existingIdx = cart.findIndex(c => c.id === product.id && c.catatan === catatan);
    if (existingIdx >= 0) {
      const newCart = [...cart];
      newCart[existingIdx].qty += qtyToAdd;
      newCart[existingIdx].subtotal = newCart[existingIdx].qty * newCart[existingIdx].harga;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: product.id,
        nama: product.nama_barang || product.nama,
        harga: product.harga,
        satuan: product.satuan || 'pcs',
        qty: qtyToAdd,
        catatan,
        subtotal: product.harga * qtyToAdd
      }]);
    }

    // Reset current item input
    setSelectedId("");
    setQty(1);
    setInputValue("");
    setInputUnit("");
    setCatatan("");
    clearToast();

  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const pickMetode = (v) => {
    setMetode(v);
    setJumlahUang("");
    clearToast();
  };

  const uangPas = () => setJumlahUang(String(totalSetelahDiskon));

  const handleReset = () => {
    setCart([]); setMetode("tunai"); setJumlahUang(""); setNamaBank(bankList[0]?.nama_bank || "");
    setSelectedId(""); setQty(1); setInputValue(""); setInputUnit(""); setCatatan(""); clearToast();
    setSelectedPelanggan(null); setPelangganSearch(""); setGunakanPoin(false);
    
    // Clear localStorage setelah transaksi berhasil
    try {
      localStorage.removeItem(STORAGE_KEY_CART);
      localStorage.removeItem(STORAGE_KEY_FORM);
      localStorage.removeItem(STORAGE_KEY_PAYMENT);
    } catch (err) {
      console.error("Failed to clear localStorage:", err);
    }
  };

  // Format number dengan titik pemisah ribuan
  const formatRupiah = (value) => {
    if (!value) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Parse number dari format dengan titik
  const parseRupiah = (value) => {
    if (!value) return "";
    return value.replace(/\./g, "");
  };

  // Handle input uang dengan format ribuan
  const handleUangChange = (e) => {
    const rawValue = e.target.value.replace(/\./g, ""); // Remove dots
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setJumlahUang(rawValue);
      clearToast();
    }
  };

  // ── Submit: Validasi → Preview Modal (belum simpan) ─────
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearToast();

    if (cart.length === 0) { showToast("error", "Keranjang belanja masih kosong."); return; }
    
    // Validasi khusus admin
    if (isAdmin) {
      if (pengaturan?.mode_cabang_aktif && !adminCabangId) { showToast("error", "Pilih cabang terlebih dahulu!"); return; }
      if (!adminKasirId) { showToast("error", "Pilih kasir terlebih dahulu!"); return; }
    }
    
    // Tentukan data kasir dan cabang
    const selectedKasir = isAdmin 
      ? kasirList.find(k => String(k.id) === String(adminKasirId))
      : kasir;
    
    const selectedCabang = isAdmin
      ? cabangList.find(c => String(c.id) === String(adminCabangId))
      : kasir?.cabang;

    // Generate order number SEKARANG (tepat sebelum dipakai)
    const newOrderNumber = await generateOrderNumber();

    // Jika metode midtrans, langsung buka Midtrans modal
    if (metode === "midtrans") {
      setLastTx({
        orderNumber: newOrderNumber,
        items: cart,
        totalCart,
        diskonGlobalRp,
        diskonGlobalNama: pengaturan.diskon_global_nama,
        diskonPoinRp,
        poinDipakai,
        poinDidapat,
        totalHarga: totalSetelahDiskon,
        namaKasir: selectedKasir?.nama_lengkap || "Unknown",
        cabangId: isAdmin ? adminCabangId : kasir?.cabang_id,
        namaCabang: selectedCabang?.nama || null,
        namaToko: namaTokoGlobal || "Toko Senin",
        pelanggan: selectedPelanggan,
        metode,
        _payload: {
          order_number      : newOrderNumber,
          subtotal          : totalCart,
          total_harga       : totalSetelahDiskon,
          metode_pembayaran : metode,
          nama_kasir        : selectedKasir?.nama_lengkap || "Unknown",
          kasir_id          : isAdmin ? adminKasirId : (kasir?.id || null),
          cabang_id         : isAdmin ? adminCabangId : (kasir?.cabang_id || null),
          nama_cabang       : selectedCabang?.nama || null,
          pelanggan_id      : selectedPelanggan?.id || null,
          poin_didapat      : poinDidapat,
          poin_dipakai      : poinDipakai,
          diskon_global_rp  : diskonGlobalRp,
          diskon_poin_rp    : diskonPoinRp,
          items             : cart,
        }
      });
      setMidtransModalOpen(true);
      return;
    }
    
    // Validasi untuk metode tunai
    if (metode === "tunai") {
      if (bayar < totalSetelahDiskon) { showToast("error", `Uang kurang! Total: ${rupiah(totalSetelahDiskon)}`); return; }
      if (totalSetelahDiskon > 0 && (!jumlahUang || bayar <= 0)) { showToast("error", "Masukkan jumlah uang yang dibayar."); return; }
    }
    
    // Validasi untuk metode transfer
    if (metode === "transfer") {
      if (!namaBank) { showToast("error", "Pilih bank tujuan transfer."); return; }
    }

    // Hanya tampilkan preview untuk tunai, BELUM simpan ke Supabase
    setLastTx({
      orderNumber: newOrderNumber,
      items: cart,
      totalCart,
      diskonGlobalRp,
      diskonGlobalNama: pengaturan.diskon_global_nama,
      diskonPoinRp,
      poinDipakai,
      poinDidapat,
      totalHarga: totalSetelahDiskon,
      jumlahBayar: bayar,
      kembalian: kembalian,
      metode,
      namaBank,
      namaKasir: selectedKasir?.nama_lengkap || "Unknown",
      cabangId: isAdmin ? adminCabangId : kasir?.cabang_id,
      namaCabang: selectedCabang?.nama || null,
      namaToko: namaTokoGlobal || "Toko Senin",
      pelanggan: selectedPelanggan,
      waktu: new Date().toLocaleString("id-ID"),
      _payload: {
        order_number      : newOrderNumber,
        subtotal          : totalCart,
        total_harga       : totalSetelahDiskon,
        metode_pembayaran : metode,
        nama_bank         : metode === "transfer" ? namaBank : null,
        jumlah_bayar      : metode === "tunai" ? bayar : null,
        kembalian         : metode === "tunai" ? bayar - totalSetelahDiskon : null,
        nama_kasir        : selectedKasir?.nama_lengkap || "Unknown",
        kasir_id          : isAdmin ? adminKasirId : (kasir?.id || null),
        cabang_id         : isAdmin ? adminCabangId : (kasir?.cabang_id || null),
        nama_cabang       : selectedCabang?.nama || null,
        pelanggan_id      : selectedPelanggan?.id || null,
        poin_didapat      : poinDidapat,
        poin_dipakai      : poinDipakai,
        diskon_global_rp  : diskonGlobalRp,
        diskon_poin_rp    : diskonPoinRp,
        items             : cart,
      }
    });
    setModalOpen(true);
  };

  // ── Konfirmasi: Simpan ke Supabase setelah user setuju ──
  const handleConfirm = async () => {
    if (!lastTx?._payload) return;
    setSubmitting(true);
    try {
      await saveTransaction(lastTx._payload);
      setModalOpen(false);
      setSuccessModal(true);
      // Jangan reset dulu, biarkan user bisa cetak struk
    } catch (err) {
      const msg = err.message === "Failed to fetch"
        ? "Gagal menghubungi database (cek koneksi internet)"
        : err.message;
      setModalOpen(false);
      showToast("error", `Gagal: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Print Struk ──
  const handlePrintStruk = () => {
    if (!lastTx) return;
    
    const printContent = document.getElementById("success-receipt-print-area");
    if (!printContent) return;
    
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  // ── Close Success Modal dan Reset ──
  const handleCloseSuccess = () => {
    setSuccessModal(false);
    // Pastikan reset dipanggil (double-check)
    if (cart.length > 0) {
      handleReset();
    }
  };

  // ── Midtrans Payment Callbacks ──
  const handleMidtransSuccess = async (result) => {
    if (!lastTx?._payload) return;
    
    // Cek status transaksi - jangan save kalau cancel/deny/expire
    if (result.transaction_status === 'cancel' || 
        result.transaction_status === 'deny' || 
        result.transaction_status === 'expire' ||
        result.transaction_status === 'failure') {
      console.log("Transaction cancelled/failed:", result.transaction_status);
      setMidtransModalOpen(false);
      showToast("info", "Pembayaran dibatalkan.");
      return; // Jangan save, jangan cetak struk
    }
    
    setMidtransModalOpen(false); // Close modal dulu
    setSubmitting(true);
    
    try {
      // Update payload dengan Midtrans info
      const payload = {
        ...lastTx._payload,
        payment_status: 'success',
        midtrans_transaction_id: result.transaction_id,
        midtrans_payment_type: result.payment_type,
        midtrans_transaction_time: result.transaction_time,
        midtrans_response: result,
      };
      
      // BARU SIMPAN KE DATABASE SETELAH PEMBAYARAN BERHASIL
      await saveTransaction(payload);
      
      // Update lastTx dengan payment type untuk ditampilkan di struk
      setLastTx(prev => ({
        ...prev,
        midtransPaymentType: result.payment_type
      }));
      
      // Reset keranjang SETELAH save berhasil
      handleReset();
      
      setSuccessModal(true);
      showToast("success", "Pembayaran berhasil!");
    } catch (err) {
      const msg = err.message === "Failed to fetch"
        ? "Gagal menghubungi database (cek koneksi internet)"
        : err.message;
      showToast("error", `Gagal: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMidtransPending = async (result) => {
    if (!lastTx?._payload) return;
    
    setMidtransModalOpen(false); // Close modal dulu
    setSubmitting(true);
    
    try {
      // Update payload dengan Midtrans info
      const payload = {
        ...lastTx._payload,
        payment_status: 'pending',
        midtrans_transaction_id: result.transaction_id,
        midtrans_payment_type: result.payment_type,
        midtrans_transaction_time: result.transaction_time,
        midtrans_response: result,
      };
      
      // SIMPAN KE DATABASE DENGAN STATUS PENDING (menunggu konfirmasi)
      await saveTransaction(payload);
      
      showToast("info", "Pembayaran menunggu konfirmasi. Cek notifikasi untuk update status.");
      handleReset();
    } catch (err) {
      const msg = err.message === "Failed to fetch"
        ? "Gagal menghubungi database (cek koneksi internet)"
        : err.message;
      showToast("error", `Gagal: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMidtransError = (result) => {
    console.error("Midtrans payment error:", result);
    setMidtransModalOpen(false); // Close modal
    showToast("error", "Pembayaran gagal. Silakan coba lagi.");
    // TIDAK SIMPAN KE DATABASE - transaksi dibatalkan
  };

  const handleMidtransCancel = () => {
    console.log("Payment cancelled by user");
    setMidtransModalOpen(false); // Close modal
    showToast("info", "Pembayaran dibatalkan.");
    // TIDAK SIMPAN KE DATABASE - transaksi dibatalkan
    // TIDAK CETAK STRUK - user cancel
  };

  // ── Render ───────────────────────────────────────────
  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-2 sm:px-4 md:px-margin-page min-h-[100dvh] print:p-0 print:m-0 print:min-h-0">

      {/* Welcome Banner */}
      <section className="mb-sm md:mb-lg max-w-4xl print:hidden">
        <h2 className="text-headline-md md:text-headline-lg text-on-surface mb-xs">
          {kasir?.nama_lengkap || "Kasir"} 
          <span className="text-body-lg md:text-headline-md text-on-surface-variant ml-2">
            ({kasir?.role === "admin" ? "Admin" : "Kasir"})
          </span>
        </h2>
        {isAdmin ? (
          <div className="space-y-sm">
            <div className="bg-primary-container/20 border-l-4 border-primary p-sm md:p-md rounded-r-xl overflow-hidden">
              <p className="text-body-md md:text-body-lg text-primary flex items-center gap-2 mb-sm md:mb-md">
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                <span className="hidden sm:inline">Mode Admin: Pilih {pengaturan?.mode_cabang_aktif ? "cabang dan " : ""}kasir untuk melakukan transaksi</span>
                <span className="sm:hidden">Mode Admin</span>
              </p>
              <div className={`grid grid-cols-1 ${pengaturan?.mode_cabang_aktif ? 'md:grid-cols-2' : ''} gap-sm`}>
                
                {pengaturan?.mode_cabang_aktif && (
                  <div className="space-y-xs">
                    <label className="text-label-sm text-on-surface-variant block">Pilih Cabang *</label>
                    <select
                      value={adminCabangId}
                      onChange={(e) => setAdminCabangId(e.target.value)}
                      className="h-10 md:h-11 w-full px-sm md:px-md rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-sm md:text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    >
                      <option value="">-- Pilih Cabang --</option>
                      {cabangList.map((c) => (
                        <option key={c.id} value={c.id}>{c.nama}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant block">Atas Nama Kasir *</label>
                  <select
                    value={adminKasirId}
                    onChange={(e) => setAdminKasirId(e.target.value)}
                    className="h-10 md:h-11 w-full px-sm md:px-md rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-sm md:text-body-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  >
                    <option value="">-- Pilih Kasir --</option>
                    {kasirList
                      .filter(k => (!pengaturan?.mode_cabang_aktif) || !adminCabangId || k.cabang_id === adminCabangId)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_lengkap} ({k.username})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-primary-container/20 border-l-4 border-primary p-sm md:p-md rounded-r-xl overflow-hidden">
            <p
              className="text-body-sm md:text-body-lg text-primary leading-tight transition-opacity duration-500 flex items-center gap-2"
              style={{ opacity: fadeIn ? 1 : 0 }}
            >
              <span className="material-symbols-outlined text-[16px] md:text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{MOTIVASI[msgIdx].icon}</span>
              <span className="line-clamp-2 md:line-clamp-none">{MOTIVASI[msgIdx].text}</span>
            </p>
          </div>
        )}
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-sm md:gap-lg items-start print:block">

        {/* ── LEFT: Product Form ── */}
        <div className="xl:col-span-7 space-y-sm md:space-y-gutter print:hidden">
          <div className="bg-surface-container-lowest p-sm md:p-gutter lg:p-md rounded-xl shadow-sm border border-outline-variant/20">

            <h3 className="text-headline-sm md:text-headline-md text-primary mb-sm md:mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-[20px] md:text-[24px]">shopping_basket</span>
              <span className="hidden sm:inline">Tambah Barang</span>
              <span className="sm:hidden">Produk</span>
            </h3>

            <div className="space-y-sm md:space-y-md">
              {/* Dropdown Produk */}
              <div className="space-y-xs relative" ref={productDropdownRef}>
                <label className="text-label-sm md:text-label-md text-on-surface-variant block">Pilih Produk</label>
                <div
                  onClick={() => { if (!loading) setProductOpen(!productOpen); }}
                  className={`h-10 md:h-12 w-full px-sm md:px-md rounded-lg border flex items-center justify-between transition-all ${
                    loading ? "cursor-not-allowed opacity-60 bg-surface-container-low border-[#bfc9c1]" : "cursor-pointer"
                  } ${
                    productOpen ? "border-primary bg-primary-container/10 ring-2 ring-primary/20" : "border-[#bfc9c1] bg-surface-container-low hover:border-primary/50 hover:bg-surface-container"
                  }`}
                >
                  <span className={`text-body-sm md:text-body-md truncate ${selectedId ? "text-on-surface" : "text-on-surface-variant"}`}>
                    {loading ? "Memuat..."
                      : error ? "Gagal memuat"
                      : product ? (product.nama_barang || product.nama) : "Pilih produk..."}
                  </span>
                  <span className="material-symbols-outlined text-outline transition-transform duration-200 text-[20px]" style={{ transform: productOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    expand_more
                  </span>
                </div>

                {productOpen && (
                  <div className="absolute top-[100%] left-0 w-full mt-xs bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-lg z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[350px]">
                    <div className="p-sm border-b border-outline-variant/20 sticky top-0 bg-surface-container-lowest z-10 shrink-0">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: "20px" }}>search</span>
                        <input
                          type="text" placeholder="Cari nama produk..." value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full h-10 pl-10 pr-md rounded-lg border border-outline-variant/50 bg-surface-container-low text-label-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-on-surface"
                          autoFocus onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto p-xs space-y-[2px] flex-grow">
                      {products
                        .filter((p) => !productSearch || (p.nama_barang || p.nama)?.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((p) => {
                        const active = String(p.id) === String(selectedId);
                        return (
                          <div
                            key={p.id}
                            onClick={() => { 
                              setSelectedId(String(p.id)); 
                              setProductOpen(false); 
                              setProductSearch(""); 
                              setQty(1);
                              setInputValue("");
                              setInputUnit("");
                              setCatatan("");
                            }}
                            className={`flex flex-col gap-1 px-md py-sm rounded-lg cursor-pointer transition-all ${
                              active
                                ? "bg-primary text-on-primary shadow-sm"
                                : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className={`text-body-md font-semibold ${active ? "text-white" : ""}`}>{p.nama_barang || p.nama}</span>
                              <span className={`text-label-md font-bold ${active ? "text-white/90" : ""}`}>{rupiah(p.harga)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-label-sm px-xs py-[2px] rounded-md uppercase ${active ? "bg-white/20 text-white" : "bg-surface-container opacity-80"}`}>{p.satuan || "pcs"}</span>
                              {p.stok != null && <span className={`text-label-sm ${active ? "text-white/80" : "opacity-70"}`}>Sisa Stok: {p.stok}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Harga & Subtotal */}
              <div className="grid grid-cols-2 gap-xs md:gap-sm">
                <div className="space-y-xs">
                  <label className="text-label-sm md:text-label-md text-on-surface-variant block">Harga</label>
                  <div className="h-10 md:h-12 w-full rounded-lg bg-surface-container-low px-sm md:px-md flex items-center text-body-sm md:text-body-lg text-on-surface border border-outline-variant/30">
                    {rupiah(harga)}
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="text-label-sm md:text-label-md text-on-surface-variant block">Subtotal</label>
                  <div className="h-10 md:h-12 w-full rounded-lg bg-primary-container/20 px-sm md:px-md flex items-center text-body-md md:text-title-md font-bold text-primary border border-primary/20">
                    {rupiah(harga * finalQty)}
                  </div>
                </div>
              </div>

              {/* QTY & Catatan */}
              <div className="grid grid-cols-1 gap-sm">
                <div className="space-y-xs">
                  <label className="text-label-sm md:text-label-md text-on-surface-variant block">
                    Jumlah
                    {product && product.stok !== null && product.stok !== undefined && (
                      <span className="text-label-sm font-normal opacity-70 ml-1">(Stok: {product.stok})</span>
                    )}
                  </label>
                  
                  {/* Jika produk memiliki satuan berat/volume, tampilkan input dengan konversi */}
                  {needsConversion ? (
                    <div className="space-y-xs">
                      <div className="flex gap-xs">
                        <div className="flex-1 flex h-10 md:h-12 rounded-lg border border-[#bfc9c1] overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={inputValue} 
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow numbers, dot, and comma
                              if (value === '' || /^[0-9]*[.,]?[0-9]*$/.test(value)) {
                                // Replace comma with dot for decimal
                                setInputValue(value.replace(',', '.'));
                              }
                            }}
                            placeholder="0"
                            className="flex-1 text-center text-body-md md:text-body-lg bg-surface-container-lowest focus:outline-none text-on-surface px-sm" 
                          />
                        </div>
                        
                        {/* Toggle Unit Button */}
                        <div className="flex gap-xs">
                          {isWeightUnit && (
                            <>
                              <button
                                type="button"
                                onClick={() => setInputUnit("kg")}
                                className={`h-10 md:h-12 px-sm md:px-md rounded-lg text-label-sm md:text-label-md font-bold transition-all border-2 ${
                                  inputUnit === "kg"
                                    ? "bg-primary text-on-primary border-primary shadow-md"
                                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container"
                                }`}
                              >
                                KG
                              </button>
                              <button
                                type="button"
                                onClick={() => setInputUnit("gram")}
                                className={`h-10 md:h-12 px-sm md:px-md rounded-lg text-label-sm md:text-label-md font-bold transition-all border-2 ${
                                  inputUnit === "gram"
                                    ? "bg-primary text-on-primary border-primary shadow-md"
                                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container"
                                }`}
                              >
                                GRAM
                              </button>
                            </>
                          )}
                          {isVolumeUnit && (
                            <>
                              <button
                                type="button"
                                onClick={() => setInputUnit("liter")}
                                className={`h-10 md:h-12 px-sm md:px-md rounded-lg text-label-sm md:text-label-md font-bold transition-all border-2 ${
                                  inputUnit === "liter"
                                    ? "bg-primary text-on-primary border-primary shadow-md"
                                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container"
                                }`}
                              >
                                LITER
                              </button>
                              <button
                                type="button"
                                onClick={() => setInputUnit("ml")}
                                className={`h-10 md:h-12 px-sm md:px-md rounded-lg text-label-sm md:text-label-md font-bold transition-all border-2 ${
                                  inputUnit === "ml"
                                    ? "bg-primary text-on-primary border-primary shadow-md"
                                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container"
                                }`}
                              >
                                ML
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Tampilkan hasil konversi */}
                      {inputValue && inputUnit && finalQty > 0 && (
                        <div className="flex items-center gap-xs text-label-sm">
                          <span className="material-symbols-outlined text-secondary" style={{ fontSize: "16px" }}>calculate</span>
                          <span className="text-on-surface-variant">
                            = <strong className="text-secondary">{finalQty.toFixed(3)} {product.satuan}</strong>
                            {product.stok !== null && product.stok !== undefined && (
                              <span className="ml-1 opacity-70">(Sisa: {(product.stok - finalQty).toFixed(3)} {product.satuan})</span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {/* Warning jika belum pilih satuan */}
                      {inputValue && !inputUnit && (
                        <p className="text-label-sm text-tertiary flex items-center gap-xs">
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>info</span>
                          Pilih satuan (KG/GRAM atau LITER/ML)
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Input QTY biasa untuk produk non-berat/volume */
                    <div className="flex h-10 md:h-12 rounded-lg border border-[#bfc9c1] overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                      <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 md:w-12 bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors active:bg-surface-container-high">
                        <span className="material-symbols-outlined text-lg md:text-xl">remove</span>
                      </button>
                      <input 
                        type="number" 
                        min="1" 
                        max={product?.stok !== null && product?.stok !== undefined ? product.stok : undefined}
                        value={qty} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const maxQty = product?.stok !== null && product?.stok !== undefined ? product.stok : val;
                          setQty(Math.max(1, Math.min(val, maxQty)));
                        }} 
                        className="flex-1 text-center text-body-md md:text-body-lg bg-surface-container-lowest focus:outline-none text-on-surface" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setQty(q => {
                          const newQty = q + 1;
                          const maxQty = product?.stok !== null && product?.stok !== undefined ? product.stok : newQty;
                          return Math.min(newQty, maxQty);
                        })} 
                        className="w-10 md:w-12 bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors active:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-lg md:text-xl">add</span>
                      </button>
                    </div>
                  )}
                  
                  {!needsConversion && product && product.stok !== null && product.stok !== undefined && qty >= product.stok && (
                    <p className="text-label-sm text-tertiary">Maksimal stok tercapai</p>
                  )}
                </div>
                
                {/* Catatan - Hide di mobile, show di tablet+ */}
                <div className="space-y-xs hidden sm:block">
                  <label className="text-label-sm md:text-label-md text-on-surface-variant block flex items-center gap-1">Catatan <span className="text-label-sm font-normal opacity-70">(Opsional)</span></label>
                  <input type="text" value={catatan} onChange={(e) => setCatatan(e.target.value)} className="h-10 md:h-12 w-full rounded-lg border border-[#bfc9c1] bg-surface-container-low text-body-sm md:text-body-md px-sm md:px-md focus:outline-none focus:ring-2 focus:ring-primary transition-all text-on-surface placeholder:text-outline" placeholder="Cth: Less sugar, dibungkus..." />
                </div>
              </div>

              {/* Tambah ke Keranjang Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedId}
                className="w-full h-12 bg-secondary text-on-secondary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#4b6352] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                Tambahkan ke Keranjang
              </button>

            </div>
          </div>
        </div>

        {/* ── RIGHT: Cart & Checkout ── */}
        <div className="hidden xl:block xl:col-span-5 space-y-gutter print:block">
          <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-gutter md:p-md rounded-xl shadow-md border border-outline-variant/10 flex flex-col h-full print:shadow-none print:border-none">
            
            <div className="flex justify-between items-center mb-md border-b border-outline-variant/20 pb-sm">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
                <h3 className="text-headline-md text-on-surface font-bold">Keranjang</h3>
                {cart.length > 0 && (
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-label-sm font-bold flex items-center justify-center">{cart.length}</span>
                )}
              </div>
              <span className="px-sm py-xs bg-surface-container text-on-surface-variant rounded-lg text-label-sm font-mono border border-outline-variant/30">
                #{lastTx?.orderNumber || "---"}
              </span>
            </div>

            {/* Item List */}
            <div className="flex-1 min-h-[260px] max-h-[380px] overflow-y-auto space-y-xs mb-md pr-1 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-on-surface-variant gap-2">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-outline">shopping_cart</span>
                  </div>
                  <p className="text-body-md text-outline">Keranjang masih kosong</p>
                  <p className="text-label-sm text-outline/70">Pilih produk dan tekan "Tambahkan ke Keranjang"</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  // Format qty untuk display
                  const isWeightOrVolume = ["kg", "gram", "liter", "ml"].includes(item.satuan);
                  const displayQty = isWeightOrVolume && item.qty % 1 !== 0 
                    ? item.qty.toFixed(3).replace(/\.?0+$/, '') // Hapus trailing zeros
                    : item.qty;
                  
                  return (
                  <div key={idx} className="flex justify-between items-center p-md bg-surface-container-low rounded-xl border border-outline-variant/20 hover:border-primary/20 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-bold text-on-surface truncate">{item.nama}</p>
                      <p className="text-label-md text-on-surface-variant mt-0.5">
                        {rupiah(item.harga)} <span className="opacity-50">×</span> {displayQty} {item.satuan}
                      </p>
                      {item.catatan && <p className="text-label-sm text-primary italic mt-0.5 truncate">📝 {item.catatan}</p>}
                    </div>
                    <div className="flex items-center gap-sm ml-sm shrink-0">
                      <span className="text-body-md font-bold text-primary">{rupiah(item.subtotal)}</span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(idx)}
                        className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error-container rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-outline-variant/30 pt-md mt-auto space-y-md">
              
              {/* Payment Methods */}
              <div className="space-y-sm">
                <label className="text-label-md text-on-surface-variant block">Metode Pembayaran</label>
                <div className={`grid grid-cols-${[
                  pengaturan?.pembayaran_tunai_aktif,
                  pengaturan?.pembayaran_midtrans_aktif,
                  pengaturan?.pembayaran_transfer_aktif,
                  pengaturan?.pembayaran_qris_aktif
                ].filter(Boolean).length || 1} gap-sm`}>
                  {[
                    ...(pengaturan?.pembayaran_tunai_aktif ? [{ id: "tunai", label: "Tunai", icon: "payments", desc: "Bayar Langsung" }] : []),
                    ...(pengaturan?.pembayaran_midtrans_aktif ? [{ id: "midtrans", label: "Midtrans", icon: "credit_card", desc: "QRIS & E-Wallet" }] : []),
                    ...(pengaturan?.pembayaran_qris_aktif ? [{ id: "qris_manual", label: "QRIS Manual", icon: "qr_code_2", desc: "Scan Manual" }] : []),
                    ...(pengaturan?.pembayaran_transfer_aktif ? [{ id: "transfer", label: "Transfer", icon: "account_balance", desc: "Manual Bank" }] : []),
                  ].map(({ id, label, icon, desc }) => (
                    <button
                      key={id} type="button" onClick={() => pickMetode(id)}
                      className={`relative flex flex-col items-center justify-center gap-1 py-md rounded-xl border-2 font-semibold transition-all duration-200 active:scale-95 ${
                        metode === id
                          ? "bg-primary border-primary text-on-primary shadow-md scale-[1.02]"
                          : "bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant hover:border-primary/40 hover:bg-primary-container/10 hover:text-primary"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[28px] transition-all duration-200"
                        style={{ fontVariationSettings: metode === id ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {icon}
                      </span>
                      <span className="text-label-md leading-tight">{label}</span>
                      <span className={`text-[10px] leading-tight opacity-75 ${metode === id ? "text-on-primary/80" : ""}`}>{desc}</span>
                      {metode === id && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-on-primary rounded-full opacity-80"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Payment Fields */}
              <div className="min-h-[80px]">
                {metode === "tunai" && (
                  <div className="space-y-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-xs relative">
                      <label className="text-label-md text-on-surface-variant block">Uang Dibayar</label>
                      <div className="relative">
                        <span className="absolute left-md top-1/2 -translate-y-1/2 text-body-md text-on-surface font-medium">Rp</span>
                        <input 
                          type="text" 
                          value={formatRupiah(jumlahUang)} 
                          onChange={handleUangChange} 
                          className={`${inputCls} pl-12 font-medium`} 
                          placeholder="0" 
                        />
                        <button type="button" onClick={uangPas} className="absolute right-xs top-1/2 -translate-y-1/2 px-sm py-[4px] bg-primary-container text-on-primary-container text-label-sm rounded-md font-bold hover:bg-primary hover:text-on-primary transition-colors">
                          Uang Pas
                        </button>
                      </div>
                    </div>
                    {/* Quick Amounts */}
                    <div className="flex gap-xs mt-xs">
                      {QUICK_AMOUNTS.map((amt) => (
                        <button key={amt} type="button" onClick={() => { setJumlahUang(String(amt)); clearToast(); }} className="flex-1 py-[6px] border border-outline-variant/30 bg-surface-container-low text-label-sm rounded-lg hover:bg-primary-container hover:text-on-primary-container hover:border-primary/50 transition-colors">
                          {rupiah(amt).replace("Rp ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {metode === "transfer" && (
                  <div className="space-y-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-label-md text-on-surface-variant block">Bank Tujuan</label>
                    <select value={namaBank} onChange={(e) => setNamaBank(e.target.value)} className={inputCls}>
                      {bankList.length === 0 ? (
                        <option value="">Loading...</option>
                      ) : (
                        bankList.map((bank) => (
                          <option key={bank.id} value={bank.nama_bank}>
                            {bank.nama_bank} - {bank.nomor_rekening} A/N {bank.atas_nama}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
                {metode === "qris_manual" && (
                  <div className="space-y-sm animate-in fade-in slide-in-from-top-1 duration-200 text-center">
                    <p className="text-label-md text-on-surface-variant">Silakan minta pelanggan scan QRIS berikut:</p>
                    {pengaturan.qris_image_url ? (
                      <div className="flex justify-center p-md bg-white rounded-xl mx-auto border border-outline-variant/30 max-w-[200px]">
                        <img src={pengaturan.qris_image_url} alt="QRIS" className="max-w-full h-auto" />
                      </div>
                    ) : (
                      <div className="p-md bg-error-container text-on-error-container rounded-xl text-label-md border border-error/20">
                        Admin belum mengunggah gambar QRIS. Hubungi admin.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pilih Pelanggan (jika Mode Member aktif) */}
              {pengaturan.mode_member_aktif && (
                <div className="relative" ref={pelangganDropdownRef}>
                  <label className="text-label-md text-on-surface-variant block mb-1">Pelanggan / Member</label>
                  <div
                    onClick={() => setPelangganOpen(!pelangganOpen)}
                    className="h-11 w-full px-md rounded-lg border border-[#bfc9c1] bg-surface-container-low flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
                      <span className={`text-body-sm truncate ${selectedPelanggan ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                        {selectedPelanggan ? `${selectedPelanggan.nama} (${Number(selectedPelanggan.point).toLocaleString('id-ID')} poin)` : 'Pilih Pelanggan (Opsional)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {selectedPelanggan && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedPelanggan(null); setGunakanPoin(false); }}
                          className="w-5 h-5 rounded-full bg-outline/30 flex items-center justify-center hover:bg-error hover:text-on-error transition-colors">
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      )}
                      <span className="material-symbols-outlined text-outline text-[20px]" style={{ transform: pelangganOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>expand_more</span>
                    </div>
                  </div>
                  {pelangganOpen && (
                    <div className="absolute top-[100%] left-0 w-full mt-1 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-lg z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-outline-variant/20">
                        <input
                          type="text" placeholder="Cari nama / HP..." value={pelangganSearch}
                          onChange={(e) => setPelangganSearch(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-outline-variant/50 bg-surface-container-low text-label-md focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                          autoFocus onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto p-1">
                        {pelangganList
                          .filter(p => !pelangganSearch || p.nama?.toLowerCase().includes(pelangganSearch.toLowerCase()) || p.no_hp?.includes(pelangganSearch))
                          .map(p => (
                            <div key={p.id}
                              onClick={() => { setSelectedPelanggan(p); setPelangganOpen(false); setPelangganSearch(""); }}
                              className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-primary-container/30 text-on-surface transition-colors"
                            >
                              <div>
                                <p className="text-label-md font-medium">{p.nama}</p>
                                <p className="text-label-sm text-on-surface-variant">{p.no_hp || '-'}</p>
                              </div>
                              <span className="text-label-sm font-bold text-primary bg-primary-container px-2 py-0.5 rounded-full">{Number(p.point).toLocaleString('id-ID')} poin</span>
                            </div>
                          ))
                        }
                        {pelangganList.length === 0 && <p className="text-center p-3 text-label-sm text-on-surface-variant">Belum ada data pelanggan</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Gunakan Poin */}
              {pengaturan.mode_member_aktif && pengaturan.member_bisa_tukar_diskon && selectedPelanggan && Number(selectedPelanggan.point) > 0 && (
                <div className="flex items-center justify-between p-sm rounded-xl bg-tertiary-container/20 border border-tertiary/20">
                  <div>
                    <p className="text-label-md font-medium text-on-surface">Gunakan Poin</p>
                    <p className="text-label-sm text-on-surface-variant">Tukar {poinBisaDipakai} poin → hemat {rupiah(poinBisaDipakai * pengaturan.member_rasio_tukar_poin)}</p>
                  </div>
                  <button type="button" onClick={() => setGunakanPoin(!gunakanPoin)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${ gunakanPoin ? 'bg-tertiary' : 'bg-outline/40'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${gunakanPoin ? 'left-6' : 'left-0.5'}`}></span>
                  </button>
                </div>
              )}

              {/* Totals */}
              <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 space-y-2">
                <div className="flex justify-between items-center text-body-md text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{rupiah(totalCart)}</span>
                </div>
                {diskonGlobalRp > 0 && (
                  <div className="flex justify-between items-center text-body-sm text-secondary">
                    <span>🎉 {pengaturan.diskon_global_nama} ({pengaturan.diskon_global_persen}%)</span>
                    <span>- {rupiah(diskonGlobalRp)}</span>
                  </div>
                )}
                {diskonPoinRp > 0 && (
                  <div className="flex justify-between items-center text-body-sm text-tertiary">
                    <span>⭐ Tukar {poinDipakai} Poin</span>
                    <span>- {rupiah(diskonPoinRp)}</span>
                  </div>
                )}
                {metode === "tunai" && (
                  <div className="flex justify-between items-center text-body-md text-on-surface-variant">
                    <span>Uang Diterima</span>
                    <span className={bayar < totalSetelahDiskon ? "text-error" : ""}>{rupiah(bayar)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-outline-variant/40 pt-2 flex justify-between items-end">
                  <span className="text-title-md font-bold text-on-surface">TOTAL</span>
                  <span className="text-display-sm font-bold text-primary tracking-tight">
                    {rupiah(totalSetelahDiskon)}
                  </span>
                </div>
                {poinDidapat > 0 && (
                  <div className="flex items-center justify-between bg-primary-container/20 px-2 py-1 rounded-lg">
                    <span className="text-label-sm text-on-surface-variant">⭐ Poin didapat transaksi ini</span>
                    <span className="text-label-sm font-bold text-primary">+{poinDidapat} Poin</span>
                  </div>
                )}
                {metode === "tunai" && kembalian !== null && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-label-md font-bold text-secondary">Kembalian</span>
                    <span className="text-title-md font-bold text-secondary bg-secondary-container px-2 py-1 rounded-md">
                      {rupiah(kembalian)}
                    </span>
                  </div>
                )}
              </div>

              {/* Toast */}
              {toast && (
                <div className={`p-sm rounded-lg text-label-md text-center animate-in fade-in slide-in-from-bottom-2 ${toast.type === "error" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}`}>
                  {toast.msg}
                </div>
              )}

              {/* Checkout Button */}
              <button
                type="submit"
                disabled={submitting || totalCart === 0 || (isAdmin && ((pengaturan?.mode_cabang_aktif && !adminCabangId) || !adminKasirId))}
                className={`w-full h-14 rounded-xl text-title-md font-bold flex justify-center items-center gap-sm shadow-md transition-all ${
                  submitting || totalCart === 0 || (isAdmin && ((pengaturan?.mode_cabang_aktif && !adminCabangId) || !adminKasirId))
                    ? "bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-70"
                    : "bg-primary text-on-primary hover:shadow-lg hover:opacity-90 active:scale-95"
                }`}
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    Memproses...
                  </>
                ) : (isAdmin && ((pengaturan?.mode_cabang_aktif && !adminCabangId) || !adminKasirId)) ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    Pilih {pengaturan?.mode_cabang_aktif ? "Cabang & " : ""}Kasir
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Proses Transaksi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ReceiptModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        submitting={submitting}
        transaksi={lastTx} 
      />

      <SuccessModal
        isOpen={successModal}
        onClose={handleCloseSuccess}
        onPrint={handlePrintStruk}
        lastTx={lastTx}
        message="Transaksi berhasil disimpan!"
      />

      {/* ── PRINT AREA untuk Success Modal (hidden on screen) ── */}
      {lastTx && (
        <div id="success-receipt-print-area" style={{ display: "none" }}>
          <div style={{ 
            fontFamily: "'Courier New', monospace", 
            fontSize: "12px", 
            color: "#000",
            padding: "20px",
            maxWidth: "300px",
            margin: "0 auto"
          }}>
            <div style={{ 
              textAlign: "center", 
              borderBottom: "2px dashed #000", 
              paddingBottom: "12px", 
              marginBottom: "12px" 
            }}>
              <h1 style={{ 
                fontSize: "18px", 
                fontWeight: "bold", 
                textTransform: "uppercase", 
                letterSpacing: "2px", 
                margin: "0 0 4px" 
              }}>{(lastTx.namaToko || "Toko Senin").toUpperCase()}</h1>
              {lastTx.namaCabang && <p style={{ fontWeight: "bold", margin: "2px 0" }}>{lastTx.namaCabang}</p>}
              <p style={{ marginTop: "6px", margin: "6px 0 2px" }}>Order: #{lastTx.orderNumber}</p>
            </div>

            {lastTx.items?.map((item, idx) => (
              <div key={idx} style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                  <span style={{ fontWeight: "bold" }}>{item.nama}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                  <span>{item.qty} {item.satuan} × Rp {item.harga?.toLocaleString("id-ID")}</span>
                  <span>{rupiah(item.subtotal)}</span>
                </div>
              </div>
            ))}

            <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }}></div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>Subtotal</span>
              <span>{rupiah(lastTx.totalHarga)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>Pajak</span>
              <span>Rp 0 (Incl.)</span>
            </div>
            <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }}></div>
            <div style={{ 
              fontSize: "16px", 
              fontWeight: "bold", 
              display: "flex", 
              justifyContent: "space-between", 
              margin: "8px 0" 
            }}>
              <span>TOTAL</span>
              <span>{rupiah(lastTx.totalHarga)}</span>
            </div>

            <div style={{ 
              fontSize: "11px", 
              borderTop: "1px dashed #000", 
              paddingTop: "10px", 
              marginTop: "10px" 
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                <span>Waktu</span>
                <span>{lastTx.waktu}</span>
              </div>
              <div className="flex justify-between margin-4-0">
                <span>Metode</span>
                <span>{lastTx.metode === "tunai" ? "Tunai" : lastTx.metode === "midtrans" ? "Midtrans" : lastTx.metode === "qris_manual" ? "QRIS Manual" : `Transfer — ${lastTx.namaBank || ""}`}</span>
              </div>
              {lastTx.metode === "tunai" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                    <span>Tunai</span>
                    <span>{rupiah(lastTx.jumlahBayar)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                    <span>Kembalian</span>
                    <span>{rupiah(lastTx.kembalian)}</span>
                  </div>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                <span>Kasir</span>
                <span>{lastTx.namaKasir}</span>
              </div>
              {lastTx.namaCabang && (
                <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                  <span>Cabang</span>
                  <span>{lastTx.namaCabang}</span>
                </div>
              )}
            </div>

            <div style={{ 
              textAlign: "center", 
              marginTop: "16px", 
              fontSize: "11px", 
              opacity: "0.7" 
            }}>
              <p style={{ margin: "4px 0" }}>— Terima kasih sudah berbelanja —</p>
              <p style={{ margin: "4px 0" }}>Barang yang sudah dibeli tidak dapat dikembalikan</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) - Mobile/Tablet Only */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="xl:hidden fixed bottom-6 right-4 w-16 h-16 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all duration-200 animate-in zoom-in"
        >
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            shopping_cart
          </span>
          {/* Badge */}
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-error text-on-error rounded-full flex items-center justify-center text-label-sm font-bold shadow-md">
            {cart.length}
          </span>
        </button>
      )}

      {/* Mobile Cart Modal */}
      <MobileCartModal
        isOpen={showMobileCart}
        onClose={() => setShowMobileCart(false)}
        cart={cart}
        onRemoveItem={removeFromCart}
        metode={metode}
        onChangeMetode={pickMetode}
        jumlahUang={jumlahUang}
        onChangeJumlahUang={setJumlahUang}
        namaBank={namaBank}
        onChangeNamaBank={setNamaBank}
        bankList={bankList}
        totalCart={totalCart}
        bayar={bayar}
        kembalian={kembalian}
        onSubmit={handleSubmit}
        toast={toast}
        onUangPas={uangPas}
        formatRupiah={formatRupiah}
        isAdmin={isAdmin}
        adminCabangId={adminCabangId}
        adminKasirId={adminKasirId}
        pembayaranTunaiAktif={pengaturan.pembayaran_tunai_aktif}
        pembayaranMidtransAktif={pengaturan.pembayaran_midtrans_aktif}
        pembayaranQrisAktif={pengaturan.pembayaran_qris_aktif}
        pembayaranTransferAktif={pengaturan.pembayaran_transfer_aktif}
        qrisImageUrl={pengaturan.qris_image_url}
        modeCabangAktif={pengaturan.mode_cabang_aktif}
      />

      {/* Midtrans Payment Modal */}
      <MidtransPaymentModal
        isOpen={midtransModalOpen}
        onClose={() => setMidtransModalOpen(false)}
        transactionData={lastTx?._payload || {}}
        onSuccess={handleMidtransSuccess}
        onPending={handleMidtransPending}
        onError={handleMidtransError}
        onCancel={handleMidtransCancel}
      />
    </main>
  );
}
