"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/form";
import { itemArea, itemSubtotal, orderTotals } from "@/lib/pricing";
import { money, rupiah } from "@/lib/format";
import type { BudgetUsage, Customer, FormState, Product } from "@/lib/types";

export type ItemRow = {
  key: string;
  product_id: string;
  description: string;
  notes: string;
  qty: string;
  width_m: string;
  height_m: string;
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

const n = (s: string) => {
  const v = Number(String(s).replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const cm = (m: string) => Math.round(n(m) * 100);
const emptyRow = (key: string): ItemRow => ({
  key, product_id: "", description: "", notes: "", qty: "1", width_m: "1.00", height_m: "1.00",
  unit_price: "", design_fee: "0", other_fee: "0",
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
  const [rows, setRows] = useState<ItemRow[]>(initial.items.length ? initial.items : [emptyRow("r0")]);
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
    const item = {
      pricingUnit: p?.pricing_unit ?? "m2", qty: Math.trunc(n(r.qty)), widthCm: cm(r.width_m), heightCm: cm(r.height_m),
      unitPrice: price, designFee: Math.trunc(n(r.design_fee)), otherFee: Math.trunc(n(r.other_fee)),
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
      width_cm: productById.get(r.product_id)?.pricing_unit === "pcs" ? 100 : cm(r.width_m),
      height_cm: productById.get(r.product_id)?.pricing_unit === "pcs" ? 100 : cm(r.height_m),
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

      <div className="space-y-3">
        {calcRows.map(({ row: r, product: p, subtotal }, i) => (
          <div key={r.key} className="card grid gap-3 md:grid-cols-12">
            <div className="flex items-center justify-between md:col-span-12">
              <span className="text-sm font-medium">Item {i + 1}</span>
              {rows.length > 1 && (
                <button type="button" className="text-xs text-rose-600 hover:underline"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  Hapus item
                </button>
              )}
            </div>
            <div className="md:col-span-4">
              <label className="label">Bahan</label>
              <select value={r.product_id} required className="input"
                onChange={(e) => update(r.key, { product_id: e.target.value, unit_price: "" })}>
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
              <input value={r.description} onChange={(e) => update(r.key, { description: e.target.value })}
                className="input" placeholder="VASELINE LUCKY DIP" />
            </div>
            <div className="md:col-span-3">
              <label className="label">Keterangan item</label>
              <input value={r.notes} onChange={(e) => update(r.key, { notes: e.target.value })} className="input" />
            </div>

            <div className="md:col-span-2">
              <label className="label">Jumlah</label>
              <input type="number" min={1} step={1} value={r.qty} required className="input"
                onChange={(e) => update(r.key, { qty: e.target.value })} />
            </div>
            {p?.pricing_unit !== "pcs" && (
              <>
                <div className="md:col-span-2">
                  <label className="label">Lebar (m)</label>
                  <input type="number" min={0.01} step={0.01} value={r.width_m} required className="input"
                    onChange={(e) => update(r.key, { width_m: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Tinggi (m)</label>
                  <input type="number" min={0.01} step={0.01} value={r.height_m} required className="input"
                    onChange={(e) => update(r.key, { height_m: e.target.value })} />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="label">Harga satuan (Rp)</label>
              <input
                type="number" min={0} step={1} value={r.unit_price}
                placeholder={p ? String(p.price) : ""}
                className="input"
                onChange={(e) => update(r.key, { unit_price: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Jasa desain (Rp)</label>
              <input type="number" min={0} step={1} value={r.design_fee} className="input"
                onChange={(e) => update(r.key, { design_fee: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Lain-lain (Rp)</label>
              <input type="number" min={0} step={1} value={r.other_fee} className="input"
                onChange={(e) => update(r.key, { other_fee: e.target.value })} />
            </div>
            <div className="text-right text-sm md:col-span-12">
              {p?.pricing_unit === "m2" && (
                <span className="mr-3 text-slate-500">
                  Luas {itemArea({ qty: Math.trunc(n(r.qty)), widthCm: cm(r.width_m), heightCm: cm(r.height_m) }).toLocaleString("id-ID")} m²
                </span>
              )}
              Subtotal: <b>{rupiah(subtotal)}</b>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => setRows((rs) => [...rs, emptyRow(crypto.randomUUID())])}>
          + Tambah item
        </button>
      </div>

      <div className="card grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-3 content-start gap-3">
          <div>
            <label className="label">Diskon (Rp)</label>
            <input type="number" min={0} step={1} value={discount} onChange={(e) => setDiscount(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">PPN (%)</label>
            <input type="number" min={0} max={100} step={0.01} value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Biaya lain (Rp)</label>
            <input type="number" min={0} step={1} value={otherCost} onChange={(e) => setOtherCost(e.target.value)} className="input" />
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
            <SubmitButton name="intent" value="draft" className="btn">Simpan Draft</SubmitButton>
            <SubmitButton name="intent" value="submit" className="btn btn-primary">Kirim &amp; Terbitkan Nota</SubmitButton>
          </>
        ) : (
          <SubmitButton name="intent" value="draft" className="btn btn-primary">Simpan Perubahan (nota ikut diperbarui)</SubmitButton>
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
