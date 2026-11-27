// Tata letak nota (Faktur) mengikuti desain "YOGYA 090926.PDF".
// Semua koordinat dalam pt (1/72 inci) pada kertas 684 x 396 pt (9.5 x 5.5 inci, continuous form).
// y = garis dasar (baseline) teks. Dipakai bersama oleh tampilan web (HTML) dan PDF.

import { dateNota, dateSlash, meters, money, money2, timeNota } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import type { OrderItem, OrderStatus, Settings } from "@/lib/types";

export const NOTA_W = 684;
export const NOTA_H = 396;
const GRAY = "#808080";
const LIGHT = "#c0c0c0";
const ROW = 27; // tinggi 1 item (2 baris)
const LINE = 13.5; // jarak antar baris
export const FULL_PAGE_ITEMS = 7; // halaman tanpa blok total
export const LAST_PAGE_ITEMS = 2; // halaman terakhir (dengan blok total & catatan)

export type NotaText = {
  x: number; // kiri (align left) atau kanan (align right)
  y: number; // baseline
  text: string;
  size: number;
  bold?: boolean;
  align?: "left" | "right";
  maxWidth?: number;
};
export type NotaLine = { x1: number; x2: number; y: number; color: string };
export type NotaPage = {
  texts: NotaText[];
  lines: NotaLine[];
  logo: { x: number; y: number; w: number; h: number };
  watermark?: string;
};

export type NotaData = {
  settings: Pick<Settings, "business_name" | "address" | "phone" | "email" | "tagline" | "footer_note" | "thanks_note">;
  order: {
    order_no: string | null; status: OrderStatus; order_date: string; due_at: string | null;
    subtotal: number; discount: number; tax: number; other_cost: number; total: number;
    down_payment: number; cash_paid: number; noncash_paid: number; payment_ref: string;
  };
  customer: { name: string; address: string; city: string; province: string } | null;
  creatorName: string;
  items: Pick<OrderItem,
    "product_code" | "product_name" | "description" | "notes" | "qty" | "width_cm" | "height_cm" |
    "pricing_unit" | "unit_label" | "unit_price" | "design_fee" | "other_fee" | "subtotal">[];
  printedAt: string | Date;
};

/** Bagi item ke beberapa halaman. Halaman terakhir maks 2 item (ada blok total). */
export function paginate(n: number): number[] {
  if (n <= LAST_PAGE_ITEMS) return [n];
  const pages = 1 + Math.ceil((n - LAST_PAGE_ITEMS) / FULL_PAGE_ITEMS);
  const last = Math.min(LAST_PAGE_ITEMS, n - (pages - 1));
  const rest = n - last;
  const base = Math.floor(rest / (pages - 1));
  const extra = rest % (pages - 1);
  return [...Array.from({ length: pages - 1 }, (_, i) => base + (i < extra ? 1 : 0)), last];
}

