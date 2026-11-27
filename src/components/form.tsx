"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { FormState } from "@/lib/types";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const PendingContext = createContext(false);

/**
 * Form untuk server action dengan pesan error/sukses.
 * Tidak mereset isian saat gagal (berbeda dengan <form action> bawaan React).
 */
export function ActionForm({
  action, children, className, confirm, resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext value={pending}>{children}</PendingContext>
      <FormMessage state={state} />
    </form>
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
