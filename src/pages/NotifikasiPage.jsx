import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { rupiah } from "../config";
import { useAuth } from "../context/AuthContext";

export default function NotifikasiPage() {
  const { kasir } = useAuth();
  const isAdmin = kasir?.role === "admin";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [lastLoadTime, setLastLoadTime] = useState(null);

  // Load read status dari localStorage (memoized)
  const getReadNotifications = useCallback(() => {
    try {
      const stored = localStorage.getItem(`notif_read_${kasir?.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [kasir?.id]);

  // Save read status ke localStorage (memoized)
  const saveReadNotifications = useCallback((readIds) => {
    try {
      localStorage.setItem(`notif_read_${kasir?.id}`, JSON.stringify(readIds));
    } catch (err) {
      console.error("Error saving read notifications:", err);
    }
  }, [kasir?.id]);

  // Load notifications dengan caching (hanya load jika belum pernah atau sudah 5 menit)
  const loadNotifications = useCallback(async () => {
    // Cek apakah perlu reload (jika belum pernah load atau sudah lebih dari 5 menit)
    const now = Date.now();
    if (lastLoadTime && (now - lastLoadTime) < 300000) { // 5 menit
      return; // Skip reload jika masih fresh
    }

    setLoading(true);
    try {
      let query = supabase
        .from("transaksi")
        .select("id, order_number, total_harga, nama_kasir, nama_cabang, created_at")
        .order("created_at", { ascending: false })
        .limit(20); // Kurangi dari 50 ke 20

      if (!isAdmin && kasir?.cabang_id) {
        query = query.eq("cabang_id", kasir.cabang_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Load read status dari localStorage
      const readIds = getReadNotifications();

      const notifs = (data || []).map((t) => ({
        id: t.id,
        type: "transaksi",
        title: `Transaksi ${t.order_number}`,
        message: `${t.nama_kasir} melakukan transaksi ${rupiah(t.total_harga)}`,
        time: t.created_at,
        read: readIds.includes(t.id),
        icon: "receipt_long",
        color: "text-primary",
        bgColor: "bg-primary-container/20",
        cabang: t.nama_cabang,
      }));

      setNotifications(notifs);
      setLastLoadTime(now);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, kasir?.cabang_id, lastLoadTime, getReadNotifications]);

  useEffect(() => {
    if (kasir) {
      loadNotifications();
    }
  }, [kasir, loadNotifications]);

  // Memoize filtered notifications
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "semua") return true;
      if (filter === "belum") return !n.read;
      if (filter === "sudah") return n.read;
      return true;
    });
  }, [notifications, filter]);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      // Save ke localStorage
      const readIds = updated.filter(n => n.read).map(n => n.id);
      saveReadNotifications(readIds);
      return updated;
    });
  }, [saveReadNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      // Save ke localStorage
      const readIds = updated.map(n => n.id);
      saveReadNotifications(readIds);
      return updated;
    });
  }, [saveReadNotifications]);

  // Memoize getTimeAgo function
  const getTimeAgo = useCallback((dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }, []);

  return (
    <main className="pt-20 pb-8 lg:ml-[280px] px-4 md:px-margin-page min-h-[100dvh]">
      {/* Header */}
      <section className="mb-lg max-w-4xl">
        <h2 className="text-headline-lg text-on-surface mb-xs">Notifikasi</h2>
        <div className="bg-primary-container/20 border-l-4 border-primary p-md rounded-r-xl">
          <p className="text-body-lg text-primary">
            Pantau aktivitas transaksi dan update terbaru dari sistem.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter mb-lg max-w-4xl">
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-primary mb-xs block opacity-70">notifications</span>
          <p className="text-headline-md text-on-surface font-bold">{notifications.length}</p>
          <p className="text-label-sm text-on-surface-variant">Total Notifikasi</p>
        </div>
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-3xl text-secondary mb-xs block opacity-70">mark_email_unread</span>
          <p className="text-headline-md text-on-surface font-bold">{notifications.filter((n) => !n.read).length}</p>
          <p className="text-label-sm text-on-surface-variant">Belum Dibaca</p>
        </div>
        <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant/20 col-span-2 md:col-span-1">
          <span className="material-symbols-outlined text-3xl text-tertiary mb-xs block opacity-70">done_all</span>
          <p className="text-headline-md text-on-surface font-bold">{notifications.filter((n) => n.read).length}</p>
          <p className="text-label-sm text-on-surface-variant">Sudah Dibaca</p>
        </div>
      </div>

      {/* Filter & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-md max-w-4xl">
        <div className="flex flex-wrap gap-sm">
          {[
            { id: "semua", label: "Semua", icon: "filter_list" },
            { id: "belum", label: "Belum Dibaca", icon: "mark_email_unread" },
            { id: "sudah", label: "Sudah Dibaca", icon: "done_all" },
          ].map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-xs px-md py-sm rounded-xl text-label-md transition-all duration-200 border-2 ${
                  active
                    ? "bg-primary text-on-primary border-primary shadow-md scale-105"
                    : "bg-surface-container-lowest text-on-surface-variant border-transparent hover:bg-surface-container hover:border-outline-variant/30"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {f.icon}
                </span>
                {f.label}
              </button>
            );
          })}
        </div>
        {notifications.filter((n) => !n.read).length > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-xs px-md py-sm bg-secondary text-on-secondary rounded-xl text-label-md hover:opacity-90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>done_all</span>
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden max-w-4xl">
        <div className="p-md bg-surface-container border-b border-outline-variant/20 flex items-center justify-between">
          <h3 className="text-headline-md text-on-surface">Daftar Notifikasi</h3>
          <span className="text-label-sm text-on-surface-variant">{filtered.length} notifikasi</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-body-md">Memuat notifikasi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-50">
            <span className="material-symbols-outlined text-5xl mb-2">notifications_off</span>
            <p className="text-body-md">Tidak ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`p-md hover:bg-surface-container-low transition-colors cursor-pointer ${
                  !notif.read ? "bg-primary-container/5" : ""
                }`}
              >
                <div className="flex gap-md">
                  <div className={`w-12 h-12 rounded-full ${notif.bgColor} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${notif.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {notif.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-label-md ${!notif.read ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1"></span>
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant mb-1">{notif.message}</p>
                    <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span>
                      <span>{getTimeAgo(notif.time)}</span>
                      {notif.cabang && (
                        <>
                          <span>•</span>
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>store</span>
                          <span>{notif.cabang}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
