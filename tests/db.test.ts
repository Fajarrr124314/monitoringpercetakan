// Uji skema, RPC & RLS pada Postgres lokal (PGlite) tanpa sistem login.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { itemSubtotal, type PricingUnit } from "@/lib/pricing";

const root = path.resolve(__dirname, "..");
let db: PGlite;
const ids = { customer: "", product: "", productPcs: "" };

function orderPayload(extra: Record<string, unknown> = {}) {
  return {
    customer_id: ids.customer,
    title: "Banner VASELINE",
    creator_name: "Saeful",
    items: [
      { product_id: ids.product, description: "VASELINE LUCKY DIP", qty: 1, width_cm: 100, height_cm: 100 },
      { product_id: ids.product, description: "VASELINE", qty: 1, width_cm: 405, height_cm: 100 },
    ],
    ...extra,
  };
}

async function saveOrder(payload: Record<string, unknown>) {
  const rows = (await db.query<{ id: string }>("select public.save_order($1::jsonb) as id", [JSON.stringify(payload)])).rows;
  return rows[0].id;
}

async function getOrder(id: string) {
  return (await db.query<Record<string, unknown>>("select * from public.orders where id = $1", [id])).rows[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(root, "tests/supabase-shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, f), "utf8"));
  }
  await db.exec(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));

  ids.customer = (await db.query<{ id: string }>("select id from public.customers limit 1")).rows[0].id;
  ids.product = (await db.query<{ id: string }>("select id from public.products where code = '0200200003'")).rows[0].id;
  ids.productPcs = (await db.query<{ id: string }>(
    "insert into public.products (code, name, pricing_unit, unit_label, price) values ('BR-A5', 'BROSUR A5', 'pcs', 'LBR', 350) returning id")).rows[0].id;
});

afterAll(async () => {
  await db?.close();
});

describe("rumus SQL = rumus TypeScript", () => {
  it.each<[PricingUnit, number, number, number, number, number, number]>([
    ["m2", 1, 100, 100, 20000, 0, 0],
    ["m2", 1, 405, 100, 20000, 0, 0],
    ["m2", 3, 33, 33, 20000, 0, 0],
    ["m2", 1, 1, 25, 1000, 0, 0],
    ["m2", 7, 123, 457, 18500, 15000, 2000],
    ["pcs", 1000, 1, 1, 350, 50000, 2500],
  ])("%s qty=%i %ix%i @%i", async (unit, qty, w, h, price, design, other) => {
    const r = await db.query<{ v: string }>(
      "select public.calc_item_subtotal($1::public.pricing_unit, $2, $3, $4, $5, $6, $7)::text as v",
      [unit, qty, w, h, price, design, other]);
    expect(Number(r.rows[0].v)).toBe(
      itemSubtotal({ pricingUnit: unit, qty, widthCm: w, heightCm: h, unitPrice: price, designFee: design, otherFee: other }));
  });
});

describe("alur order tanpa login & tanpa approval", () => {
  let orderId = "";

  it("input order -> simpan & kirim -> nota langsung terbit otomatis", async () => {
    orderId = await saveOrder(orderPayload({ submit: true }));
    const o = await getOrder(orderId);
    expect(o.status).toBe("masuk");
    expect(o.order_no).toMatch(/^TJ\d{4}-00001$/);
    expect(o.creator_name).toBe("Saeful");
    expect(o.issued_at).not.toBeNull();
    expect(Number(o.subtotal)).toBe(101000);
    expect(Number(o.total)).toBe(101000);
  });

  it("bisa menyesuaikan harga, diskon, PPN", async () => {
    const id = await saveOrder(orderPayload({
      discount: 1000, tax_percent: 11, other_cost: 5000,
      items: [
        { product_id: ids.product, qty: 2, width_cm: 300, height_cm: 100, unit_price: 25000 },
        { product_id: ids.productPcs, qty: 1000, design_fee: 50000 },
      ],
    }));
    const o = await getOrder(id);
    expect([Number(o.subtotal), Number(o.tax), Number(o.total)]).toEqual([550000, 60390, 614390]);
  });

  it("edit saat 'masuk' memperbarui nota dengan nomor yang sama", async () => {
    const before = await getOrder(orderId);
    await saveOrder(orderPayload({
      id: orderId,
      items: [{ product_id: ids.product, description: "VASELINE", qty: 2, width_cm: 405, height_cm: 100 }],
    }));
    const after = await getOrder(orderId);
    expect(after.order_no).toBe(before.order_no);
    expect(Number(after.total)).toBe(162000);
  });

  it("setelah masuk produksi, order terkunci", async () => {
    await db.query("select public.set_order_status($1, 'produksi', 'mulai cetak', 'Operator')", [orderId]);
    await expect(saveOrder(orderPayload({ id: orderId }))).rejects.toThrow(/sudah masuk produksi/);
  });

  it("pembayaran dicatat langsung", async () => {
    await db.query("select public.record_payment($1, 50000, 0, 112000, 'TRF-1', 'Lunas', 'Kasir')", [orderId]);
    const o = await getOrder(orderId);
    expect(Number(o.total) - Number(o.down_payment) - Number(o.cash_paid) - Number(o.noncash_paid)).toBe(0);
  });

  it("timeline mencatat semua aktivitas", async () => {
    await db.query("select public.add_comment($1, 'tolong dibungkus rapi', 'Designer')", [orderId]);
    const logs = (await db.query<{ action: string; actor_name: string }>(
      "select action, actor_name from public.order_logs where order_id = $1 order by id", [orderId])).rows;
    expect(logs.map((l) => l.action)).toEqual(["dibuat", "status", "diubah", "status", "pembayaran", "komentar"]);
    expect(logs.find((l) => l.action === "komentar")?.actor_name).toBe("Designer");
  });

  it("pemantauan anggaran menghitung order yang masuk", async () => {
    await db.exec(`insert into public.budgets (name, period_start, period_end, amount)
                   values ('Semua', '2000-01-01', '2100-12-31', 200000)`);
    const [b] = (await db.query<{ used: string; order_count: string }>("select * from public.budget_usage()")).rows;
    expect(Number(b.used)).toBeGreaterThan(0);
  });
});
