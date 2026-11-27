import type { Metadata } from "next";
import { getPartnersList } from "@/lib/partners";
import { PortalCards } from "@/components/portal-cards";
import { Handshake } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pilih Kerjasama Percetakan | Percetakan Sakinah",
};

export default async function HomePage() {
  const partners = await getPartnersList();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Brand Indicator */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between pt-2 sm:pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-slate-200/90 p-1 shadow-2xs">
            <img
              src="/logos.png"
              alt="Logo Percetakan Sakinah"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 leading-tight">
              Percetakan Sakinah
            </div>
            <div className="text-[10px] font-semibold text-indigo-600">
              Sistem Monitoring &amp; Penagihan
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
          <Handshake className="h-4 w-4 text-indigo-600" />
          <span className="hidden sm:inline">Portal Kerjasama</span>
        </div>
      </div>

      {/* Main Centered Section */}
      <div className="my-auto py-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-bold text-blue-700 shadow-2xs mb-4">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span>MULTI-KERJASAMA PERCETAKAN</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight max-w-xl">
          Buka Kerjasama Percetakan
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
          Pilih mitra kerjasama di bawah ini dan masukkan PIN keamanan untuk mengakses dashboard monitoring faktur &amp; tagihan 15 harian.
        </p>

        {/* Kotak-kotak Card Kerjasama */}
        <div className="mt-8 sm:mt-10 w-full flex justify-center text-left">
          <PortalCards partners={partners} />
        </div>
      </div>

      {/* Footer Note */}
      <div className="w-full max-w-5xl mx-auto border-t border-slate-200/80 pt-4 pb-2 text-center text-[11px] text-slate-400">
        Percetakan Sakinah · Karawang, Jawa Barat · Sistem Kerjasama Penagihan Berkala 15 Hari
      </div>
    </div>
  );
}
