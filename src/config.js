// ── Helper format Rupiah ────────────────────────────
export const rupiah = (n) =>
  "Rp " + Number(n).toLocaleString("id-ID", { minimumFractionDigits: 0 });
