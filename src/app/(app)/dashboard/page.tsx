import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/constants";
import { dateNota, rupiah } from "@/lib/format";
import type { BudgetUsage, OrderStatus, OrderWithRefs } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: ordersData }, { data: budgetsData }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customer:customers(name, city)")
      .order("order_date", { ascending: false })
      .limit(20),
    supabase.rpc("budget_usage"),
  ]);

  const orders = (ordersData ?? []) as OrderWithRefs[];
  const budgets = (budgetsData ?? []) as BudgetUsage[];

  const counts: Record<OrderStatus, number> = { draft: 0, masuk: 0, produksi: 0, finishing: 0, selesai: 0, batal: 0 };
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  const statCards: { label: string; count: number; status: OrderStatus }[] = [
    { label: "Order Masuk", count: counts.masuk, status: "masuk" },
    { label: "Sedang Produksi", count: counts.produksi, status: "produksi" },
    { label: "Finishing", count: counts.finishing, status: "finishing" },
    { label: "Selesai", count: counts.selesai, status: "selesai" },
  ];

  return (
    <div className="space-y-6">
      <RealtimeRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard Monitoring</h1>
          <p className="text-sm text-slate-500">
            Monitoring produksi, hitungan budget, dan nota otomatis.
          </p>
        </div>
        <Link href="/orders/new" className="btn btn-primary">+ Order Baru</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <Link
            key={c.status}
            href={`/orders?status=${c.status}`}
            className="card transition hover:border-slate-300"
          >
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold">{c.count}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {budgets.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Pemantauan Anggaran</h2>
            <Link href="/anggaran" className="text-xs text-blue-600 hover:underline">Kelola &rarr;</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {budgets.slice(0, 2).map((b) => {
              const sisa = b.amount - b.used;
              const pct = b.amount > 0 ? Math.min(100, Math.round((b.used / b.amount) * 100)) : 0;
              const over = sisa < 0;
              return (
                <div key={b.id} className="rounded-md border border-slate-100 p-3">
                  <div className="flex justify-between text-sm">
                    <b>{b.name}</b>
                    <span className="text-xs text-slate-500">{b.order_count} order</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span>Terpakai: <b>{rupiah(b.used)}</b> ({pct}%)</span>
                    <span className={over ? "text-rose-600 font-semibold" : "text-emerald-700"}>
                      {over ? `Lewat ${rupiah(Math.abs(sisa))}` : `Sisa ${rupiah(sisa)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Order Terbaru</h2>
          <Link href="/orders" className="text-xs text-blue-600 hover:underline">Lihat semua &rarr;</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada order.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>No. Order</th>
                  <th>Tanggal</th>
                  <th>Kepada</th>
                  <th>Karyawan</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="font-mono text-xs font-semibold">
                      <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                        {o.order_no ?? "(draft)"}
                      </Link>
                    </td>
                    <td className="text-xs whitespace-nowrap">{dateNota(o.order_date)}</td>
                    <td>
                      <div>{o.customer?.name ?? "-"}</div>
                      {o.title && <div className="text-xs text-slate-400">{o.title}</div>}
                    </td>
                    <td className="text-xs text-slate-600">{o.creator_name || "-"}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right font-medium">{rupiah(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
