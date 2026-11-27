import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { rupiah } from "@/lib/format";
import type { BudgetUsage } from "@/lib/types";
import { ActionForm, SubmitButton } from "@/components/form";
import { deleteBudget, saveBudget } from "./actions";

export const metadata: Metadata = { title: "Anggaran" };

export default async function AnggaranPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("budget_usage");
  const budgets = (data ?? []) as BudgetUsage[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Anggaran</h1>
        <p className="text-sm text-slate-500">
          Total pemakaian dihitung otomatis dari order yang sudah masuk (notanya terbit) dalam rentang tanggal.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-medium">Tambah periode anggaran</h2>
        <ActionForm action={saveBudget.bind(null, null)} resetOnSuccess className="grid gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-4">
            <label className="label">Nama anggaran</label>
            <input name="name" required className="input" placeholder="mis. November 2026" />
          </div>
          <div className="md:col-span-3">
            <label className="label">Mulai</label>
            <input type="date" name="period_start" required className="input" />
          </div>
          <div className="md:col-span-3">
            <label className="label">Sampai</label>
            <input type="date" name="period_end" required className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Batas (Rp)</label>
            <input type="number" min={0} step={1} name="amount" required className="input" />
          </div>
          <div className="md:col-span-12">
            <SubmitButton>Tambah Anggaran</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <div className="space-y-3">
        {budgets.length === 0 && <p className="card text-sm text-slate-500">Belum ada anggaran.</p>}
        {budgets.map((b) => {
          const sisa = b.amount - b.used;
          const pct = b.amount > 0 ? Math.min(100, Math.round((b.used / b.amount) * 100)) : 0;
          const over = sisa < 0;
          return (
            <div key={b.id} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{b.name}</h3>
                  <span className="text-xs text-slate-500">{b.period_start} s/d {b.period_end} · {b.order_count} order</span>
                </div>
                <ActionForm action={deleteBudget.bind(null, b.id)} confirm={`Hapus anggaran ${b.name}?`}>
                  <SubmitButton className="text-xs text-rose-600 hover:underline">Hapus</SubmitButton>
                </ActionForm>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div><div className="text-xs text-slate-500">Batas</div><b>{rupiah(b.amount)}</b></div>
                <div><div className="text-xs text-slate-500">Terpakai</div><b>{rupiah(b.used)}</b> ({pct}%)</div>
                <div><div className="text-xs text-slate-500">{over ? "Lewat" : "Sisa"}</div>
                  <b className={over ? "text-rose-600" : "text-emerald-700"}>{rupiah(Math.abs(sisa))}</b>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