// Lebar huruf Helvetica/Arial Bold (per 1000 em) untuk memecah teks terbilang
const BOLD_W: Record<string, number> = {
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556, K: 722, L: 611, M: 833,
  N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, " ": 278,
};
export function boldWidth(s: string, size: number) {
  return ([...s].reduce((w, c) => w + (BOLD_W[c] ?? 611), 0) / 1000) * size;
}
function wrapBold(text: string, size: number, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && boldWidth(next, size) > max) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function buildNota(d: NotaData): NotaPage[] {
  const sizes = paginate(d.items.length);
  const o = d.order;
  const due = o.total - o.down_payment - o.cash_paid - o.noncash_paid;
  const pages: NotaPage[] = [];
  let start = 0;

  sizes.forEach((count, pi) => {
    const texts: NotaText[] = [];
    const lines: NotaLine[] = [];
    const t = (x: number, y: number, text: string, size = 8.5, opts: Partial<NotaText> = {}) => {
      if (text) texts.push({ x, y, text, size, ...opts });
    };
    const line = (x1: number, x2: number, y: number, color = GRAY) => lines.push({ x1, x2, y, color });
    const isLast = pi === sizes.length - 1;

    // ---- Kop ----
    t(120.5, 30.9, d.settings.business_name, 12, { bold: true, maxWidth: 410 });
    t(120.5, 45.7, d.settings.address, 8.5, { maxWidth: 410 });
    t(120.5, 54.85, `Tlp/Email : ${[d.settings.phone, d.settings.email].filter(Boolean).join(" - ")}`, 8.5, { maxWidth: 440 });
    t(21.5, 84.8, d.settings.tagline, 7, { maxWidth: 270 });
    t(567.5, 45.7, "Faktur", 8.5, { bold: true, align: "right" });
    t(567.5, 68.2, `Tgl. Cetak : ${dateSlash(d.printedAt)}`, 8.5, { align: "right" });
    if (sizes.length > 1) t(567.5, 84.8, `Hal. ${pi + 1}/${sizes.length}`, 7, { align: "right" });
    line(20, 573.5, 74);

    // ---- Kepada ----
    t(21.5, 104.2, "Kepada", 8.5, { bold: true });
    t(103, 105.6, o.due_at ? dateNota(o.due_at) : "", 10);
    t(22, 119.2, d.customer?.name ?? "", 10, { maxWidth: 245 });
    line(20, 269.45, 128.25, LIGHT);
    t(22, 139.35, [d.customer?.address, d.customer?.city].filter(Boolean).join(", "), 10, { maxWidth: 245 });
    t(22, 150.95, d.customer?.province ?? "", 10, { maxWidth: 245 });

    // ---- Info order ----
    t(319.7, 104.2, "No. Order", 8.5, { bold: true });
    t(393.9, 105.6, o.order_no ?? "", 10);
    t(319.7, 117.8, "Tanggal", 8.5, { bold: true });
    t(395.5, 119.1, dateNota(o.order_date), 10);
    t(463, 119.1, timeNota(o.order_date), 10);
    t(320, 131.2, "Estimasi Selesai", 8.5, { bold: true });
    t(395.5, 132.6, o.due_at ? dateNota(o.due_at) : "", 10);
    t(463, 132.6, timeNota(o.due_at), 10);
    t(320, 144.7, "Karyawan", 8.5, { bold: true });
    t(395.5, 146.1, d.creatorName, 10, { maxWidth: 175 });

    // ---- Tabel ----
    line(20, 573.5, 159.5);
    for (const [x, label] of [
      [22.4, "No."], [44, "Item Pesanan"], [244.85, "Jml & Dimensi"], [345.9, "Harga"],
      [392.6, "Jasa Desain"], [466.35, "Lain2"], [519.65, "Subtotal"],
    ] as const) t(x, 169.2, label);
    line(20, 573.5, 176.5);

    d.items.slice(start, start + count).forEach((it, i) => {
      const y = 186.7 + ROW * i;
      t(37.83, y, String(start + i + 1), 8.5, { align: "right" });
      t(44.5, y, it.product_code, 8.5, { maxWidth: 100 });
      t(148, y, it.description || "-", 8.5, { maxWidth: 108 });
      t(265.48, y, String(it.qty), 8.5, { align: "right" });
      t(269.5, y, it.pricing_unit === "m2" ? `${meters(it.width_cm)}x${meters(it.height_cm)} ${it.unit_label}` : it.unit_label, 8.5, { maxWidth: 74 });
      t(382.48, y, money(it.unit_price), 8.5, { align: "right" });
      t(445.48, y, money2(it.design_fee), 8.5, { align: "right" });
      t(503.98, y, money(it.other_fee), 8.5, { align: "right" });
      t(571.48, y, money(it.subtotal), 8.5, { align: "right" });
      t(44.5, y + LINE, it.product_name, 8.5, { maxWidth: 100 });
      t(148, y + LINE, it.notes || "-", 8.5, { maxWidth: 108 });
    });

    if (!isLast) {
      t(567.5, 385, "Bersambung ke halaman berikutnya...", 7, { align: "right" });
    } else {
      const L = 176.5 + ROW * count + 7;
      const y0 = L + 12.2;
      line(20, 573.5, L);

      wrapBold(terbilang(o.total), 8.5, 270).forEach((s, i) => t(21.5, y0 + i * 10.5, s, 8.5, { bold: true }));

      const mid: [string, number][] = [
        ["Total Transaksi", o.subtotal], ["Diskon", o.discount], ["PPN", o.tax], ["Biaya Lain", o.other_cost], ["Total", o.total],
      ];
      mid.forEach(([label, v], i) => {
        t(300.5, y0 + LINE * i, label);
        t(423, y0 + LINE * i, money2(v), 8.5, { align: "right" });
      });
      const right: [string, string][] = [
        ["Uang Muka", money2(o.down_payment)], ["Tunai", money2(o.cash_paid)], ["Non Tunai", money2(o.noncash_paid)],
        ["Ref", o.payment_ref], ["Sisa/Kekurangan", money2(due)],
      ];
      right.forEach(([label, v], i) => {
        t(440, y0 + LINE * i, label);
        t(571.5, y0 + LINE * i, v, 8.5, { align: "right", maxWidth: 80 });
      });

      t(21.5, L + 72.35, "Petugas");
      t(134, L + 70.7, "Penerima");
      line(20, 569, L + 109.5, LIGHT);
      t(21.5, L + 118.2, d.settings.footer_note, 8.5, { maxWidth: 545 });
      t(21.5, L + 130.2, d.settings.thanks_note, 8.5, { maxWidth: 545 });
    }

    const isLunas = o.total > 0 && due <= 0;

    pages.push({
      texts, lines,
      logo: { x: 20, y: 20, w: 99, h: 54 },
      watermark: o.status === "batal" ? "BATAL" : isLunas ? "LUNAS" : undefined,
    });
    start += count;
  });

  return pages;
}
