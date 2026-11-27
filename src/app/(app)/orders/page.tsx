import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { paymentInfo, STATUS_LABEL } from "@/lib/constants";
import { dateNota, rupiah } from "@/lib/format";
import type { OrderStatus, OrderWithRefs } from "@/lib/types";
import { PayBadge, StatusBadge } from "@/components/status-badge";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { OrderActionsMenu } from "@/components/order-actions-menu";
import { PlusCircle, Search } from "lucide-react";

export const metadata: Metadata = { title: "Order & Nota" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q = "", page = "1" } = await searchParams;
  const supabase = await createClient();
  const pageNo = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 25;
  const from = (pageNo - 1) * pageSize;

  let query = supabase
    .from("orders")
    .select("*, customer:customers(name, address, city, province, phone)", { count: "exact" })
    .order("order_date", { ascending: false })
    .range(from, from + pageSize - 1);

  if (status && status !== "semua") query = query.eq("status", status);
  if (q.trim()) {
    const clean = q.trim().replace(/[%_,()]/g, "");
    query = query.or(`order_no.ilike.%${clean}%,title.ilike.%${clean}%,creator_name.ilike.%${clean}%`);
  }

  const { data, count } = await query;
  const orders = (data ?? []) as OrderWithRefs[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  const statuses: (OrderStatus | "semua")[] = ["semua", "draft", "masuk", "produksi", "finishing", "selesai", "batal"];

  return (
    <div className="space-y-5">
      <RealtimeRefresh />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order &amp; Nota</h1>
          <p className="text-sm text-slate-500">
            Daftar order cetak, faktur nota, dan pelunasan pembayaran percetakan.
          </p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <PlusCircle className="h-4 w-4" />
          + Order Baru
        </Link>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {statuses.map((s) => {
          const active = (status ?? "semua") === s;
          const href = s === "semua" ? "/orders" : `/orders?status=${s}`;
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

      {/* Search Bar */}
      <form className="flex items-center gap-2">
        {status && status !== "semua" && <input type="hidden" name="status" value={status} />}
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

      {/* Table Orders */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Tidak ada order yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>No. Order</th>
                  <th>Tanggal</th>
                  <th>Kepada / Judul</th>
                  <th>Status Produksi</th>
                  <th>Status Bayar</th>
                  <th className="text-right">Total</th>
                  <th className="text-center w-36">Aksi Cepat</th>
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
                        <StatusBadge status={o.status} />
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
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600 pt-2">
          <span>Halaman {pageNo} dari {totalPages} ({count} order)</span>
          <div className="flex gap-2">
            {pageNo > 1 && (
              <Link href={`/orders?page=${pageNo - 1}&status=${status ?? ""}&q=${q}`} className="btn btn-sm">
                &larr; Sebelumnya
              </Link>
            )}
            {pageNo < totalPages && (
              <Link href={`/orders?page=${pageNo + 1}&status=${status ?? ""}&q=${q}`} className="btn btn-sm">
                Berikutnya &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
