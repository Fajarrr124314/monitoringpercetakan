import type { Order } from "./types";

export type BillingCycle = {
  id: string; // e.g. "2026-11-2"
  label: string; // e.g. "16 - 30 Nov 2026"
  shortLabel: string; // e.g. "Siklus 2 (16-30 Nov)"
  periodNumber: 1 | 2;
  monthIndex: number; // 0-11
  monthName: string;
  year: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
  daysRemaining: number;
  totalDays: number;
  dayProgress: number; // e.g. 12 (hari ke-12)
};

export type CycleSummary = BillingCycle & {
  total: number;
  paid: number;
  unpaid: number;
  orderCount: number;
};

export type DashboardFinancials = {
  currentCycle: CycleSummary;
  month: {
    label: string;
    total: number;
    paid: number;
    unpaid: number;
    orderCount: number;
    cycle1Total: number;
    cycle2Total: number;
  };
  year: {
    year: number;
    total: number;
    paid: number;
    unpaid: number;
    orderCount: number;
  };
  totalOutstanding: number; // Total belum dibayar dari semua order
  recentCycles: CycleSummary[];
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatYMD(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

/**
 * Menghasilkan informasi siklus pembayaran 15 harian dari tanggal tertentu.
 * Periode 1: Tanggal 1 - 15
 * Periode 2: Tanggal 16 - Akhir Bulan
 */
export function getBillingCycle(date: Date = new Date(), referenceNow: Date = new Date()): BillingCycle {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const monthName = MONTH_NAMES[monthIndex];
  const monthShort = MONTH_NAMES_SHORT[monthIndex];

  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  const periodNumber: 1 | 2 = day <= 15 ? 1 : 2;

  const startDay = periodNumber === 1 ? 1 : 16;
  const endDay = periodNumber === 1 ? 15 : lastDayOfMonth;

  const startDate = formatYMD(year, monthIndex, startDay);
  const endDate = formatYMD(year, monthIndex, endDay);

  const id = `${year}-${pad(monthIndex + 1)}-${periodNumber}`;

  // Cek apakah siklus ini adalah siklus berjalan relatif terhadap referenceNow
  const refYear = referenceNow.getFullYear();
  const refMonth = referenceNow.getMonth();
  const refDay = referenceNow.getDate();
  const isCurrent = refYear === year && refMonth === monthIndex && (refDay <= 15 ? 1 : 2) === periodNumber;

  const totalDays = endDay - startDay + 1;
  const dayProgress = isCurrent ? Math.max(1, Math.min(totalDays, refDay - startDay + 1)) : totalDays;
  const daysRemaining = isCurrent ? Math.max(0, endDay - refDay) : 0;

  const label = periodNumber === 1
    ? `01 - 15 ${monthShort} ${year}`
    : `16 - ${lastDayOfMonth} ${monthShort} ${year}`;

  const shortLabel = `Siklus ${periodNumber} (${periodNumber === 1 ? "1-15" : `16-${lastDayOfMonth}`} ${monthShort})`;

  return {
    id,
    label,
    shortLabel,
    periodNumber,
    monthIndex,
    monthName,
    year,
    startDate,
    endDate,
    isCurrent,
    daysRemaining,
    totalDays,
    dayProgress,
  };
}

/**
 * Menghasilkan daftar N siklus pembayaran 15 harian ke belakang
 */
export function getRecentBillingCycles(count: number = 4, referenceNow: Date = new Date()): BillingCycle[] {
  const cycles: BillingCycle[] = [];
  let currentRef = new Date(referenceNow.getTime());

  for (let i = 0; i < count; i++) {
    const cycle = getBillingCycle(currentRef, referenceNow);
    cycles.push(cycle);

    // Geser ke siklus sebelumnya
    if (cycle.periodNumber === 2) {
      // Mundur ke tanggal 15 bulan yang sama
      currentRef = new Date(cycle.year, cycle.monthIndex, 15);
    } else {
      // Mundur ke akhir bulan sebelumnya
      const prevMonthLastDate = new Date(cycle.year, cycle.monthIndex, 0);
      currentRef = prevMonthLastDate;
    }
  }

  return cycles;
}

/**
 * Menghitung metrik finansial untuk Dashboard
 */
export function calculateDashboardFinancials(
  orders: Pick<Order, "total" | "down_payment" | "cash_paid" | "noncash_paid" | "order_date" | "status">[],
  referenceNow: Date = new Date()
): DashboardFinancials {
  const activeOrders = orders.filter((o) => o.status !== "batal");

  const currentYear = referenceNow.getFullYear();
  const currentMonthIndex = referenceNow.getMonth();
  const currentCycle = getBillingCycle(referenceNow, referenceNow);

  const monthStartStr = formatYMD(currentYear, currentMonthIndex, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const monthEndStr = formatYMD(currentYear, currentMonthIndex, lastDayOfMonth);

  const yearStartStr = `${currentYear}-01-01`;
  const yearEndStr = `${currentYear}-12-31`;

  let cycleTotal = 0;
  let cyclePaid = 0;
  let cycleOrderCount = 0;

  let monthTotal = 0;
  let monthPaid = 0;
  let monthOrderCount = 0;
  let cycle1Total = 0;
  let cycle2Total = 0;

  let yearTotal = 0;
  let yearPaid = 0;
  let yearOrderCount = 0;

  let totalOutstanding = 0;

  for (const o of activeOrders) {
    const dateStr = o.order_date;
    const total = Number(o.total) || 0;
    const paid = (Number(o.down_payment) || 0) + (Number(o.cash_paid) || 0) + (Number(o.noncash_paid) || 0);
    const unpaid = Math.max(0, total - paid);

    // Akumulasi total belum lunas seluruhnya
    totalOutstanding += unpaid;

    // Filter Tahun Ini
    if (dateStr >= yearStartStr && dateStr <= yearEndStr) {
      yearTotal += total;
      yearPaid += paid;
      yearOrderCount += 1;
    }

    // Filter Bulan Ini
    if (dateStr >= monthStartStr && dateStr <= monthEndStr) {
      monthTotal += total;
      monthPaid += paid;
      monthOrderCount += 1;

      // Breakdown Siklus 1 vs Siklus 2
      const dayNum = parseInt(dateStr.slice(8, 10), 10);
      if (dayNum <= 15) {
        cycle1Total += total;
      } else {
        cycle2Total += total;
      }
    }

    // Filter Siklus 15 Hari Berjalan
    if (dateStr >= currentCycle.startDate && dateStr <= currentCycle.endDate) {
      cycleTotal += total;
      cyclePaid += paid;
      cycleOrderCount += 1;
    }
  }

  // Rekap beberapa siklus terakhir
  const recentCyclesMeta = getRecentBillingCycles(4, referenceNow);
  const recentCycles: CycleSummary[] = recentCyclesMeta.map((cycle) => {
    let tot = 0;
    let pd = 0;
    let count = 0;

    for (const o of activeOrders) {
      if (o.order_date >= cycle.startDate && o.order_date <= cycle.endDate) {
        const total = Number(o.total) || 0;
        const paid = (Number(o.down_payment) || 0) + (Number(o.cash_paid) || 0) + (Number(o.noncash_paid) || 0);
        tot += total;
        pd += paid;
        count += 1;
      }
    }

    return {
      ...cycle,
      total: tot,
      paid: pd,
      unpaid: Math.max(0, tot - pd),
      orderCount: count,
    };
  });

  return {
    currentCycle: {
      ...currentCycle,
      total: cycleTotal,
      paid: cyclePaid,
      unpaid: Math.max(0, cycleTotal - cyclePaid),
      orderCount: cycleOrderCount,
    },
    month: {
      label: `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`,
      total: monthTotal,
      paid: monthPaid,
      unpaid: Math.max(0, monthTotal - monthPaid),
      orderCount: monthOrderCount,
      cycle1Total,
      cycle2Total,
    },
    year: {
      year: currentYear,
      total: yearTotal,
      paid: yearPaid,
      unpaid: Math.max(0, yearTotal - yearPaid),
      orderCount: yearOrderCount,
    },
    totalOutstanding,
    recentCycles,
  };
}
