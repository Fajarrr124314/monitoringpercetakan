"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@/lib/types";
import { updateProductionStatusAction } from "@/app/(app)/orders/actions";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "masuk", label: "Masuk", color: "bg-blue-50 text-blue-800 border-blue-300 font-semibold" },
  { value: "produksi", label: "Sedang Produksi", color: "bg-amber-50 text-amber-800 border-amber-300 font-semibold" },
  { value: "finishing", label: "Finishing", color: "bg-purple-50 text-purple-800 border-purple-300 font-semibold" },
  { value: "selesai", label: "Selesai", color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold" },
  { value: "batal", label: "Batal", color: "bg-rose-50 text-rose-700 border-rose-300" },
];

export function StatusSelect({
  orderId,
  currentStatus,
  compact = false,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();

  const currentOption = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as OrderStatus;
    if (nextStatus === status) return;

    if (nextStatus === "batal" && !confirm("Yakin ingin membatalkan order ini?")) {
      return;
    }

    setStatus(nextStatus);
    startTransition(async () => {
      const res = await updateProductionStatusAction(orderId, nextStatus);
      if (res?.error) {
        alert(res.error);
        setStatus(currentStatus); // rollback jika gagal
      }
    });
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        onChange={handleChange}
        disabled={isPending}
        title="Klik untuk ubah status produksi secara instan"
        className={`cursor-pointer appearance-none rounded-full border px-2.5 py-1 pr-6 text-xs transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
          currentOption.color
        } ${isPending ? "opacity-60" : "hover:brightness-95"} ${compact ? "py-0.5 text-[11px]" : ""}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-normal">
            {opt.label}
          </option>
        ))}
      </select>

      {/* Spinner jika sedang loading atau panah chevron */}
      <div className="pointer-events-none absolute right-2 flex items-center">
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
        ) : (
          <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}
