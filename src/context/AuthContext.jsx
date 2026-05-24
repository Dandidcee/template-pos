import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [kasir, setKasir] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek localStorage saat pertama kali dimuat
    const storedKasir = localStorage.getItem("kasir_aktif");
    if (storedKasir) {
      try {
        setKasir(JSON.parse(storedKasir));
      } catch (err) {
        localStorage.removeItem("kasir_aktif");
      }
    }
    setLoading(false);
  }, []);

  const login = (kasirData) => {
    setKasir(kasirData);
    localStorage.setItem("kasir_aktif", JSON.stringify(kasirData));
  };

  const logout = () => {
    setKasir(null);
    localStorage.removeItem("kasir_aktif");
  };

  return (
    <AuthContext.Provider value={{ kasir, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
