import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { NotaData } from "@/lib/nota-layout";
import type { OrderItem, OrderWithRefs, Settings } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Order + pelanggan + item + pengaturan usaha. */
export async function getOrderFull(supabase: Client, id: string) {
  if (!UUID.test(id)) return null;
  const { data: order } = await supabase
    .from("orders")
    .select("*, customer:customers(name, address, city, province, phone)")
    .eq("id", id)
    .maybeSingle<OrderWithRefs>();
  if (!order) return null;
  const [{ data: items }, { data: settings }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id).order("position"),
    supabase.from("settings").select("*").eq("id", 1).single<Settings>(),
  ]);
  return { order, items: (items ?? []) as OrderItem[], settings: settings as Settings };
}

export function toNotaData(full: NonNullable<Awaited<ReturnType<typeof getOrderFull>>>, printedAt = new Date()): NotaData {
  const { order, items, settings } = full;
  return {
    settings,
    order,
    customer: order.customer,
    creatorName: order.creator_name || "Designer",
    items,
    printedAt,
  };
}
