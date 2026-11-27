import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { paymentInfo, STATUS_COLOR, STATUS_LABEL } from "@/lib/constants";
import { dateNota, rupiah } from "@/lib/format";
import type { BudgetUsage, OrderStatus, OrderWithRefs } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { calculateDashboardFinancials } from "@/lib/cycles";
import { OrderActionsMenu } from "@/components/order-actions-menu";
import { CycleSettleButton } from "@/components/cycle-settle-button";
import {
  CalendarClock,
  CalendarDays,
  TrendingUp,
  CreditCard,
  PlusCircle,
  Inbox,
  Printer,
  Scissors,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Receipt,
  Layers,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard Monitoring" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: recentOrdersData }, { data: allActiveOrdersData }, { data: budgetsData }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customer:customers(name, city)")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("orders")
      .select("total, down_payment, cash_paid, noncash_paid, order_date, status")
      .neq("status", "batal"),
    supabase.rpc("budget_usage"),
  ]);

  const recentOrders = (recentOrdersData ?? []) as OrderWithRefs[];
  const allActiveOrders = (allActiveOrdersData ?? []) as {
    total: number;
    down_payment: number;
    cash_paid: number;
    noncash_paid: number;
    order_date: string;
    status: OrderStatus;
  }[];
  const budgets = (budgetsData ?? []) as BudgetUsage[];

  // Hitung metrik siklus 15 harian, bulanan, dan tahunan
  const financials = calculateDashboardFinancials(allActiveOrders);

  // Hitung status order saat ini
  const counts: Record<OrderStatus, number> = {
    draft: 0,
    masuk: 0,
    produksi: 0,
    finishing: 0,
    selesai: 0,
    batal: 0,
  };
  for (const o of allActiveOrders) {
    if (o.status in counts) counts[o.status] = (counts[o.status] ?? 0) + 1;
  }

  const statCards: {
    label: string;
    count: number;
    status: OrderStatus;
    icon: typeof Inbox;
    color: string;
    bg: string;
    border: string;
  }[] = [
    {
      label: "Order Masuk",
      count: counts.masuk,
      status: "masuk",
      icon: Inbox,
      color: "text-blue-600",
      bg: "bg-blue-50/70",
      border: "border-blue-100",
    },
    {
      label: "Sedang Produksi",
      count: counts.produksi,
      status: "produksi",
      icon: Printer,
      color: "text-amber-600",
      bg: "bg-amber-50/70",
      border: "border-amber-100",
    },
    {
      label: "Finishing",
      count: counts.finishing,
      status: "finishing",
      icon: Scissors,
      color: "text-purple-600",
      bg: "bg-purple-50/70",
      border: "border-purple-100",
    },
    {
      label: "Selesai",
      count: counts.selesai,
      status: "selesai",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50/70",
      border: "border-emerald-100",
    },
  ];

  const currentCycleProgressPct = Math.round(
    (financials.currentCycle.dayProgress / financials.currentCycle.totalDays) * 100
  );

  return (
    <div className="space-y-6">
      <RealtimeRefresh />

      {/* Header Utama */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard Monitoring
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Monitoring produksi, tagihan kerjasama pembayaran 15 harian, dan nota otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            + Buat Order Baru
          </Link>
        </div>
      </div>

      {/* Financial Metrics Cards (Siklus 15 Hari, Bulan Ini, Tahun Ini, Belum Lunas) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Siklus 15 Hari Berjalan (Highlight) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-indigo-200 backdrop-blur-xs">
              <CalendarClock className="h-3 w-3" />
              Siklus 15 Hari ({financials.currentCycle.label})
            </span>
            <span className="text-[11px] text-slate-300">
              {financials.currentCycle.daysRemaining > 0
                ? `Sisa ${financials.currentCycle.daysRemaining} hari`
                : "Jatuh tempo"}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xs text-slate-400 font-medium">Tagihan Siklus Ini</div>
            <div className="text-2xl font-extrabold tracking-tight text-white mt-0.5">
              {rupiah(financials.currentCycle.total)}
            </div>
          </div>

          {/* Progress bar siklus */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Hari ke-{financials.currentCycle.dayProgress} dari {financials.currentCycle.totalDays}</span>
              <span>{financials.currentCycle.orderCount} order</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all"
                style={{ width: `${currentCycleProgressPct}%` }}
              />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Terbayar: <b className="text-emerald-300">{rupiah(financials.currentCycle.paid)}</b>
            </span>
            <span className="text-slate-300">
              Sisa: <b className="text-amber-300">{rupiah(financials.currentCycle.unpaid)}</b>
            </span>
          </div>
        </div>

        {/* Card 2: Total Bulan Ini */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Total Bulan Ini
              </span>
            </div>
            <span className="text-xs text-slate-400">{financials.month.orderCount} order</span>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-extrabold tracking-tight text-slate-900">
              {rupiah(financials.month.total)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Periode {financials.month.label}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Siklus 1 (1 - 15):</span>
              <span className="font-semibold text-slate-800">{rupiah(financials.month.cycle1Total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Siklus 2 (16 - Akhir):</span>
              <span className="font-semibold text-slate-800">{rupiah(financials.month.cycle2Total)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Tahun Ini */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Total Tahun Ini
              </span>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {financials.year.year}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-extrabold tracking-tight text-slate-900">
              {rupiah(financials.year.total)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Akumulasi belanja cetak tahun {financials.year.year}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Total Transaksi:</span>
            <span className="font-semibold text-slate-800">{financials.year.orderCount} Order</span>
          </div>
        </div>

        {/* Card 4: Total Belum Terbayar (Outstanding) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <CreditCard className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Belum Terbayar
              </span>
            </div>
            {financials.totalOutstanding > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Unpaid
              </span>
            )}
          </div>

          <div className="mt-3">
            <div className="text-2xl font-extrabold tracking-tight text-amber-600">
              {rupiah(financials.totalOutstanding)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total tagihan yang perlu diselesaikan
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Status Kerjasama:</span>
            <span className="font-semibold text-indigo-600">Tempo 15 Hari</span>
          </div>
        </div>
      </div>

      {/* Quick Production Status Tracker (4 Cards) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.status}
              href={`/orders?status=${c.status}`}
              className={`group flex items-center justify-between rounded-xl border ${c.border} bg-white p-4 shadow-xs transition hover:shadow-sm hover:border-slate-300`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.color} transition-transform group-hover:scale-105`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">{c.label}</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{c.count}</div>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Order & Nota Terbaru (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-500" />
                <h2 className="font-bold text-slate-900">Order & Nota Terbaru</h2>
              </div>
              <Link
                href="/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Lihat Semua &rarr;
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Belum ada order percetakan.</p>
                <Link href="/orders/new" className="mt-3 inline-block text-xs font-semibold text-blue-600">
                  + Buat Order Pertama
                </Link>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>No. Nota</th>
                      <th>Tanggal</th>
                      <th>Pemesan</th>
                      <th>Status</th>
                      <th className="text-right">Total</th>
                      <th className="text-right w-36">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => {
                      const pay = paymentInfo(o);
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="font-mono text-xs font-bold whitespace-nowrap">
                            <Link
                              href={`/orders/${o.id}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {o.order_no ?? "(draft)"}
                              <ChevronRight className="h-3 w-3 opacity-50" />
                            </Link>
                          </td>
                          <td className="text-xs text-slate-500 whitespace-nowrap">
                            {dateNota(o.order_date)}
                          </td>
                          <td>
                            <div className="font-medium text-slate-900">{o.customer?.name ?? "-"}</div>
                            {o.title && <div className="text-xs text-slate-400 line-clamp-1">{o.title}</div>}
                          </td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="text-right font-semibold text-slate-900 whitespace-nowrap">
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
        </div>

        {/* Kolom Kanan: Rekap Siklus 15 Hari & Anggaran (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card Rekap Siklus 15 Hari */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-indigo-600" />
                <h2 className="font-bold text-slate-900">Rekap Pembayaran 15 Hari</h2>
              </div>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                Term 15 Hari
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
              Daftar rekap tagihan per dua mingguan untuk pencocokan faktur & pembayaran ke percetakan:
            </p>

            <div className="mt-4 space-y-2.5">
              {financials.recentCycles.map((cycle) => {
                const isPaid = cycle.total > 0 && cycle.unpaid === 0;
                return (
                  <div
                    key={cycle.id}
                    className={`rounded-xl border p-3 transition ${
                      cycle.isCurrent
                        ? "border-indigo-200 bg-indigo-50/40"
                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{cycle.label}</span>
                          {cycle.isCurrent && (
                            <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-medium text-white">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {cycle.orderCount} order tercatat
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">{rupiah(cycle.total)}</div>
                        <div className="mt-0.5">
                          {cycle.total === 0 ? (
                            <span className="text-[10px] text-slate-400">Tidak ada order</span>
                          ) : isPaid ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="h-3 w-3" /> Lunas
                            </span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                Sisa {rupiah(cycle.unpaid)}
                              </span>
                              <CycleSettleButton
                                startDate={cycle.startDate}
                                endDate={cycle.endDate}
                                cycleLabel={cycle.label}
                                unpaidAmount={cycle.unpaid}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Pemantauan Anggaran (jika ada data budget) */}
          {budgets.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <h2 className="font-bold text-slate-900">Plafon Anggaran</h2>
                </div>
                <Link href="/anggaran" className="text-xs font-semibold text-blue-600 hover:underline">
                  Kelola &rarr;
                </Link>
              </div>

              <div className="mt-3 space-y-3">
                {budgets.slice(0, 2).map((b) => {
                  const sisa = b.amount - b.used;
                  const pct = b.amount > 0 ? Math.min(100, Math.round((b.used / b.amount) * 100)) : 0;
                  const over = sisa < 0;
                  return (
                    <div key={b.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <div className="flex justify-between text-xs">
                        <b className="text-slate-800">{b.name}</b>
                        <span className="text-slate-500">{b.order_count} order</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
                        <div
                          className={`h-full rounded-full transition-all ${
                            over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-blue-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-slate-600">
                          Terpakai: <b>{rupiah(b.used)}</b> ({pct}%)
                        </span>
                        <span className={over ? "text-rose-600 font-bold" : "text-emerald-700 font-medium"}>
                          {over ? `Lewat ${rupiah(Math.abs(sisa))}` : `Sisa ${rupiah(sisa)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
