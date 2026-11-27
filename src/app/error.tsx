"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-rose-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-base font-semibold">Gagal Menghubungkan Database</h2>
        </div>
        <p className="text-sm text-slate-600">
          {error.message?.includes("supabaseUrl is required") || error.message?.includes("SUPABASE")
            ? "Environment Variables Supabase belum diatur di Vercel Dashboard."
            : error.message || "Terjadi kesalahan pada server."}
        </p>
        <div className="mt-4 rounded bg-slate-100 p-3 text-xs text-slate-700">
          <b>Solusi jika deploy di Vercel:</b>
          <ol className="mt-1 list-decimal pl-4 space-y-1">
            <li>Buka Vercel Dashboard &gt; Project Settings &gt; Environment Variables.</li>
            <li>Tambahkan <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.</li>
            <li>Lakukan <b>Redeploy</b> di tab Deployments.</li>
          </ol>
        </div>
        <button onClick={() => reset()} className="btn btn-primary mt-4 w-full">
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
