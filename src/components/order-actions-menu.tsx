"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Pencil, Trash2, CheckCircle, X, CreditCard, Loader2 } from "lucide-react";
import { deleteOrderAction, quickSettleOrderAction } from "@/app/(app)/orders/actions";

interface OrderActionsMenuProps {
  orderId: string;
  orderNo: string | null;
  total: number;
  due: number;
  customerName?: string;
}

export function OrderActionsMenu({
  orderId,
  orderNo,
  total,
  due,
  customerName,
}: OrderActionsMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [method, setMethod] = useState<"noncash" | "cash">("noncash");
  const [ref, setRef] = useState("Transfer Bank Yogya");
  const [actor, setActor] = useState("Pihak Yogya");
  const [modalError, setModalError] = useState("");

  const isPaid = total > 0 && due <= 0;

  const handleDelete = () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus order ${orderNo ?? "(draft)"} secara permanen?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteOrderAction(orderId);
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleSettle = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    const formData = new FormData();
    formData.append("actor", actor);
    formData.append("payment_ref", ref);
    formData.append("method", method);

    startTransition(async () => {
      const res = await quickSettleOrderAction(orderId, undefined, formData);
      if (res?.error) {
        setModalError(res.error);
      } else {
        setShowSettleModal(false);
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
        {/* Tombol Lihat Faktur */}
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition shadow-2xs"
          title="Buka / Cetak Faktur Nota"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Faktur</span>
        </Link>

        {/* Tombol Pelunasan Cepat jika belum lunas */}
        {!isPaid ? (
          <button
            type="button"
            onClick={() => setShowSettleModal(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition shadow-2xs"
            title={`Sisa Tagihan Rp ${due.toLocaleString("id-ID")}. Klik untuk tandai lunas.`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tandai</span> Lunas
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100/70 px-2 py-1 text-[11px] font-bold text-emerald-800">
            <CheckCircle className="h-3 w-3" />
            Lunas
          </span>
        )}

        {/* Tombol Edit */}
        <Link
          href={`/orders/${orderId}/edit`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
          title="Ubah Rincian Order"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>

        {/* Tombol Hapus */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition shadow-2xs disabled:opacity-50"
          title="Hapus Order"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Modal / Dialog Konfirmasi Pelunasan Yogya */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Konfirmasi Pelunasan Yogya</h3>
                  <p className="text-xs text-slate-500">Order: {orderNo ?? "(Draft)"} {customerName ? `· ${customerName}` : ""}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSettle} className="mt-4 space-y-4">
              {modalError && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                  {modalError}
                </div>
              )}

              {/* Tagihan Box */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Total Tagihan:</span>
                  <span className="font-semibold text-slate-900">Rp {total.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-800 mt-1">
                  <span>Sisa Pelunasan:</span>
                  <span>Rp {due.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dinyatakan Lunas Oleh (Pihak Pembayar)
                </label>
                <input
                  type="text"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  className="input text-sm"
                  placeholder="Contoh: Pihak Yogya / Finance / Kasir"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("noncash")}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      method === "noncash"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Transfer / Giro (Non-Tunai)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("cash")}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      method === "cash"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Uang Tunai (Cash)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / No. Referensi Transfer
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  className="input text-sm"
                  placeholder="Contoh: Transfer BCA Rekening Yogya / Giro No. 123"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="btn text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Konfirmasi Lunas Sekarang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
