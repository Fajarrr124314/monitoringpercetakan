import type { OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft", masuk: "Order Masuk", produksi: "Produksi", finishing: "Finishing", selesai: "Selesai", batal: "Batal",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  draft: "bg-slate-100 text-slate-700", masuk: "bg-blue-100 text-blue-800", produksi: "bg-amber-100 text-amber-800",
  finishing: "bg-purple-100 text-purple-800", selesai: "bg-emerald-100 text-emerald-800", batal: "bg-rose-100 text-rose-700",
};

export const STATUS_ACTION: Record<OrderStatus, string> = {
  draft: "", masuk: "Kirim & Terbitkan Nota", produksi: "Mulai Produksi", finishing: "Finishing",
  selesai: "Tandai Selesai", batal: "Batalkan Order",
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["masuk", "batal"], masuk: ["produksi", "batal"], produksi: ["finishing", "selesai"],
  finishing: ["selesai"], selesai: [], batal: [],
};

export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function canEditOrder(status: OrderStatus) {
  return status === "draft" || status === "masuk";
}

export function paymentInfo(o: { status: OrderStatus; total: number; down_payment: number; cash_paid: number; noncash_paid: number }) {
  const paid = o.down_payment + o.cash_paid + o.noncash_paid;
  const due = o.total - paid;
  const label = o.status === "draft" || o.status === "batal" ? "-" : due <= 0 ? "Lunas" : paid > 0 ? "Sebagian" : "Belum Bayar";
  return { paid, due, label };
}
