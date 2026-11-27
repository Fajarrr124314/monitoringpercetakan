// Rumus hitung budget. HARUS sama dengan fungsi SQL calc_item_subtotal/calc_tax
// di supabase/migrations/0002_functions.sql (dicek oleh tests/db.test.ts).

export type PricingUnit = "m2" | "pcs";

export type ItemInput = {
  pricingUnit: PricingUnit;
  qty: number;
  widthCm: number;
  heightCm: number;
  unitPrice: number;
  designFee: number;
  otherFee: number;
};

export type OrderInput = {
  items: ItemInput[];
  discount: number;
  taxPercent: number;
  otherCost: number;
};

const int = (n: number) => (Number.isFinite(n) ? Math.trunc(n) : 0);

/** Pembulatan setengah ke atas, sama seperti round() numeric di Postgres. */
function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const q = numerator / denominator;
  const r = numerator % denominator;
  return r * BigInt(2) >= denominator ? q + BigInt(1) : q;
}

/** m2: qty x (lebar x tinggi cm / 10.000) x harga. pcs: qty x harga. Ditambah jasa desain & lain-lain. */
export function itemSubtotal(item: ItemInput): number {
  const qty = BigInt(int(item.qty));
  const price = BigInt(int(item.unitPrice));
  const base =
    item.pricingUnit === "m2"
      ? roundHalfUp(qty * BigInt(int(item.widthCm)) * BigInt(int(item.heightCm)) * price, BigInt(10000))
      : qty * price;
  return Number(base) + int(item.designFee) + int(item.otherFee);
}

/** Luas total item dalam m2 (untuk tampilan). */
export function itemArea(item: Pick<ItemInput, "qty" | "widthCm" | "heightCm">): number {
  return (int(item.qty) * int(item.widthCm) * int(item.heightCm)) / 10000;
}

export function calcTax(base: number, percent: number): number {
  // persen disimpan 2 desimal -> hitung dalam basis 10.000 agar presisi
  const p = BigInt(Math.round(percent * 100));
  return Number(roundHalfUp(BigInt(Math.max(int(base), 0)) * p, BigInt(10000)));
}

export function orderTotals(order: OrderInput) {
  const subtotal = order.items.reduce((sum, it) => sum + itemSubtotal(it), 0);
  const discount = int(order.discount);
  const tax = calcTax(subtotal - discount, order.taxPercent);
  const otherCost = int(order.otherCost);
  return { subtotal, discount, tax, otherCost, total: subtotal - discount + tax + otherCost };
}

export function amountDue(total: number, downPayment: number, cash: number, nonCash: number) {
  return total - downPayment - cash - nonCash;
}
