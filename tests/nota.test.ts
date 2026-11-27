import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildNota, paginate, type NotaData, type NotaText } from "@/lib/nota-layout";

// Data dari nota contoh "YOGYA 090926.PDF"
export const SAMPLE: NotaData = {
  settings: {
    business_name: "Percetakan Sakinah",
    address: "Jl. Arif Rahman Hakim Niaga, Nagasari Karawang Barat, Karawang",
    phone: "0895626621300",
    email: "percetakansakinah@gmail.com",
    tagline: "Smart Shoping for Smart Buyer",
    footer_note: "Barang yang sudah dibeli tidak dapat dikembalikan tanpa ada perjanjian sebelumnya",
    thanks_note: "Terima Kasih Banyak Atas Kepercayaannya, Bca.1091937731 a/n.saeful anwar",
  },
  order: {
    order_no: "TJ2611-00019", status: "selesai",
    order_date: "2026-11-02T06:40:00Z", due_at: "2026-10-09T08:38:00Z",
    subtotal: 101000, discount: 0, tax: 0, other_cost: 0, total: 101000,
    down_payment: 0, cash_paid: 0, noncash_paid: 101000, payment_ref: "",
  },
  customer: { name: "YOGYA KARAWANG", address: "", city: "karawang", province: "Jawabarat" },
  creatorName: "",
  items: [
    { product_code: "0200200003", product_name: "FLEXY CHINA", description: "VASELINE LUCKY DIP", notes: "", qty: 1, width_cm: 100, height_cm: 100, pricing_unit: "m2", unit_label: "PCS", unit_price: 20000, design_fee: 0, other_fee: 0, subtotal: 20000 },
    { product_code: "0200200003", product_name: "FLEXY CHINA", description: "VASELINE", notes: "", qty: 1, width_cm: 405, height_cm: 100, pricing_unit: "m2", unit_label: "PCS", unit_price: 20000, design_fee: 0, other_fee: 0, subtotal: 81000 },
  ],
  printedAt: "2026-11-04T03:00:00Z",
};

const find = (texts: NotaText[], text: string, y?: number) =>
  texts.filter((t) => t.text === text && (y === undefined || Math.abs(t.y - y) < 0.01));

describe("tata letak nota", () => {
  const [page] = buildNota(SAMPLE);

  it("teks & posisi sama dengan nota asli", () => {
    // [teks, x (kiri atau kanan), baseline] diambil dari PDF asli
    const expected: [string, number, number][] = [
      ["Percetakan Sakinah", 120.5, 30.9], ["Faktur", 567.5, 45.7], ["Tgl. Cetak : 04/11/2026", 567.5, 68.2],
      ["Kepada", 21.5, 104.2], ["YOGYA KARAWANG", 22, 119.2], ["Jawabarat", 22, 150.95],
      ["TJ2611-00019", 393.9, 105.6], ["02 Nov 2026", 395.5, 119.1], ["13:40", 463, 119.1],
      ["09 Oct 2026", 395.5, 132.6], ["15:38", 463, 132.6],
      ["VASELINE LUCKY DIP", 148, 186.7], ["1.00x1.00 PCS", 269.5, 186.7], ["81,000", 571.48, 213.7],
      ["FLEXY CHINA", 44.5, 227.2], ["SERATUS SATU RIBU RUPIAH", 21.5, 249.7],
      ["Total Transaksi", 300.5, 249.7], ["Sisa/Kekurangan", 440, 303.7], ["Petugas", 21.5, 309.85],
      ["Penerima", 134, 308.2],
      ["Barang yang sudah dibeli tidak dapat dikembalikan tanpa ada perjanjian sebelumnya", 21.5, 355.7],
    ];
    for (const [text, x, y] of expected) {
      const hit = find(page.texts, text, y);
      expect(hit, `${text} @${y}`).toHaveLength(1);
      expect(hit[0].x).toBeCloseTo(x, 1);
    }
    expect(find(page.texts, "101,000.00").map((t) => [t.x, t.y])).toEqual([[423, 249.7], [423, 303.7], [571.5, 276.7]]);
    expect(page.lines.map((l) => l.y)).toEqual([74, 128.25, 159.5, 176.5, 237.5, 347]);
  });

  it("membagi halaman bila item banyak", () => {
    expect([1, 2, 3, 5, 9, 10, 16].map(paginate)).toEqual([[1], [2], [1, 2], [3, 2], [7, 2], [4, 4, 2], [7, 7, 2]]);
    const many = buildNota({ ...SAMPLE, items: Array.from({ length: 10 }, () => SAMPLE.items[0]) });
    expect(many).toHaveLength(3);
    expect(find(many[2].texts, "10")).toHaveLength(1);
    expect(find(many[0].texts, "Hal. 1/3")).toHaveLength(1);
    // tidak ada teks yang keluar dari kertas
    for (const p of many) for (const t of p.texts) expect(t.y).toBeLessThan(390);
  });

  it("terbilang panjang dipecah per baris", () => {
    const p = buildNota({ ...SAMPLE, order: { ...SAMPLE.order, total: 987654321 } })[0];
    const lines = p.texts.filter((t) => t.bold && t.x === 21.5 && t.y >= 249.7);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map((l) => l.text).join(" ")).toBe(
      "SEMBILAN RATUS DELAPAN PULUH TUJUH JUTA ENAM RATUS LIMA PULUH EMPAT RIBU TIGA RATUS DUA PULUH SATU RUPIAH");
  });

  it("render PDF", async () => {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { NotaPdf } = await import("@/lib/nota-pdf");
    const buf = await renderToBuffer(NotaPdf({ pages: buildNota(SAMPLE), title: "TJ2611-00019" }));
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    if (process.env.NOTA_PDF_OUT) {
      mkdirSync(path.dirname(process.env.NOTA_PDF_OUT), { recursive: true });
      writeFileSync(process.env.NOTA_PDF_OUT, buf);
    }
  });
});
