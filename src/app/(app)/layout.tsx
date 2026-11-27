import { NavLinks } from "@/components/nav";
import { Printer, CalendarClock } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/60 md:flex">
      <aside className="border-b border-slate-200/80 bg-white shadow-xs md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0 md:flex md:flex-col md:justify-between">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white shadow-sm shadow-blue-500/30">
              <Printer className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                Monitoring Percetakan
              </div>
              <div className="truncate text-xs font-medium text-slate-400">
                Sakinah Printing System
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <NavLinks />
        </div>

        {/* Bottom Partnership Indicator */}
        <div className="hidden border-t border-slate-100 p-3 md:block">
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
              <CalendarClock className="h-3.5 w-3.5 text-indigo-600" />
              <span>Siklus Pembayaran 15 Hari</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Rekap faktur dua mingguan aktif untuk penagihan berkala percetakan.
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
