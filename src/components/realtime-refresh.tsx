"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Muat ulang data halaman otomatis saat order / timeline berubah (Supabase Realtime). */
export function RealtimeRefresh({ orderId }: { orderId?: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase
      .channel(`orders-${orderId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", ...(orderId ? { filter: `id=eq.${orderId}` } : {}) }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_logs", ...(orderId ? { filter: `order_id=eq.${orderId}` } : {}) }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  return null;
}
