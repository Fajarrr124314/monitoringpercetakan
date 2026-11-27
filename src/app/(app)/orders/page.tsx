import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { paymentInfo, STATUS_LABEL } from "@/lib/constants";
import { dateNota, rupiah } from "@/lib/format";
import type { OrderItem, OrderStatus, OrderWithRefs, Settings } from "@/lib/types";
import { PayBadge, StatusBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/status-select";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { OrderActionsMenu } from "@/components/order-actions-menu";
import { PrintButton } from "@/components/print-button";
import { NotaHtml } from "@/components/nota-html";
import { buildNota, type NotaPage } from "@/lib/nota-layout";
import { getBillingCycle } from "@/lib/cycles";
import { getActivePartner } from "@/lib/partners";
import {
  PlusCircle,
  Search,
  Printer,
  FileDown,
  Layers,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = { title: "Order & Nota" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    start?: string;
    end?: string;
    view?: string;
  }>;
}) {
  const { status, q = "", page = "1", start, end, view = "table" } = await searchParams;
  const supabase = await createClient();
  const pageNo = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 50;
  const from = (pageNo - 1) * pageSize;

  const activePartner = await getActivePartner();

  // Query order sesuai filter
  let query = supabase
    .from("orders")
    .select("*, customer:customers(name, address, city, province, phone)", { count: "exact" })
    .order("order_date", { ascending: false });

  if (activePartner) query = query.eq("customer_id", activePartner.id);
  if (status && status !== "semua") query = query.eq("status", status);
  if (start) query = query.gte("order_date", start);
  if (end) query = query.lte("order_date", end);
  if (q.trim()) {
    const clean = q.trim().replace(/[%_,()]/g, "");
    query = query.or(`order_no.ilike.%${clean}%,title.ilike.%${clean}%,creator_name.ilike.%${clean}%`);
  }

  // Jika view table, batasi pagination; jika view nota, ambil yang sesuai filter
  if (view !== "nota") {
    query = query.range(from, from + pageSize - 1);
  }

  const { data, count } = await query;
  const orders = (data ?? []) as OrderWithRefs[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  // Hitung TOTAL KEUANGAN yang tampil di atas
  let totalOrder = 0;
  let totalTerbayar = 0;
  for (const o of orders) {
    if (o.status !== "batal") {
      const tot = Number(o.total) || 0;
      const paid = (Number(o.down_payment) || 0) + (Number(o.cash_paid) || 0) + (Number(o.noncash_paid) || 0);
      totalOrder += tot;
      totalTerbayar += paid;
    }
  }
  const sisaTagihan = Math.max(0, totalOrder - totalTerbayar);

  // Jika view = "nota", siapkan lembar continuous form untuk seluruh order yang terfilter
  let allContinuousPages: NotaPage[] = [];
  if (view === "nota" && orders.length > 0) {
    const orderIds = orders.filter((o) => o.status !== "batal" && o.status !== "draft").map((o) => o.id);
    const [{ data: itemsData }, { data: settingsData }] = await Promise.all([
      supabase.from("order_items").select("*").in("order_id", orderIds).order("position", { ascending: true }),
      supabase.from("settings").select("*").eq("id", 1).single<Settings>(),
    ]);

    const items = (itemsData ?? []) as OrderItem[];
    const settings = (settingsData ?? {
      business_name: "Percetakan Sakinah",
      address: "Jl. Arif Rahman Hakim Niaga, Nagasari Karawang Barat, Karawang",
      phone: "0895626621300",
      email: "percetakansakinah@gmail.com",
      tagline: "Smart Shoping for Smart Buyer",
      footer_note: "Barang yang sudah dibeli tidak dapat dikembalikan tanpa ada perjanjian sebelumnya",
      thanks_note: "Terima Kasih Banyak Atas Kepercayaannya, Bca.1091937731 a/n.saeful anwar",
      default_tax_percent: 0,
    }) as Settings;

    const itemsByOrderId = new Map<string, OrderItem[]>();
    for (const it of items) {
      const list = itemsByOrderId.get(it.order_id) ?? [];
      list.push(it);
      itemsByOrderId.set(it.order_id, list);
    }

    const now = new Date();
    for (const o of orders) {
      if (o.status !== "draft" && o.status !== "batal") {
        const pages = buildNota({
          settings,
          order: o,
          customer: o.customer,
          creatorName: o.creator_name || "Designer",
          items: itemsByOrderId.get(o.id) ?? [],
          printedAt: now,
        });
        allContinuousPages.push(...pages);
      }
    }
  }

  // Quick 15-day preset
  const currentCycle = getBillingCycle(new Date(), new Date());

  const statuses: (OrderStatus | "semua")[] = ["semua", "draft", "masuk", "produksi", "finishing", "selesai", "batal"];

  // URL untuk batch PDF download
  const batchPdfUrl = `/api/orders/batch-pdf?${new URLSearchParams({
    ...(status && status !== "semua" ? { status } : {}),
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
    ...(q ? { q } : {}),
  }).toString()}`;

  return (
    <div className="space-y-5">
      <RealtimeRefresh />

      {/* Header Utama */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order &amp; Nota</h1>
          <p className="text-sm text-slate-500">
            Daftar order cetak, rincian biaya, faktur nota, dan cetak massal continuous form.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Cetak Semua Nota */}
          {orders.length > 0 && (
            <>
              {view === "nota" ? (
                <PrintButton className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer">
                  <Printer className="h-4 w-4" />
                  Print Semua Nota Sekarang
                </PrintButton>
              ) : (
                <Link
                  href={`/orders?status=${status ?? "semua"}&start=${start ?? ""}&end=${end ?? ""}&q=${q}&view=nota`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                >
                  <Printer className="h-4 w-4 text-blue-600" />
                  Lihat &amp; Cetak Semua Nota
                </Link>
              )}

              <a
                href={batchPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                title="Download seluruh nota dalam 1 file PDF gabungan"
              >
                <FileDown className="h-4 w-4 text-slate-600" />
                Batch PDF
              </a>
            </>
          )}

          <Link
            href="/orders/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            + Order Baru
          </Link>
        </div>
      </div>

      {/* PANEL TOTAL KEUANGAN DI BAGIAN ATAS */}
      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4 no-print">
        {/* Total Nilai Order */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-600">Total Order</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-black text-slate-900 tracking-tight">
            {rupiah(totalOrder)}
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500">
            {orders.length} order ditampilkan
          </div>
        </div>

        {/* Sudah Dibayar / DP */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-600">Terbayar</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-base sm:text-xl font-black text-emerald-700 tracking-tight">
            {rupiah(totalTerbayar)}
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500">
            {totalOrder > 0 ? `${Math.round((totalTerbayar / totalOrder) * 100)}% lunas` : "0%"}
          </div>
        </div>

        {/* Sisa Belum Lunas */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-600">Sisa Tagihan</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className={`mt-1.5 sm:mt-2 text-base sm:text-xl font-black tracking-tight ${sisaTagihan > 0 ? "text-amber-600" : "text-emerald-700"}`}>
            {rupiah(sisaTagihan)}
          </div>
          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500">
            {sisaTagihan > 0 ? "Menunggu pelunasan" : "Seluruh order lunas"}
          </div>
        </div>

        {/* Filter Cepat Periode Berjalan */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-950 text-[11px]">Periode Berjalan</span>
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[9px] font-medium text-white">Aktif</span>
          </div>
          <div className="text-xs font-bold text-slate-900 mt-1 truncate">
            {currentCycle.label}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Link
              href={`/orders?start=${currentCycle.startDate}&end=${currentCycle.endDate}&status=${status ?? "semua"}&view=${view}`}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline"
            >
              Filter Periode Ini &rarr;
            </Link>
            {(start || end) && (
              <Link
                href={`/orders?status=${status ?? "semua"}&view=${view}`}
                className="text-[11px] text-slate-500 hover:text-slate-800 ml-auto underline"
              >
                Reset Filter
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* TABS TAMPILAN: TABEL LIST ORDER vs SEMUA NOTA CONTINUOUS FORM */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2 no-print">
        {/* Switch View */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
          <Link
            href={`/orders?status=${status ?? "semua"}&start=${start ?? ""}&end=${end ?? ""}&q=${q}&view=table`}
            className={`rounded-md px-3 py-1.5 transition ${
              view !== "nota" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Daftar Tabel Order
          </Link>
          <Link
            href={`/orders?status=${status ?? "semua"}&start=${start ?? ""}&end=${end ?? ""}&q=${q}&view=nota`}
            className={`rounded-md px-3 py-1.5 transition ${
              view === "nota" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🖨️ Semua Nota Continuous Form ({orders.length})
          </Link>
        </div>

        {/* Filter Rentang Tanggal Cepat */}
        <form className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Tanggal:</span>
          <input type="hidden" name="status" value={status ?? "semua"} />
          <input type="hidden" name="view" value={view} />
          <input type="date" name="start" defaultValue={start} className="input max-w-[130px] text-xs py-1" />
          <span className="text-slate-400">s/d</span>
          <input type="date" name="end" defaultValue={end} className="input max-w-[130px] text-xs py-1" />
          <button className="btn btn-sm">Terapkan</button>
        </form>
      </div>

      {/* FILTER STATUS TABS */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 no-print">
        {statuses.map((s) => {
          const active = (status ?? "semua") === s;
          const href = `/orders?status=${s}&start=${start ?? ""}&end=${end ?? ""}&q=${q}&view=${view}`;
          return (
            <Link
              key={s}
              href={href}
              className={`border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                active
                  ? "border-blue-600 font-semibold text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {s === "semua" ? "Semua Order" : STATUS_LABEL[s]}
            </Link>
          );
        })}
      </div>

      {/* SEARCH BAR (Hanya saat view table) */}
      {view !== "nota" && (
        <form className="flex items-center gap-2 no-print">
          <input type="hidden" name="status" value={status ?? "semua"} />
          <input type="hidden" name="start" value={start ?? ""} />
          <input type="hidden" name="end" value={end ?? ""} />
          <div className="relative w-full max-w-sm">
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari No. Order / Judul / Karyawan..."
              className="input pl-8 text-sm"
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>
          <button className="btn text-sm">Cari</button>
        </form>
      )}

      {/* KONTEN 1: TAMPILAN SEMUA NOTA CONTINUOUS FORM */}
      {view === "nota" ? (
        <div className="space-y-4">
          <div className="no-print rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-3">
            <span>
              Menampilkan seluruh lembar faktur continuous form ({allContinuousPages.length} lembar dari {orders.length} order).
              Siap dicetak ke printer continuous form.
            </span>
            <div className="flex items-center gap-2">
              <PrintButton className="btn btn-primary btn-sm">Cetak Semua Nota</PrintButton>
              <a href={batchPdfUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
                Download PDF
              </a>
            </div>
          </div>

          {allContinuousPages.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Tidak ada faktur nota yang diterbitkan pada filter ini.
            </div>
          ) : (
            <div className="nota-wrap space-y-6 overflow-x-auto rounded-lg bg-slate-200 p-4">
              <NotaHtml pages={allContinuousPages} />
            </div>
          )}
        </div>
      ) : (
        /* KONTEN 2: TABEL LIST ORDER DENGAN TOMBOL LIHAT FAKTUR, EDIT, LUNAS, DELETE */
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Tidak ada order yang ditemukan.
            </div>
          ) : (
            <>
              {/* TAMPILAN DESKTOP (Tabel Lengkap) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>No. Order</th>
                      <th>Tanggal</th>
                      <th>Kepada / Judul</th>
                      <th>Status Produksi</th>
                      <th>Status Bayar</th>
                      <th className="text-right">Total</th>
                      <th className="text-center w-40">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const pay = paymentInfo(o);
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="font-mono text-xs font-bold whitespace-nowrap">
                            <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                              {o.order_no ?? "(draft)"}
                            </Link>
                          </td>
                          <td className="text-xs text-slate-500 whitespace-nowrap">
                            {dateNota(o.order_date)}
                          </td>
                          <td>
                            <div className="font-semibold text-slate-900">{o.customer?.name ?? "-"}</div>
                            {o.title && <div className="text-xs text-slate-400 line-clamp-1">{o.title}</div>}
                          </td>
                          <td>
                            <StatusSelect orderId={o.id} currentStatus={o.status} />
                          </td>
                          <td>
                            <PayBadge label={pay.label} />
                          </td>
                          <td className="text-right font-bold text-slate-900 whitespace-nowrap">
                            {rupiah(o.total)}
                          </td>
                          <td className="text-right">
                            <OrderActionsMenu
                              orderId={o.id}
                              orderNo={o.order_no}
                              total={o.total}
                              due={pay.due}
                              customerName={o.customer?.name}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TAMPILAN MOBILE (Kartu Order Touch-Friendly) */}
              <div className="md:hidden divide-y divide-slate-100">
                {orders.map((o) => {
                  const pay = paymentInfo(o);
                  return (
                    <div key={o.id} className="p-3.5 space-y-2.5">
                      {/* Baris 1: No. Order + Dropdown Status */}
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-mono text-xs font-bold text-blue-600 hover:underline"
                        >
                          {o.order_no ?? "(draft)"}
                        </Link>
                        <StatusSelect orderId={o.id} currentStatus={o.status} compact />
                      </div>

                      {/* Baris 2: Pemesan & Keterangan */}
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {o.customer?.name ?? "Pelanggan Umum"}
                        </div>
                        {o.title && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {o.title}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {dateNota(o.order_date)}
                        </div>
                      </div>

                      {/* Baris 3: Total & Status Bayar */}
                      <div className="flex items-center justify-between border-t border-slate-100/80 pt-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Tagihan</span>
                          <span className="font-bold text-slate-900 text-sm">{rupiah(o.total)}</span>
                        </div>
                        <div className="text-right">
                          <PayBadge label={pay.label} />
                        </div>
                      </div>

                      {/* Baris 4: Aksi Cepat (Faktur, Lunas, Edit, Hapus) */}
                      <div className="border-t border-slate-100/80 pt-2 flex items-center justify-end">
                        <OrderActionsMenu
                          orderId={o.id}
                          orderNo={o.order_no}
                          total={o.total}
                          due={pay.due}
                          customerName={o.customer?.name}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Pagination (saat view table) */}
      {view !== "nota" && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600 pt-2 no-print">
          <span>Halaman {pageNo} dari {totalPages} ({count} order)</span>
          <div className="flex gap-2">
            {pageNo > 1 && (
              <Link
                href={`/orders?page=${pageNo - 1}&status=${status ?? ""}&start=${start ?? ""}&end=${end ?? ""}&q=${q}`}
                className="btn btn-sm"
              >
                &larr; Sebelumnya
              </Link>
            )}
            {pageNo < totalPages && (
              <Link
                href={`/orders?page=${pageNo + 1}&status=${status ?? ""}&start=${start ?? ""}&end=${end ?? ""}&q=${q}`}
                className="btn btn-sm"
              >
                Berikutnya &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
