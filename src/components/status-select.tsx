"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@/lib/types";
import { updateProductionStatusAction } from "@/app/(app)/orders/actions";
import { Loader2 } from "lucide-react";
import { ConfirmModal, ToastModal } from "@/components/ui/modal";

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
  const [pendingCancelStatus, setPendingCancelStatus] = useState<OrderStatus | null>(null);
  const [toast, setToast] = useState<{ open: boolean; title: string; message: string; variant?: "success" | "error" }>({
    open: false,
    title: "",
    message: "",
  });

  const currentOption = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

  const applyStatusChange = (newStatus: OrderStatus) => {
    setStatus(newStatus);
    startTransition(async () => {
      const res = await updateProductionStatusAction(orderId, newStatus);
      if (res?.error) {
        setStatus(status); // rollback
        setToast({
          open: true,
          title: "Gagal Mengubah Status",
          message: res.error,
          variant: "error",
        });
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as OrderStatus;
    if (nextStatus === status) return;

    if (nextStatus === "batal") {
      setPendingCancelStatus(nextStatus);
      return;
    }

    applyStatusChange(nextStatus);
  };

  return (
    <>
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

        {isPending ? (
          <Loader2 className="pointer-events-none absolute right-2 h-3 w-3 animate-spin text-slate-400" />
        ) : (
          <svg
            className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Confirmation Modal when changing to 'Batal' */}
      <ConfirmModal
        isOpen={pendingCancelStatus !== null}
        onClose={() => setPendingCancelStatus(null)}
        onConfirm={() => {
          if (pendingCancelStatus) {
            applyStatusChange(pendingCancelStatus);
            setPendingCancelStatus(null);
          }
        }}
        title="Batalkan Pesanan?"
        message={
          <div>
            <p>Apakah Anda yakin ingin menandai status order ini sebagai <b>BATAL</b>?</p>
            <p className="mt-2 text-[11px] text-slate-500">
              Order yang dibatalkan tidak akan dihitung ke dalam omset aktif.
            </p>
          </div>
        }
        variant="warning"
        confirmText="Ya, Batalkan Order"
        cancelText="Kembali"
        isPending={isPending}
      />

      {/* Toast Feedback */}
      <ToastModal
        isOpen={toast.open}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
      />
    </>
  );
}
