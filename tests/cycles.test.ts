import { describe, expect, it } from "vitest";
import {
  calculateDashboardFinancials,
  getBillingCycle,
  getRecentBillingCycles,
} from "@/lib/cycles";
import type { Order } from "@/lib/types";

describe("Billing Cycles 15 Harian", () => {
  it("menentukan Siklus 1 (1 - 15) dengan tepat", () => {
    const d = new Date(2026, 10, 10); // 10 Nov 2026
    const cycle = getBillingCycle(d, d);
    expect(cycle.periodNumber).toBe(1);
    expect(cycle.startDate).toBe("2026-11-01");
    expect(cycle.endDate).toBe("2026-11-15");
    expect(cycle.totalDays).toBe(15);
    expect(cycle.dayProgress).toBe(10);
    expect(cycle.daysRemaining).toBe(5);
  });

  it("menentukan Siklus 2 (16 - akhir bulan) dengan tepat", () => {
    const d = new Date(2026, 10, 27); // 27 Nov 2026 (Nov = 30 hari)
    const cycle = getBillingCycle(d, d);
    expect(cycle.periodNumber).toBe(2);
    expect(cycle.startDate).toBe("2026-11-16");
    expect(cycle.endDate).toBe("2026-11-30");
    expect(cycle.totalDays).toBe(15); // 16 to 30 = 15 days
    expect(cycle.daysRemaining).toBe(3);
  });

  it("menghasilkan 4 siklus berurutan ke belakang", () => {
    const now = new Date(2026, 10, 27); // 27 Nov 2026 (Siklus 2)
    const cycles = getRecentBillingCycles(4, now);
    expect(cycles.map((c) => c.label)).toEqual([
      "16 - 30 Nov 2026",
      "01 - 15 Nov 2026",
      "16 - 31 Okt 2026",
      "01 - 15 Okt 2026",
    ]);
  });

  it("menghitung metrik finansial siklus 15 hari, bulanan, dan tahunan", () => {
    const now = new Date(2026, 10, 27); // 27 Nov 2026

    const mockOrders: Partial<Order>[] = [
      // Siklus 1 Nov: total 100.000, lunas
      {
        order_date: "2026-11-05",
        total: 100000,
        down_payment: 50000,
        cash_paid: 50000,
        noncash_paid: 0,
        status: "selesai",
      },
      // Siklus 2 Nov: total 250.000, bayar DP 100.000, sisa 150.000
      {
        order_date: "2026-11-20",
        total: 250000,
        down_payment: 100000,
        cash_paid: 0,
        noncash_paid: 0,
        status: "produksi",
      },
      // Siklus 2 Nov: total 150.000, belum bayar
      {
        order_date: "2026-11-25",
        total: 150000,
        down_payment: 0,
        cash_paid: 0,
        noncash_paid: 0,
        status: "masuk",
      },
      // Order bulan lalu (Okt 2026): total 500.000
      {
        order_date: "2026-10-20",
        total: 500000,
        down_payment: 500000,
        cash_paid: 0,
        noncash_paid: 0,
        status: "selesai",
      },
      // Order yang dibatalkan (tidak boleh dihitung)
      {
        order_date: "2026-11-22",
        total: 999999,
        down_payment: 0,
        cash_paid: 0,
        noncash_paid: 0,
        status: "batal",
      },
    ];

    const fin = calculateDashboardFinancials(mockOrders as Order[], now);

    // Siklus 2 Nov (16-30 Nov): 250.000 + 150.000 = 400.000
    expect(fin.currentCycle.total).toBe(400000);
    expect(fin.currentCycle.paid).toBe(100000);
    expect(fin.currentCycle.unpaid).toBe(300000);
    expect(fin.currentCycle.orderCount).toBe(2);

    // Bulan Ini (Nov 2026): 100.000 + 400.000 = 500.000
    expect(fin.month.total).toBe(500000);
    expect(fin.month.cycle1Total).toBe(100000);
    expect(fin.month.cycle2Total).toBe(400000);
    expect(fin.month.orderCount).toBe(3);

    // Tahun Ini (2026): 500.000 (Nov) + 500.000 (Okt) = 1.000.000
    expect(fin.year.total).toBe(1000000);
    expect(fin.year.orderCount).toBe(4);

    // Total Piutang / Belum Lunas: 150.000 + 150.000 = 300.000
    expect(fin.totalOutstanding).toBe(300000);
  });
});
