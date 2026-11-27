"use client";

import { useEffect } from "react";
import { X, AlertTriangle, Trash2, CheckCircle2, Info, Loader2 } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success" | "primary";
  isPending?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  variant = "primary",
  isPending = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: "bg-rose-100 text-rose-600",
      buttonBg: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-100 text-amber-600",
      buttonBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
    },
    success: {
      icon: CheckCircle2,
      iconBg: "bg-emerald-100 text-emerald-600",
      buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
    },
    primary: {
      icon: Info,
      iconBg: "bg-blue-100 text-blue-600",
      buttonBg: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
    },
  }[variant];

  const Icon = variantStyles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={!isPending ? onClose : undefined}
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl transition-all">
        {/* Header with Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${variantStyles.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Message */}
        <div className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="btn text-xs font-semibold px-4 py-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer ${variantStyles.buttonBg}`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastModal({
  isOpen,
  onClose,
  title,
  message,
  variant = "success",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: "success" | "error";
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-2xl">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${variant === "success" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
          {variant === "success" ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-600">{message}</p>
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
