import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBillingCycle, getRecentBillingCycles } from "@/lib/cycles";
import { dateNota, rupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { getPeriodOrdersFull } from "@/lib/orders";
import { buildNota } from "@/lib/nota-layout";
import { NotaHtml } from "@/components/nota-html";
import { CycleSettleButton } from "@/components/cycle-settle-button";
import { PrintButton } from "@/components/print-button";
import {
  CalendarClock,
  Printer,
  FileDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Building2,
  CreditCard,
} from "lucide-react";

export const metadata: Metadata = { title: "Rekap & Cetak Tagihan 15 Hari" };

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; view?: string }>;
}) {
  const { start: paramStart, end: paramEnd, view = "statement" } = await searchParams;
  const now = new Date();
  const currentCycle = getBillingCycle(now, now);

  const start = paramStart ?? currentCycle.startDate;
  const end = paramEnd ?? currentCycle.endDate;

  const supabase = await createClient();
  const { orders, settings } = await getPeriodOrdersFull(supabase, start, end);

  // Hitung total finansial periode ini
  let totalBelanja = 0;
  let totalTerbayar = 0;
  for (const o of orders) {
    const tot = Number(o.total) || 0;
    const paid = (Number(o.down_payment) || 0) + (Number(o.cash_paid) || 0) + (Number(o.noncash_paid) || 0);
    totalBelanja += tot;
    totalTerbayar += paid;
  }
  const sisaTagihan = Math.max(0, totalBelanja - totalTerbayar);
  const isLunas = orders.length > 0 && sisaTagihan === 0;

  // Recent cycles presets
  const presets = getRecentBillingCycles(4, now);

  // Buat lembar continuous form untuk semua order jika view = "nota"
  const allContinuousPages = view === "nota" ? orders.flatMap((o) => {
    return buildNota({
      settings,
      order: o,
      customer: o.customer,
      creatorName: o.creator_name || "Designer",
      items: o.items,
      printedAt: now,
    });
  }) : [];

  return (
    <div className="space-y-6">
      {/* Action Header - Tidak tercetak saat Print */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Rekap &amp; Cetak Tagihan 15 Hari
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                Kerjasama Percetakan
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Cetak rekapitulasi faktur dua mingguan untuk penagihan dan pencocokan pembayaran.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintButton className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer">
              <Printer className="h-4 w-4" />
              {view === "nota" ? "Cetak Semua Continuous Form" : "Cetak Lembar Rekap (A4)"}
            </PrintButton>

            {orders.length > 0 && (
              <a
                href={`/api/rekap/pdf?start=${start}&end=${end}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <FileDown className="h-4 w-4 text-slate-600" />
                Download Batch PDF
              </a>
            )}
          </div>
        </div>

        {/* Pilihan Periode Cepat (Presets Siklus 15 Hari) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-indigo-600" />
              Pilih Siklus 15 Hari:
            </span>

            {/* Tab Tampilan: Lembar Rekap vs Semua Nota */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <Link
                href={`/rekap?start=${start}&end=${end}&view=statement`}
                className={`rounded-md px-3 py-1 transition ${
                  view === "statement"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lembar Rekap Tagihan
              </Link>
              <Link
                href={`/rekap?start=${start}&end=${end}&view=nota`}
                className={`rounded-md px-3 py-1 transition ${
                  view === "nota"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua Nota Continuous Form
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((c) => {
              const active = start === c.startDate && end === c.endDate;
              return (
                <Link
                  key={c.id}
                  href={`/rekap?start=${c.startDate}&end=${c.endDate}&view=${view}`}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {c.label} {c.isCurrent ? "★ Aktif" : ""}
                </Link>
              );
            })}
          </div>

          {/* Custom Date Form */}
          <form className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Atau Rentang Tanggal Khusus:</span>
            <input type="hidden" name="view" value={view} />
            <input type="date" name="start" defaultValue={start} className="input max-w-[140px] text-xs py-1" />
            <span className="text-slate-400">s/d</span>
            <input type="date" name="end" defaultValue={end} className="input max-w-[140px] text-xs py-1" />
            <button className="btn btn-sm">Tampilkan</button>
          </form>
        </div>
      </div>

      {/* Konten 1: Tampilan Seluruh Nota Continuous Form */}
      {view === "nota" ? (
        <div className="space-y-4">
          <div className="no-print rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900 flex items-center justify-between">
            <span>
              Menampilkan seluruh lembar faktur continuous form pada periode <b>{dateNota(start)} s/d {dateNota(end)}</b> ({orders.length} order, {allContinuousPages.length} halaman).
            </span>
            <PrintButton className="btn btn-primary btn-sm">Print Semua</PrintButton>
          </div>

          {allContinuousPages.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Tidak ada faktur nota yang diterbitkan pada rentang tanggal ini.
            </div>
          ) : (
            <div className="nota-wrap space-y-6 overflow-x-auto rounded-lg bg-slate-200 p-4">
              <NotaHtml pages={allContinuousPages} />
            </div>
          )}
        </div>
      ) : (
        /* Konten 2: Lembar Rekapitulasi Tagihan Resmi (Statement) */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 sm:p-8 print:p-0 print:border-none print:shadow-none">
          {/* Header Surat Rekap */}
          <div className="border-b-2 border-slate-800 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  {settings.business_name}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">{settings.address}</p>
                <p className="text-xs text-slate-600">Telp/WA: {settings.phone} · Email: {settings.email}</p>
                <p className="text-xs font-semibold text-indigo-700 mt-1">{settings.tagline}</p>
              </div>
              <div className="text-right">
                <div className="inline-block rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">No. Rekap Tagihan</div>
                  <div className="text-xs font-mono font-bold text-slate-900">
                    RK-{start.replace(/-/g, "").slice(2)}-{end.replace(/-/g, "").slice(2)}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Tanggal Cetak: <b>{dateNota(now)}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Judul & Tujuan Penagihan */}
          <div className="my-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-widest">
                  FAKTUR TAGIHAN DUA MINGGUAN (15 HARI)
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  REKAPITULASI TAGIHAN PERCETAKAN
                </h3>
                <div className="text-xs text-slate-600 mt-1">
                  Periode Tagihan: <b className="text-slate-900">{dateNota(start)} s/d {dateNota(end)}</b>
                </div>
              </div>

              <div className="text-right border-l-2 border-slate-200 pl-4">
                <div className="text-xs text-slate-500 uppercase font-semibold">Ditujukan Kepada:</div>
                <div className="text-base font-black text-slate-900">YOGYA KARAWANG</div>
                <div className="text-xs text-slate-600">Jawa Barat</div>
                <div className="mt-1">
                  {isLunas ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" /> STATUS: LUNAS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5" /> STATUS: BELUM LUNAS
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Rincian Faktur */}
          {orders.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Tidak ada order yang tercatat pada rentang tanggal ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="w-8 text-center">No</th>
                    <th>Tanggal</th>
                    <th>No. Faktur</th>
                    <th>Judul Pekerjaan / Bahan</th>
                    <th className="text-center">Jml</th>
                    <th className="text-right">Total Tagihan</th>
                    <th className="text-right">Bayar / DP</th>
                    <th className="text-right">Sisa Tagihan</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, idx) => {
                    const orderPaid = (Number(o.down_payment) || 0) + (Number(o.cash_paid) || 0) + (Number(o.noncash_paid) || 0);
                    const orderDue = Math.max(0, (Number(o.total) || 0) - orderPaid);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="text-center text-xs text-slate-500">{idx + 1}</td>
                        <td className="text-xs whitespace-nowrap">{dateNota(o.order_date)}</td>
                        <td className="font-mono text-xs font-bold whitespace-nowrap text-blue-700">
                          {o.order_no ?? "(draft)"}
                        </td>
                        <td>
                          <div className="font-semibold text-slate-900">{o.title || "Order Cetak"}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {o.items.map((it) => `${it.product_name} (${it.width_cm}x${it.height_cm}cm)`).join(", ")}
                          </div>
                        </td>
                        <td className="text-center text-xs font-medium">
                          {o.items.reduce((s, it) => s + (Number(it.qty) || 0), 0)}
                        </td>
                        <td className="text-right font-bold text-slate-900 whitespace-nowrap">
                          {rupiah(o.total)}
                        </td>
                        <td className="text-right text-xs text-emerald-700 whitespace-nowrap">
                          {rupiah(orderPaid)}
                        </td>
                        <td className="text-right text-xs font-bold text-rose-700 whitespace-nowrap">
                          {orderDue === 0 ? "-" : rupiah(orderDue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Grand Total & Terbilang */}
          <div className="mt-6 grid gap-6 md:grid-cols-12 items-start">
            <div className="md:col-span-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Terbilang Total Tagihan:
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 uppercase italic leading-relaxed">
                # {terbilang(totalBelanja)} #
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Rekening Pembayaran Resmi:</div>
                <div className="font-medium">{settings.thanks_note}</div>
                <div className="text-[11px] text-slate-500">{settings.footer_note}</div>
              </div>
            </div>

            <div className="md:col-span-5 rounded-xl border-2 border-slate-800 bg-white p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Seluruh Faktur ({orders.length} Order):</span>
                <span className="font-bold text-slate-900">{rupiah(totalBelanja)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Sudah Terbayar / DP:</span>
                <span className="font-bold text-emerald-700">{rupiah(totalTerbayar)}</span>
              </div>
              <div className="border-t-2 border-slate-800 pt-2 flex justify-between items-baseline">
                <span className="text-xs font-black text-slate-900 uppercase">
                  Sisa Yang Harus Ditransfer:
                </span>
                <span className="text-base font-black text-rose-700">
                  {rupiah(sisaTagihan)}
                </span>
              </div>
              {sisaTagihan > 0 && (
                <div className="no-print pt-2 flex justify-end">
                  <CycleSettleButton
                    startDate={start}
                    endDate={end}
                    cycleLabel={`${dateNota(start)} - ${dateNota(end)}`}
                    unpaidAmount={sisaTagihan}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Kolom Tanda Tangan */}
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="font-medium text-slate-500">Dibuat Oleh,</div>
              <div className="font-bold text-slate-900 mt-0.5">{settings.business_name}</div>
              <div className="h-16"></div>
              <div className="font-bold underline text-slate-900">( Bagian Keuangan / Desain )</div>
              <div className="text-[10px] text-slate-500">Percetakan Sakinah</div>
            </div>

            <div>
              <div className="font-medium text-slate-500">Disetujui / Diterima Oleh,</div>
              <div className="font-bold text-slate-900 mt-0.5">Pihak YOGYA KARAWANG</div>
              <div className="h-16"></div>
              <div className="font-bold underline text-slate-900">( Keuangan / Manajer Operasional )</div>
              <div className="text-[10px] text-slate-500">Pemberi Kerja</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
