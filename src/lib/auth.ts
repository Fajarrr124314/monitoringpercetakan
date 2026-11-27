import "server-only";

/** Ubah error Supabase menjadi pesan yang ramah. */
export function friendlyError(error: { message?: string; code?: string } | null | undefined, fallback = "Terjadi kesalahan") {
  if (!error) return fallback;
  if (error.code === "23505") return "Data sudah ada (duplikat)";
  if (error.code === "23503") return "Data masih dipakai di order sehingga tidak bisa dihapus";
  return error.message || fallback;
}
