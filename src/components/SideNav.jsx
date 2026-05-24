import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import TutupShiftModal from "./TutupShiftModal";
import AlertModal from "./AlertModal";
import { fetchPengaturan } from "../services/productService";

const navItems = [
  { to: "/",          icon: "point_of_sale", label: "Kasir",             filled: true,  adminOnly: false },
  { to: "/riwayat",   icon: "receipt_long",  label: "Riwayat Transaksi", filled: false, adminOnly: false },
  { to: "/stok",      icon: "inventory_2",   label: "Manajemen Stok",    filled: false, adminOnly: false },
  { to: "/laporan",   icon: "analytics",     label: "Laporan Penjualan", filled: false, adminOnly: false },
  { to: "/laporan-keuntungan", icon: "trending_up", label: "Laporan Keuntungan", filled: false, adminOnly: true },
  { to: "/manajemen-kasir", icon: "manage_accounts", label: "Manajemen Kasir", filled: false, adminOnly: true },
  { to: "/manajemen-cabang", icon: "store", label: "Manajemen Cabang", filled: false, adminOnly: true, cabangOnly: true },
  { to: "/manajemen-pelanggan", icon: "group", label: "Pelanggan & Member", filled: false, adminOnly: true, memberOnly: true },
  { to: "/manajemen-bank", icon: "account_balance", label: "Manajemen Bank", filled: false, adminOnly: true },
  { to: "/pengaturan", icon: "settings", label: "Pengaturan", filled: false, adminOnly: true },
];

