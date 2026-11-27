"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/types";
import { ConfirmModal } from "@/components/ui/modal";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const PendingContext = createContext(false);

/**
 * Form untuk server action dengan pesan error/sukses.
 * Tidak mereset isian saat gagal (berbeda dengan <form action> bawaan React).
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingSubmitRef = useRef<FormData | null>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  const handleConfirmSubmit = () => {
    setConfirmOpen(false);
    if (pendingSubmitRef.current) {
      const fd = pendingSubmitRef.current;
      pendingSubmitRef.current = null;
      startTransition(() => formAction(fd));
    }
  };

  return (
    <>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          if (confirm) {
            pendingSubmitRef.current = fd;
            setConfirmOpen(true);
            return;
          }
          startTransition(() => formAction(fd));
        }}
      >
        <PendingContext value={pending}>{children}</PendingContext>
        <FormMessage state={state} />
      </form>

      {confirm && (
        <ConfirmModal
          isOpen={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            pendingSubmitRef.current = null;
          }}
          onConfirm={handleConfirmSubmit}
          title="Konfirmasi Tindakan"
          message={confirm}
          variant={confirm.toLowerCase().includes("hapus") ? "danger" : "primary"}
          confirmText="Ya, Lanjutkan"
          cancelText="Batal"
          isPending={pending}
        />
      )}
    </>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role="status"
      className={`mt-2 rounded-md px-3 py-2 text-sm ${state.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {state.error ?? state.ok}
    </p>
  );
}

export function SubmitButton({
  children, className = "btn btn-primary", name, value, disabled,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" name={name} value={value} className={className} disabled={pending || disabled}>
      {pending ? "Memproses..." : children}
    </button>
  );
}
