import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Cari username dan password yang cocok di tabel kasir, sertakan data cabang
      const { data, error: fetchError } = await supabase
        .from("kasir")
        .select(`*, cabang:cabang_id(*)`)
        .eq("username", username)
        .eq("password", password)
        .single();

      if (fetchError || !data) {
        throw new Error("Username atau Password salah!");
      }

      // Berhasil login
      login(data);
    } catch (err) {
      setError(err.message || "Gagal masuk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-md p-lg rounded-2xl shadow-xl border border-outline-variant/20">
        
        {/* Header */}
        <div className="text-center mb-lg">
          <div className="w-16 h-16 bg-primary text-on-primary rounded-full flex items-center justify-center mx-auto mb-md shadow-md">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
          </div>
          <h1 className="text-headline-lg text-on-surface">Toko Senin</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">Masuk ke Sistem Kasir</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-md">
          {error && (
            <div className="p-sm bg-error-container text-on-error-container text-body-sm rounded-lg flex items-start gap-xs animate-in shake">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-xs">
            <label className="text-label-md text-on-surface-variant">Username</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant">person</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 pl-12 pr-md rounded-lg border border-outline-variant/50 bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface transition-all"
                placeholder="Masukkan username"
              />
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-label-md text-on-surface-variant">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant">lock</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-md rounded-lg border border-outline-variant/50 bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface transition-all"
                placeholder="Masukkan password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-12 mt-md rounded-full font-semibold text-label-lg flex items-center justify-center gap-xs transition-all ${
              loading ? "bg-primary/70 cursor-not-allowed text-on-primary" : "bg-primary hover:opacity-90 text-on-primary shadow-md hover:shadow-lg"
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                Masuk Shift
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-label-sm text-on-surface-variant mt-lg">
          Hubungi Administrator jika lupa sandi
        </p>
      </div>
    </div>
  );
}
