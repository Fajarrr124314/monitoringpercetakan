"use client";

import { useState } from "react";
import { Printer, FileDown, ChevronDown, Check } from "lucide-react";

interface PdfExportMenuProps {
  orderId?: string;
  batchParams?: {
    start?: string;
    end?: string;
    status?: string;
    q?: string;
  };
  compact?: boolean;
  label?: string;
  showPrint?: boolean;
}

export function PdfExportMenu({
  orderId,
  batchParams,
  compact = false,
  label = "Export PDF",
  showPrint = true,
}: PdfExportMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getUrl = (orientation: "landscape" | "portrait") => {
    if (orderId) {
      return `/api/orders/${orderId}/pdf?orientation=${orientation}`;
    }
    const params = new URLSearchParams();
    if (batchParams?.start) params.set("start", batchParams.start);
    if (batchParams?.end) params.set("end", batchParams.end);
    if (batchParams?.status && batchParams.status !== "semua") params.set("status", batchParams.status);
    if (batchParams?.q) params.set("q", batchParams.q);
    params.set("orientation", orientation);
    return `/api/orders/batch-pdf?${params.toString()}`;
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 no-print">
      {/* Tombol Cetak / Print Langsung (Mendukung Portrait & Landscape Otomatis) */}
      {showPrint && (
        <button
          type="button"
          onClick={() => window.print()}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer ${
            compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"
          }`}
          title="Buka dialog cetak browser (Bisa pilih Portrait atau Landscape, otomatis pas fit)"
        >
          <Printer className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <span>Print Nota</span>
        </button>
      )}

      {/* Tombol Dropdown PDF (Landscape / Portrait) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer ${
            compact ? "px-2 py-1 text-xs" : "px-3.5 py-2 text-sm"
          }`}
          title="Download PDF dalam ukuran Landscape atau Portrait"
        >
          <FileDown className={compact ? "h-3.5 w-3.5 text-blue-600" : "h-4 w-4 text-blue-600"} />
          <span>{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute right-0 mt-1.5 z-40 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pilih Ukuran PDF
              </div>

              {/* PDF Landscape */}
              <a
                href={getUrl("landscape")}
                target="_blank"
                rel="noreferrer"
                onClick={() => setDropdownOpen(false)}
                className="flex flex-col rounded-lg px-2.5 py-2 text-left hover:bg-blue-50/70 transition group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-blue-700">
                  <span>PDF Landscape</span>
                  <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-mono text-slate-600">Continuous Form</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Ukuran asli 9.5 x 5.5 inci (684 × 396 pt)
                </div>
              </a>

              {/* PDF Portrait */}
              <a
                href={getUrl("portrait")}
                target="_blank"
                rel="noreferrer"
                onClick={() => setDropdownOpen(false)}
                className="flex flex-col rounded-lg px-2.5 py-2 text-left hover:bg-blue-50/70 transition group mt-0.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-blue-700">
                  <span>PDF Portrait</span>
                  <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-mono text-blue-700 font-bold">A4 Fit</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Ukuran A4 tegak (595 × 842 pt), pas &amp; rapi
                </div>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
