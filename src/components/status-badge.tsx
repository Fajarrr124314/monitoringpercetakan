import { STATUS_COLOR, STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PayBadge({ label }: { label: string }) {
  const color =
    label === "Lunas" ? "bg-emerald-100 text-emerald-800" : label === "Sebagian" ? "bg-amber-100 text-amber-800"
      : label === "Belum Bayar" ? "bg-rose-100 text-rose-700" : "text-slate-400";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${color}`}>{label}</span>;
}