export default function SideNav({ isOpen, onClose }) {
  const { kasir, logout } = useAuth();
  const isAdmin = kasir?.role === "admin";
  const [tutupShiftOpen, setTutupShiftOpen] = useState(false);
  const [mulaiShiftOpen, setMulaiShiftOpen] = useState(false);
  const [shiftAktif, setShiftAktif] = useState(false);
  const [modeCabangAktif, setModeCabangAktif] = useState(true);
  const [modeMemberAktif, setModeMemberAktif] = useState(false);
  
  // Modal state
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });

  // Cek apakah ada shift aktif & ambil pengaturan
  useEffect(() => {
    const shiftMulai = localStorage.getItem(`shift_mulai_${kasir?.id}`);
    setShiftAktif(!!shiftMulai);

    fetchPengaturan().then(res => {
      setModeCabangAktif(res?.mode_cabang_aktif ?? true);
      setModeMemberAktif(res?.mode_member_aktif ?? false);
    }).catch(() => {});
  }, [kasir]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleMulaiShift = () => {
    const now = new Date().toISOString();
    localStorage.setItem(`shift_mulai_${kasir?.id}`, now);
    setShiftAktif(true);
    setMulaiShiftOpen(false);
    setAlertModal({
      isOpen: true,
      title: "Shift Dimulai",
      message: "Shift dimulai! Selamat bekerja.",
      type: "success"
    });
  };

  const handleTutupShiftSuccess = () => {
    localStorage.removeItem(`shift_mulai_${kasir?.id}`);
    setShiftAktif(false);
    setTutupShiftOpen(false);
  };

  const handleNavClick = () => {
    // Close mobile menu when nav item is clicked
    if (onClose) onClose();
  };

  return (
    <>
      {/* Backdrop - Mobile Only */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[95] lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-16 w-[280px] h-[calc(100vh-4rem)] bg-surface-container-low shadow-md border-outline-variant/10 z-[96] flex flex-col
        right-0 lg:right-auto lg:left-0
        border-l lg:border-l-0 lg:border-r
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
      `}>

        {/* Nav links */}
        <nav className="flex-grow py-md space-y-sm overflow-y-auto px-sm">
          {navItems
            .filter(item => !item.adminOnly || isAdmin)
            .filter(item => !item.cabangOnly || modeCabangAktif)
            .filter(item => !item.memberOnly || modeMemberAktif)
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-xs px-md py-sm rounded-xl text-label-md transition-all duration-200 border-2 ${
                  isActive
                    ? "bg-primary text-on-primary border-primary shadow-md scale-105 font-bold"
                    : "bg-surface-container text-on-surface-variant border-transparent hover:bg-surface-container-high hover:border-outline-variant/30"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: isActive && item.filled ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-label-md">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mulai/Tutup Shift - Hanya untuk Kasir */}
        {!isAdmin && (
          <div className="px-sm pb-md space-y-sm">
            {!shiftAktif ? (
              <button 
                onClick={() => setMulaiShiftOpen(true)}
                className="w-full py-sm px-md bg-secondary text-on-secondary rounded-xl text-label-md flex items-center justify-center gap-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>play_circle</span>
                Mulai Shift
              </button>
            ) : (
              <button 
                onClick={() => setTutupShiftOpen(true)}
                className="w-full py-sm px-md bg-surface-container-lowest border-2 border-primary text-primary rounded-xl text-label-md flex items-center justify-center gap-sm shadow-sm hover:bg-primary hover:text-on-primary hover:shadow-md transition-all active:scale-95"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>stop_circle</span>
                Tutup Shift
              </button>
            )}
          </div>
        )}

        {/* Footer links */}
        <footer className="border-t border-outline-variant/20 py-sm space-y-sm px-sm pb-20 lg:pb-sm">
          <div className="px-md py-sm mb-xs bg-primary-container/20 rounded-xl flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-md shrink-0">
              {kasir?.nama_lengkap?.charAt(0).toUpperCase() || "K"}
            </div>
            <div className="overflow-hidden">
              <p className="text-label-md text-on-surface truncate">{kasir?.nama_lengkap || "Kasir"}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{kasir?.role || "kasir"}</p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-xs px-md py-sm rounded-xl text-label-md text-error bg-error-container/20 hover:bg-error-container/40 border-2 border-transparent hover:border-error/30 transition-all duration-200"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>logout</span>
            <span>Tutup Shift</span>
          </button>
        </footer>

      </aside>

      {/* Modal Tutup Shift - Di luar sidebar agar full-screen */}
      <TutupShiftModal 
        isOpen={tutupShiftOpen} 
        onClose={() => setTutupShiftOpen(false)}
        onSuccess={handleTutupShiftSuccess}
        kasir={kasir}
      />

      {/* Modal Alert - Di luar sidebar agar full-screen */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Modal Mulai Shift - Di luar sidebar agar full-screen */}
      {mulaiShiftOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-secondary text-on-secondary p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">play_circle</span>
                <h2 className="text-title-lg sm:text-headline-md font-bold">Mulai Shift</h2>
              </div>
              <button
                onClick={() => setMulaiShiftOpen(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-on-secondary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-4 sm:p-md">
              <p className="text-body-sm sm:text-body-md text-on-surface mb-4">
                Apakah Anda siap untuk memulai shift hari ini?
              </p>
              <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-md mb-4 border border-outline-variant/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-xl">person</span>
                  <p className="text-label-sm sm:text-label-md text-on-surface-variant">Kasir</p>
                </div>
                <p className="text-title-md sm:text-headline-sm text-on-surface font-bold">{kasir?.nama_lengkap}</p>
                <p className="text-label-xs sm:text-label-sm text-on-surface-variant mt-1">
                  Waktu: {new Date().toLocaleString("id-ID", { 
                    day: "2-digit", 
                    month: "short", 
                    year: "numeric", 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </p>
              </div>
              <div className="flex gap-2 sm:gap-sm">
                <button
                  onClick={() => setMulaiShiftOpen(false)}
                  className="flex-1 h-11 sm:h-12 border-2 border-outline-variant text-on-surface rounded-xl text-label-sm sm:text-label-md font-bold hover:bg-surface-container transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={handleMulaiShift}
                  className="flex-1 h-11 sm:h-12 bg-secondary text-on-secondary rounded-xl text-label-sm sm:text-label-md font-bold flex items-center justify-center gap-1 sm:gap-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg sm:text-xl">check_circle</span>
                  Mulai Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
