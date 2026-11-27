"use client";

import { Printer } from "lucide-react";

export function PrintButton({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className ?? "btn btn-primary"}
    >
      {children ?? (
        <>
          <Printer className="h-4 w-4" />
          <span>Cetak / Print</span>
        </>
      )}
    </button>
  );
}
