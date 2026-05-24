import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchPengaturan } from "../services/productService";

export default function TopNav({ onMenuToggle }) {
  const { kasir } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [namaTokoGlobal, setNamaTokoGlobal] = useState("Toko Senin");
  
  useEffect(() => {
    async function load() {
      const p = await fetchPengaturan();
      if (p) setNamaTokoGlobal(p.nama_toko || "Toko Senin");
    }
    load();

    const handleRefresh = async () => {
      const p = await fetchPengaturan();
      if (p) setNamaTokoGlobal(p.nama_toko || "Toko Senin");
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
  
  // Load unread notifications count
  useEffect(() => {
    async function loadUnreadCount() {
      if (!kasir) return;
      
      const { count } = await supabase
        .from("notifikasi")
        .select("*", { count: "exact", head: true })
        .eq("kasir_id", kasir.id)
        .eq("dibaca", false);
      
      setUnreadCount(count || 0);
    }
    
    loadUnreadCount();
    
    // Refresh every 10 seconds (lebih sering untuk responsif)
    const interval = setInterval(loadUnreadCount, 10000);
    
    // Listen to custom event for immediate refresh
    const handleRefresh = () => loadUnreadCount();
    window.addEventListener('refreshNotifications', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, [kasir]);
  
  return (
    <header className="flex justify-between items-center w-full px-margin-page h-16 z-[100] fixed top-0 left-0 right-0 bg-surface border-b border-outline-variant/20 shadow-sm">

      {/* Brand */}
      <div className="flex items-center gap-sm shrink-0">
        <span
          className="material-symbols-outlined text-primary text-3xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          storefront
        </span>
        <span className="text-headline-md font-bold text-primary">{namaTokoGlobal}</span>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-xs shrink-0">
        <div className="hidden sm:flex flex-col items-end mr-2">
          <span className="text-label-md text-on-surface font-semibold">{kasir?.nama_lengkap || "Kasir"}</span>
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">{kasir?.role || "kasir"}</span>
        </div>
        <NavLink
          to="/notifikasi"
          className={({ isActive }) =>
            `relative material-symbols-outlined p-2 rounded-full transition-colors ${
              isActive
                ? "text-on-primary bg-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span 
                className={unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}
                style={{ 
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  display: 'block'
                }}
              >
                notifications
              </span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full border-2 border-surface animate-pulse" />
              )}
            </>
          )}
        </NavLink>
        {/* Hamburger Menu Button - Mobile Only */}
        <button 
          onClick={onMenuToggle}
          className="material-symbols-outlined text-on-surface-variant p-2 hover:bg-surface-container-high rounded-full transition-colors lg:hidden"
          title="Menu"
        >
          menu
        </button>
      </div>
    </header>
  );
}
