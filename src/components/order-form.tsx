"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/form";
import { itemArea, itemSubtotal, orderTotals } from "@/lib/pricing";
import { money, rupiah } from "@/lib/format";
import type { BudgetUsage, Customer, FormState, Product } from "@/lib/types";

export type DimensionUnit = "cm" | "m" | "mm";

export type ItemRow = {
  key: string;
  product_id: string;
  description: string;
  notes: string;
  qty: string;
  width: string;
  height: string;
  unit_dim: DimensionUnit;
  width_m?: string;
  height_m?: string;
  unit_price: string;
  design_fee: string;
  other_fee: string;
};

export type OrderFormInitial = {
  id?: string;
  status: "draft" | "masuk";
  customer_id: string;
  title: string;
  creator_name: string;
  order_date: string; // datetime-local (WIB)
  due_at: string;
  notes: string;
  discount: number;
  tax_percent: number;
  other_cost: number;
  items: ItemRow[];
  countedTotal: number;
};

const n = (s: string | number) => {
  const v = Number(String(s).replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** Mengonversi nilai dari satuan apa pun (cm, m, mm) ke centimeter (cm) integer untuk kalkulasi DB */
export function toCm(val: string | number, unit: DimensionUnit = "cm"): number {
  const num = n(val);
  if (unit === "m") return Math.max(1, Math.round(num * 100));
  if (unit === "mm") return Math.max(1, Math.round(num / 10));
  return Math.max(1, Math.round(num));
}

/** Mengonversi angka antar satuan ukuran secara presisi */
export function convertDimension(valStr: string, fromUnit: DimensionUnit, toUnit: DimensionUnit): string {
  if (fromUnit === toUnit) return valStr;
  const num = n(valStr);
  if (num === 0) return "";

  // 1. Convert fromUnit -> cm (base)
  let cm = num;
  if (fromUnit === "m") cm = num * 100;
  else if (fromUnit === "mm") cm = num / 10;

  // 2. Convert cm -> toUnit
  if (toUnit === "m") {
    const m = cm / 100;
    return Number(m.toFixed(3)).toString();
  }
  if (toUnit === "mm") {
    return String(Math.round(cm * 10));
  }
  // cm
  return Number(cm.toFixed(2)).toString();
}

const emptyRow = (key: string, unit_dim: DimensionUnit = "cm"): ItemRow => ({
  key,
  product_id: "",
  description: "",
  notes: "",
  qty: "1",
  width: unit_dim === "cm" ? "100" : unit_dim === "m" ? "1.00" : "1000",
  height: unit_dim === "cm" ? "100" : unit_dim === "m" ? "1.00" : "1000",
  unit_dim,
  unit_price: "",
  design_fee: "0",
  other_fee: "0",
});

export function OrderForm({
  action, initial, customers, products, budgets = [], taxDefault,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: OrderFormInitial;
  customers: Pick<Customer, "id" | "name" | "city">[];
  products: Product[];
  budgets?: BudgetUsage[];
  taxDefault: number;
}) {
  const [customerId, setCustomerId] = useState(initial.customer_id);

  // Normalisasi baris awal agar kompatibel jika data lama masih menggunakan width_m / height_m
  const normalizedInitialRows: ItemRow[] = (initial.items.length ? initial.items : [emptyRow("r0", "cm")]).map((r) => {
    const unit_dim: DimensionUnit = r.unit_dim ?? (r.width !== undefined ? "cm" : "m");
    let width = r.width;
    let height = r.height;
    if (width === undefined && r.width_m !== undefined) {
      width = unit_dim === "m" ? r.width_m : convertDimension(r.width_m, "m", unit_dim);
    }
    if (height === undefined && r.height_m !== undefined) {
      height = unit_dim === "m" ? r.height_m : convertDimension(r.height_m, "m", unit_dim);
    }
    return {
      ...r,
      unit_dim,
      width: width ?? (unit_dim === "cm" ? "100" : unit_dim === "m" ? "1.00" : "1000"),
      height: height ?? (unit_dim === "cm" ? "100" : unit_dim === "m" ? "1.00" : "1000"),
    };
  });

  const [rows, setRows] = useState<ItemRow[]>(normalizedInitialRows);
  const [defaultUnit, setDefaultUnit] = useState<DimensionUnit>(rows[0]?.unit_dim ?? "cm");
  const [orderDate, setOrderDate] = useState(initial.order_date);
  const [creatorName, setCreatorName] = useState(initial.creator_name || "Designer");
  const [discount, setDiscount] = useState(String(initial.discount));
  const [taxPercent, setTaxPercent] = useState(String(initial.id ? initial.tax_percent : taxDefault));
  const [otherCost, setOtherCost] = useState(String(initial.other_cost));

  const productById = new Map(products.map((p) => [p.id, p]));
  const selectable = products.filter((p) => p.is_active || rows.some((r) => r.product_id === p.id));

  const calcRows = rows.map((r) => {
    const p = productById.get(r.product_id);
    const price = r.unit_price !== "" ? Math.trunc(n(r.unit_price)) : p?.price ?? 0;
    const widthCm = toCm(r.width, r.unit_dim);
    const heightCm = toCm(r.height, r.unit_dim);
    const item = {
      pricingUnit: p?.pricing_unit ?? "m2",
      qty: Math.trunc(n(r.qty)),
      widthCm,
      heightCm,
      unitPrice: price,
      designFee: Math.trunc(n(r.design_fee)),
      otherFee: Math.trunc(n(r.other_fee)),
    } as const;
    return { row: r, product: p, item, subtotal: p ? itemSubtotal(item) : 0 };
  });

  const totals = orderTotals({
    items: calcRows.filter((c) => c.product).map((c) => c.item),
    discount: Math.trunc(n(discount)),
    taxPercent: n(taxPercent),
    otherCost: Math.trunc(n(otherCost)),
  });

  const day = orderDate.slice(0, 10);
  const budget = budgets.find((b) => b.period_start <= day && day <= b.period_end);
  const budgetAfter = budget ? budget.used - initial.countedTotal + totals.total : 0;

  const update = (key: string, patch: Partial<ItemRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const handleUnitChange = (key: string, newUnit: DimensionUnit) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const currentUnit = r.unit_dim ?? "cm";
        if (currentUnit === newUnit) return r;
        return {
          ...r,
          unit_dim: newUnit,
          width: convertDimension(r.width, currentUnit, newUnit),
          height: convertDimension(r.height, currentUnit, newUnit),
        };
      })
    );
  };

  const handleApplyDefaultUnit = (u: DimensionUnit) => {
    setDefaultUnit(u);
    setRows((rs) =>
      rs.map((r) => ({
        ...r,
        unit_dim: u,
        width: convertDimension(r.width, r.unit_dim, u),
        height: convertDimension(r.height, r.unit_dim, u),
      }))
    );
  };

  const payload = {
    id: initial.id,
    customer_id: customerId,
    title: "",
    creator_name: creatorName,
    order_date: orderDate,
    discount: Math.trunc(n(discount)),
    tax_percent: n(taxPercent),
    other_cost: Math.trunc(n(otherCost)),
    items: rows.map((r) => ({
      product_id: r.product_id,
      description: r.description,
      notes: r.notes,
      qty: Math.trunc(n(r.qty)),
      width_cm: productById.get(r.product_id)?.pricing_unit === "pcs" ? 100 : toCm(r.width, r.unit_dim),
      height_cm: productById.get(r.product_id)?.pricing_unit === "pcs" ? 100 : toCm(r.height, r.unit_dim),
      unit_price: r.unit_price !== "" ? Math.trunc(n(r.unit_price)) : null,
      design_fee: Math.trunc(n(r.design_fee)),
      other_fee: Math.trunc(n(r.other_fee)),
    })),
  };

  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="card grid gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <label className="label">Kepada (pelanggan)</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input" required>
            <option value="">- pilih pelanggan -</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.city ? ` - ${c.city}` : ""}</option>
            ))}
            <option value="new">+ Pelanggan baru...</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <label className="label">Judul / keterangan order</label>
          <input name="title" defaultValue={initial.title} className="input" placeholder="mis. Banner promo Vaseline" />
        </div>
        <div className="md:col-span-3">
          <label className="label">Karyawan / Designer</label>
          <input
            name="creator_name"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            className="input"
            placeholder="mis. Saeful / Designer"
            required
          />
        </div>

        {customerId === "new" && (
          <div className="grid gap-3 rounded-md bg-slate-50 p-3 md:col-span-12 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="label">Nama pelanggan baru</label>
              <input name="nc_name" required className="input" />
            </div>
            <div className="md:col-span-4">
              <label className="label">Alamat</label>
              <input name="nc_address" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Kota</label>
              <input name="nc_city" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Provinsi</label>
              <input name="nc_province" className="input" />
            </div>
          </div>
        )}

        <div className="md:col-span-3">
          <label className="label">Tanggal order</label>
          <input type="datetime-local" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required className="input" />
        </div>
        <div className="md:col-span-3">
          <label className="label">Estimasi selesai</label>
          <input type="datetime-local" name="due_at" defaultValue={initial.due_at} className="input" />
        </div>
        <div className="md:col-span-6">
          <label className="label">Catatan</label>
          <input name="notes" defaultValue={initial.notes} className="input" />
        </div>
      </div>

      {/* DAFTAR ITEM PESANAN DENGAN DROPDOWN PILIHAN SATUAN UKURAN (cm, m, mm) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="text-sm font-bold text-slate-800">
            Daftar Item Pesanan ({rows.length})
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Satuan Ukuran Input:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              {(["cm", "m", "mm"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleApplyDefaultUnit(u)}
                  className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                    defaultUnit === u ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title={`Ubah semua satuan ke ${u}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {calcRows.map(({ row: r, product: p, subtotal }, i) => (
          <div key={r.key} className="card grid gap-3 md:grid-cols-12">
            <div className="flex items-center justify-between md:col-span-12">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Item {i + 1}</span>
                {p?.pricing_unit !== "pcs" && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                    Satuan: {r.unit_dim}
                  </span>
                )}
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                >
                  Hapus item
                </button>
              )}
            </div>

            <div className="md:col-span-4">
              <label className="label">Bahan</label>
              <select
                value={r.product_id}
                required
                className="input"
                onChange={(e) => update(r.key, { product_id: e.target.value, unit_price: "" })}
              >
                <option value="">- pilih bahan -</option>
                {selectable.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} - Rp {money(x.price)}/{x.pricing_unit === "m2" ? "m²" : x.unit_label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-5">
              <label className="label">Nama pekerjaan</label>
              <input
                value={r.description}
                onChange={(e) => update(r.key, { description: e.target.value })}
                className="input"
                placeholder="VASELINE LUCKY DIP"
              />
            </div>
            <div className="md:col-span-3">
              <label className="label">Keterangan item</label>
              <input value={r.notes} onChange={(e) => update(r.key, { notes: e.target.value })} className="input" />
            </div>

            <div className="md:col-span-2">
              <label className="label">Jumlah</label>
              <input
                type="number"
                min={1}
                step={1}
                value={r.qty}
                required
                className="input font-mono"
                onChange={(e) => update(r.key, { qty: e.target.value })}
              />
            </div>

            {p?.pricing_unit !== "pcs" && (
              <>
                {/* INPUT LEBAR DENGAN DROPDOWN UNIT cm / m / mm */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Lebar</label>
                    <select
                      value={r.unit_dim}
                      onChange={(e) => handleUnitChange(r.key, e.target.value as DimensionUnit)}
                      className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue-100 transition"
                      title="Pilih satuan ukuran: cm, m, atau mm"
                    >
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    min={r.unit_dim === "mm" ? 1 : r.unit_dim === "cm" ? 0.1 : 0.01}
                    step={r.unit_dim === "mm" ? 1 : r.unit_dim === "cm" ? 0.5 : 0.01}
                    value={r.width}
                    required
                    className="input font-mono"
                    placeholder={r.unit_dim === "cm" ? "100" : r.unit_dim === "mm" ? "1000" : "1.00"}
                    onChange={(e) => update(r.key, { width: e.target.value })}
                  />
                </div>

                {/* INPUT TINGGI DENGAN DROPDOWN UNIT cm / m / mm */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Tinggi</label>
                    <select
                      value={r.unit_dim}
                      onChange={(e) => handleUnitChange(r.key, e.target.value as DimensionUnit)}
                      className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 cursor-pointer hover:bg-blue-100 transition"
                      title="Pilih satuan ukuran: cm, m, atau mm"
                    >
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    min={r.unit_dim === "mm" ? 1 : r.unit_dim === "cm" ? 0.1 : 0.01}
                    step={r.unit_dim === "mm" ? 1 : r.unit_dim === "cm" ? 0.5 : 0.01}
                    value={r.height}
                    required
                    className="input font-mono"
                    placeholder={r.unit_dim === "cm" ? "100" : r.unit_dim === "mm" ? "1000" : "1.00"}
                    onChange={(e) => update(r.key, { height: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="label">Harga satuan (Rp)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={r.unit_price}
                placeholder={p ? String(p.price) : ""}
                className="input font-mono"
                onChange={(e) => update(r.key, { unit_price: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Jasa desain (Rp)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={r.design_fee}
                className="input font-mono"
                onChange={(e) => update(r.key, { design_fee: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Lain-lain (Rp)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={r.other_fee}
                className="input font-mono"
                onChange={(e) => update(r.key, { other_fee: e.target.value })}
              />
            </div>

            {/* PREVIEW UKURAN & SUBTOTAL */}
            <div className="text-right text-sm md:col-span-12 flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
              {p?.pricing_unit === "m2" && (
                <span className="text-xs text-slate-500">
                  Ukuran: <b className="text-slate-800">{r.width || "0"} × {r.height || "0"} {r.unit_dim}</b>
                  {r.unit_dim !== "m" && (
                    <span className="text-slate-400 font-mono text-[11px] ml-1">
                      ({(toCm(r.width, r.unit_dim) / 100).toFixed(2)} × {(toCm(r.height, r.unit_dim) / 100).toFixed(2)} m)
                    </span>
                  )}
                  {" · "}
                  Luas: <b className="text-slate-800">{itemArea({ qty: Math.trunc(n(r.qty)), widthCm: toCm(r.width, r.unit_dim), heightCm: toCm(r.height, r.unit_dim) }).toLocaleString("id-ID")} m²</b>
                </span>
              )}
              <span className="text-slate-700">
                Subtotal: <b className="text-base text-slate-900">{rupiah(subtotal)}</b>
              </span>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="btn cursor-pointer"
          onClick={() => setRows((rs) => [...rs, emptyRow(crypto.randomUUID(), defaultUnit)])}
        >
          + Tambah item
        </button>
      </div>

      <div className="card grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-3 content-start gap-3">
          <div>
            <label className="label">Diskon (Rp)</label>
            <input type="number" min={0} step={1} value={discount} onChange={(e) => setDiscount(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">PPN (%)</label>
            <input type="number" min={0} max={100} step={0.01} value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">Biaya lain (Rp)</label>
            <input type="number" min={0} step={1} value={otherCost} onChange={(e) => setOtherCost(e.target.value)} className="input font-mono" />
          </div>
          {budget && (
            <div className={`col-span-3 rounded-md p-3 text-sm ${budgetAfter > budget.amount ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}>
              Anggaran <b>{budget.name}</b>: terpakai {rupiah(budget.used - initial.countedTotal)} dari {rupiah(budget.amount)}.
              {budgetAfter > budget.amount
                ? <> ⚠️ Order ini membuat anggaran <b>lewat {rupiah(budgetAfter - budget.amount)}</b>.</>
                : <> Sisa setelah order ini: <b>{rupiah(budget.amount - budgetAfter)}</b>.</>}
            </div>
          )}
        </div>
        <dl className="space-y-1 text-sm">
          <Row label="Total transaksi" value={totals.subtotal} />
          <Row label="Diskon" value={-totals.discount} />
          <Row label="PPN" value={totals.tax} />
          <Row label="Biaya lain" value={totals.otherCost} />
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{rupiah(totals.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {initial.status === "draft" ? (
          <>
            <SubmitButton name="intent" value="draft" className="btn cursor-pointer">Simpan Draft</SubmitButton>
            <SubmitButton name="intent" value="submit" className="btn btn-primary cursor-pointer">Kirim &amp; Terbitkan Nota</SubmitButton>
          </>
        ) : (
          <SubmitButton name="intent" value="draft" className="btn btn-primary cursor-pointer">Simpan Perubahan (nota ikut diperbarui)</SubmitButton>
        )}
      </div>
    </ActionForm>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd>{rupiah(value)}</dd>
    </div>
  );
}
