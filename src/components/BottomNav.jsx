import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import TutupShiftModal from "./TutupShiftModal";
import AlertModal from "./AlertModal";

const items = [
  { to: "/",        icon: "point_of_sale", label: "Kasir",   adminOnly: false },
  { to: "/riwayat", icon: "history",       label: "Riwayat", adminOnly: false },
  { to: "/stok",    icon: "inventory_2",   label: "Stok",    adminOnly: false },
  { to: "/laporan", icon: "analytics",     label: "Laporan", adminOnly: false },
];

// Menu tambahan untuk admin (ditampilkan di hamburger menu)
const adminMenuItems = [
  { to: "/laporan-keuntungan", icon: "trending_up",      label: "Laporan Keuntungan" },
  { to: "/manajemen-kasir",    icon: "manage_accounts", label: "Manajemen Kasir" },
  { to: "/manajemen-bank",     icon: "account_balance", label: "Manajemen Bank" },
];

export default function BottomNav() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";
  const [shiftAktif, setShiftAktif] = useState(false);
  const [tutupShiftOpen, setTutupShiftOpen] = useState(false);
  const [mulaiShiftOpen, setMulaiShiftOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Hamburger menu state
  
  // Modal state
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "info" });

  // Cek apakah ada shift aktif (hanya untuk kasir)
  useEffect(() => {
    if (kasir && !isAdmin) {
      const shiftMulai = localStorage.getItem(`shift_mulai_${kasir.id}`);
      setShiftAktif(!!shiftMulai);
    }
  }, [kasir, isAdmin]);

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

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden bg-surface border-t border-outline-variant/20 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]" 
        style={{ 
          position: 'fixed', 
          bottom: 0,
          touchAction: 'none',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)'
        }}
      >
        <div className="flex items-stretch h-16">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex-1"
            >
              {({ isActive }) => (
                <div className={`flex flex-col items-center justify-center h-full gap-[2px] relative transition-colors
                  ${isActive ? "text-primary" : "text-on-surface-variant"}`}>

                  {/* Active indicator bar at top */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-full" />
                  )}

                  {/* Icon with subtle pill bg when active */}
                  <span
                    className={`material-symbols-outlined transition-all text-[22px] ${
                      isActive
                        ? "text-primary"
                        : "text-on-surface-variant"
                    }`}
                    style={{
                      fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                      fontSize: "22px",
                    }}
                  >
                    {item.icon}
                  </span>

                  {/* Label */}
                  <span className={`text-[11px] leading-none font-semibold tracking-wide ${
                    isActive ? "text-primary" : "text-on-surface-variant"
                  }`}>
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}

          {/* Tombol Shift - Hanya untuk Kasir */}
          {!isAdmin && (
            <button
              onClick={() => shiftAktif ? setTutupShiftOpen(true) : setMulaiShiftOpen(true)}
              className="flex-1"
            >
              <div className={`flex flex-col items-center justify-center h-full gap-[2px] relative transition-colors ${
                shiftAktif ? "text-error" : "text-secondary"
              }`}>
                <span
                  className="material-symbols-outlined transition-all text-[22px]"
                  style={{
                    fontVariationSettings: "'FILL' 1, 'wght' 600",
                    fontSize: "22px",
                  }}
                >
                  {shiftAktif ? "stop_circle" : "play_circle"}
                </span>
                <span className="text-[11px] leading-none font-semibold tracking-wide">
                  {shiftAktif ? "Tutup" : "Mulai"}
                </span>
              </div>
            </button>
          )}

          {/* Hamburger Menu - Hanya untuk Admin */}
          {isAdmin && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex-1"
            >
              <div className={`flex flex-col items-center justify-center h-full gap-[2px] relative transition-colors ${
                menuOpen ? "text-primary" : "text-on-surface-variant"
              }`}>
                {menuOpen && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-full" />
                )}
                <span
                  className="material-symbols-outlined transition-all text-[22px]"
                  style={{
                    fontVariationSettings: menuOpen ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                    fontSize: "22px",
                  }}
                >
                  {menuOpen ? "close" : "menu"}
                </span>
                <span className="text-[11px] leading-none font-semibold tracking-wide">
                  Menu
                </span>
              </div>
            </button>
          )}
        </div>
      </nav>

      {/* Hamburger Menu Popup - Admin Only */}
      {isAdmin && menuOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div 
            className="fixed bottom-16 left-0 right-0 bg-surface rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-md border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <h3 className="text-headline-md text-on-surface font-bold flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
                  Menu Admin
                </h3>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>
            </div>
            <div className="p-sm max-h-[60vh] overflow-y-auto">
              {adminMenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-sm px-md py-md rounded-xl transition-all mb-xs ${
                      isActive
                        ? "bg-primary-container text-on-primary-container font-bold"
                        : "text-on-surface hover:bg-surface-container"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`material-symbols-outlined text-2xl ${isActive ? "text-primary" : "text-on-surface-variant"}`}
                        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {item.icon}
                      </span>
                      <span className="text-body-md flex-1">{item.label}</span>
                      {isActive && (
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Mulai Shift */}
      {mulaiShiftOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-secondary text-on-secondary p-md flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-3xl">play_circle</span>
                <h2 className="text-headline-md font-bold">Mulai Shift</h2>
              </div>
              <button
                onClick={() => setMulaiShiftOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-on-secondary/10 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-md">
              <p className="text-body-md text-on-surface mb-md">
                Apakah Anda siap untuk memulai shift hari ini?
              </p>
              <div className="bg-surface-container-lowest rounded-xl p-md mb-md border border-outline-variant/20">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-primary">person</span>
                  <p className="text-label-md text-on-surface-variant">Kasir</p>
                </div>
                <p className="text-headline-sm text-on-surface font-bold">{kasir?.nama_lengkap}</p>
                <p className="text-label-sm text-on-surface-variant mt-xs">
                  Waktu: {new Date().toLocaleString("id-ID", { 
                    day: "2-digit", 
                    month: "long", 
                    year: "numeric", 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </p>
              </div>
              <div className="flex gap-sm">
                <button
                  onClick={() => setMulaiShiftOpen(false)}
                  className="flex-1 h-12 border-2 border-outline-variant text-on-surface rounded-xl text-label-md font-bold hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleMulaiShift}
                  className="flex-1 h-12 bg-secondary text-on-secondary rounded-xl text-label-md font-bold flex items-center justify-center gap-sm shadow-sm hover:shadow-md hover:opacity-90 transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>check_circle</span>
                  Mulai Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tutup Shift - Di luar nav agar full-screen */}
      <TutupShiftModal 
        isOpen={tutupShiftOpen} 
        onClose={() => setTutupShiftOpen(false)}
        onSuccess={handleTutupShiftSuccess}
        kasir={kasir}
      />

      {/* Modal Alert - Di luar nav agar full-screen */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}
