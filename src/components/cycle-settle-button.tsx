"use client";

import { useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { settleCycleOrdersAction } from "@/app/(app)/orders/actions";

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

  const handleSettle = () => {
    if (
      !confirm(
        `Konfirmasi pelunasan seluruh order pada ${cycleLabel} (Total Sisa: Rp ${unpaidAmount.toLocaleString("id-ID")})?\n\nSemua order pada periode ini akan ditandai LUNAS oleh Pihak Yogya.`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.append("actor", "Pihak Yogya");
    formData.append("payment_ref", `Pelunasan Periode ${cycleLabel}`);

    startTransition(async () => {
      const res = await settleCycleOrdersAction(startDate, endDate, undefined, formData);
      if (res?.error) {
        alert(res.error);
      } else {
        alert(`Sukses! Seluruh order pada ${cycleLabel} telah ditandai LUNAS.`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleSettle}
      disabled={isPending}
      className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition disabled:opacity-50"
      title="Tandai seluruh order pada 15 hari ini menjadi Lunas"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <CheckCheck className="h-3 w-3" />
      )}
      <span>Lunasi Siklus Ini</span>
    </button>
  );
}
