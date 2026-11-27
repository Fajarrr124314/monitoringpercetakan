import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { paymentInfo, STATUS_LABEL } from "@/lib/constants";
import { dateNota, rupiah } from "@/lib/format";
import type { OrderStatus, OrderWithRefs } from "@/lib/types";
import { PayBadge, StatusBadge } from "@/components/status-badge";
import { RealtimeRefresh } from "@/components/realtime-refresh";

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
    <div className="space-y-4">
      <RealtimeRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Order &amp; Nota</h1>
          <p className="text-sm text-slate-500">
            Daftar order cetak dan nota yang diterbitkan.
          </p>
        </div>
        <Link href="/orders/new" className="btn btn-primary">+ Order Baru</Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {statuses.map((s) => {
          const active = (status ?? "semua") === s;
          const href = s === "semua" ? "/orders" : `/orders?status=${s}`;
          return (
            <Link
              key={s}
              href={href}
              className={`border-b-2 px-3 py-2 text-sm whitespace-nowrap ${
                active ? "border-blue-600 font-medium text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {s === "semua" ? "Semua" : STATUS_LABEL[s]}
            </Link>
          );
        })}
      </div>

      <form className="flex gap-2">
        {status && status !== "semua" && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Cari No. Order / Judul / Karyawan..." className="input max-w-xs" />
        <button className="btn">Cari</button>
      </form>

      <div className="card overflow-x-auto p-0">
        {orders.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Belum ada order.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>No. Order</th>
                <th>Tanggal</th>
                <th>Kepada</th>
                <th>Status</th>
                <th>Bayar</th>
                <th className="text-right">Total</th>
                <th>Karyawan</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const pay = paymentInfo(o);
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="font-mono text-xs font-semibold">
                      <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                        {o.order_no ?? "(draft)"}
                      </Link>
                    </td>
                    <td className="text-xs whitespace-nowrap">{dateNota(o.order_date)}</td>
                    <td>
                      <div className="font-medium">{o.customer?.name ?? "-"}</div>
                      {o.title && <div className="text-xs text-slate-500">{o.title}</div>}
                    </td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><PayBadge label={pay.label} /></td>
                    <td className="text-right font-medium whitespace-nowrap">{rupiah(o.total)}</td>
                    <td className="text-xs text-slate-600">{o.creator_name || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between text-sm text-slate-600">
          <span>Halaman {pageNo} dari {totalPages} ({count} order)</span>
          <div className="flex gap-2">
            {pageNo > 1 && <Link href={`/orders?page=${pageNo - 1}&status=${status ?? ""}&q=${q}`} className="btn btn-sm">Sebelumnya</Link>}
            {pageNo < totalPages && <Link href={`/orders?page=${pageNo + 1}&status=${status ?? ""}&q=${q}`} className="btn btn-sm">Berikutnya</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
