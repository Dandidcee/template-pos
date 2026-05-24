import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import TopNav from "./components/TopNav";
import SideNav from "./components/SideNav";
import KasirPage from "./components/KasirPage";
import RiwayatPage from "./pages/RiwayatPage";
import StokPage from "./pages/StokPage";
import LaporanPage from "./pages/LaporanPage";
import LaporanKeuntunganPage from "./pages/LaporanKeuntunganPage";
import PengaturanPage from "./pages/PengaturanPage";
import NotifikasiPage from "./pages/NotifikasiPage";
import ManajemenKasirPage from "./pages/ManajemenKasirPage";
import ManajemenBankPage from "./pages/ManajemenBankPage";
import ManajemenCabangPage from "./pages/ManajemenCabangPage";
import ManajemenPelangganPage from "./pages/ManajemenPelangganPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

function MainApp() {
  const { kasir } = useAuth();
  const location = useLocation();
  const [sideNavOpen, setSideNavOpen] = useState(false);

  // Auto-close sidebar saat route change (mobile)
  useEffect(() => {
    setSideNavOpen(false);
  }, [location.pathname]);

  if (!kasir) {
    return <LoginPage />;
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <div className="print:hidden"><TopNav onMenuToggle={() => setSideNavOpen(!sideNavOpen)} /></div>
      <div className="print:hidden"><SideNav isOpen={sideNavOpen} onClose={() => setSideNavOpen(false)} /></div>
      <Routes>
        <Route path="/"         element={<KasirPage />} />
        <Route path="/riwayat"  element={<RiwayatPage />} />
        <Route path="/stok"     element={<StokPage />} />
        <Route path="/laporan"  element={<LaporanPage />} />
        <Route path="/laporan-keuntungan" element={<LaporanKeuntunganPage />} />
        <Route path="/notifikasi" element={<NotifikasiPage />} />
        <Route path="/manajemen-kasir" element={<ManajemenKasirPage />} />
        <Route path="/manajemen-bank" element={<ManajemenBankPage />} />
        <Route path="/manajemen-cabang" element={<ManajemenCabangPage />} />
        <Route path="/manajemen-pelanggan" element={<ManajemenPelangganPage />} />
        <Route path="/pengaturan" element={<PengaturanPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  );
}
