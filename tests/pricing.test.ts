import { describe, expect, it } from "vitest";
import { calcTax, itemSubtotal, orderTotals } from "@/lib/pricing";
import { terbilang } from "@/lib/terbilang";
import { meters, money, money2 } from "@/lib/format";

const flexy = { pricingUnit: "m2" as const, unitPrice: 20000, designFee: 0, otherFee: 0 };

describe("hitung budget", () => {
  it("sesuai contoh nota YOGYA (101,000)", () => {
    const items = [
      { ...flexy, qty: 1, widthCm: 100, heightCm: 100 },
      { ...flexy, qty: 1, widthCm: 405, heightCm: 100 },
    ];
    expect(items.map(itemSubtotal)).toEqual([20000, 81000]);
    expect(orderTotals({ items, discount: 0, taxPercent: 0, otherCost: 0 }).total).toBe(101000);
  });

  it("per pcs, jasa desain, lain-lain", () => {
    expect(itemSubtotal({ pricingUnit: "pcs", qty: 1000, widthCm: 1, heightCm: 1, unitPrice: 350, designFee: 50000, otherFee: 2500 }))
      .toBe(402500);
  });

  it("membulatkan setengah ke atas", () => {
    // 1 x 33cm x 33cm x 20.000 / 10.000 = 2178
    expect(itemSubtotal({ ...flexy, qty: 1, widthCm: 33, heightCm: 33 })).toBe(2178);
    // 1 x 1cm x 25cm x 1.000 / 10.000 = 2.5 -> 3
    expect(itemSubtotal({ ...flexy, unitPrice: 1000, qty: 1, widthCm: 1, heightCm: 25 })).toBe(3);
  });

  it("diskon, PPN, biaya lain", () => {
    const t = orderTotals({ items: [{ ...flexy, qty: 2, widthCm: 300, heightCm: 100 }], discount: 10000, taxPercent: 11, otherCost: 5000 });
    expect(t).toEqual({ subtotal: 120000, discount: 10000, tax: 12100, otherCost: 5000, total: 127100 });
    expect(calcTax(55555, 11)).toBe(6111);
  });
});

describe("terbilang", () => {
  it.each([
    [101000, "SERATUS SATU RIBU RUPIAH"],
    [0, "NOL RUPIAH"],
    [11, "SEBELAS RUPIAH"],
    [1000, "SERIBU RUPIAH"],
    [1001001, "SATU JUTA SERIBU SATU RUPIAH"],
    [1500000, "SATU JUTA LIMA RATUS RIBU RUPIAH"],
    [219750, "DUA RATUS SEMBILAN BELAS RIBU TUJUH RATUS LIMA PULUH RUPIAH"],
  ])("%i", (n, text) => expect(terbilang(n)).toBe(text));
});

describe("format nota", () => {
  it("angka & ukuran", () => {
    expect(money(81000)).toBe("81,000");
    expect(money2(101000)).toBe("101,000.00");
    expect(meters(405)).toBe("4.05");
  });
});
