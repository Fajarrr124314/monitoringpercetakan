"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { settleCycleOrdersAction } from "@/app/(app)/orders/actions";
import { ConfirmModal, ToastModal } from "@/components/ui/modal";

export function CycleSettleButton({
  startDate,
  endDate,
  cycleLabel,
  unpaidAmount,
}: {
  startDate: string;
  endDate: string;
  cycleLabel: string;
  unpaidAmount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; title: string; message: string; variant?: "success" | "error" }>({
    open: false,
    title: "",
    message: "",
  });

  const handleSettleConfirm = () => {
    const formData = new FormData();
    formData.append("actor", "Pihak Mitra");
    formData.append("payment_ref", `Pelunasan Periode (${cycleLabel})`);

    startTransition(async () => {
      const res = await settleCycleOrdersAction(startDate, endDate, undefined, formData);
      setShowConfirm(false);
      if (res?.error) {
        setToast({
          open: true,
          title: "Pelunasan Gagal",
          message: res.error,
          variant: "error",
        });
      } else {
        setToast({
          open: true,
          title: "Periode Ini Lunas!",
          message: `Seluruh order pada periode ${cycleLabel} berhasil ditandai LUNAS.`,
          variant: "success",
        });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition disabled:opacity-50 cursor-pointer shadow-2xs"
        title="Tandai seluruh order pada periode ini menjadi Lunas"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCheck className="h-3 w-3" />
        )}
        <span>Lunasi Periode Ini</span>
      </button>

      {/* Modal Konfirmasi Pelunasan Siklus */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSettleConfirm}
        title="Konfirmasi Pelunasan Periode"
        message={
          <div className="space-y-3">
            <p>
              Apakah Anda yakin ingin menyatakan seluruh order pada periode{" "}
              <b>{cycleLabel}</b> sudah dibayar lunas oleh <b>Pihak Yogya</b>?
            </p>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-slate-700">
              <div className="flex justify-between font-medium">
                <span>Total Sisa Tagihan Siklus Ini:</span>
                <span className="font-bold text-emerald-800 text-sm">
                  Rp {unpaidAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Semua order dalam rentang tanggal {startDate} s/d {endDate} yang belum lunas akan otomatis dicatat pembayarannya.
            </p>
          </div>
        }
        variant="success"
        confirmText="Ya, Tandai Semua Lunas"
        cancelText="Batal"
        isPending={isPending}
      />

      {/* Toast Feedback Modal */}
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
