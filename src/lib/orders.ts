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

/**
 * Mengambil seluruh order beserta rincian item untuk periode tertentu (misal 15 hari).
 */
export async function getPeriodOrdersFull(supabase: Client, startDate: string, endDate: string) {
  const { data: ordersData } = await supabase
    .from("orders")
    .select("*, customer:customers(name, address, city, province, phone)")
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .neq("status", "batal")
    .neq("status", "draft")
    .order("order_date", { ascending: true });

  const orders = (ordersData ?? []) as OrderWithRefs[];
  const orderIds = orders.map((o) => o.id);

  let allItems: OrderItem[] = [];
  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .order("position", { ascending: true });
    allItems = (itemsData ?? []) as OrderItem[];
  }

  const { data: settings } = await supabase.from("settings").select("*").eq("id", 1).single<Settings>();

  const itemsByOrderId = new Map<string, OrderItem[]>();
  for (const it of allItems) {
    const list = itemsByOrderId.get(it.order_id) ?? [];
    list.push(it);
    itemsByOrderId.set(it.order_id, list);
  }

  const ordersWithItems = orders.map((o) => ({
    ...o,
    items: itemsByOrderId.get(o.id) ?? [],
  }));

  return {
    orders: ordersWithItems,
    settings: (settings ?? {
      business_name: "Percetakan Sakinah",
      address: "Jl. Arif Rahman Hakim Niaga, Nagasari Karawang Barat, Karawang",
      phone: "0895626621300",
      email: "percetakansakinah@gmail.com",
      tagline: "Smart Shoping for Smart Buyer",
      footer_note: "Barang yang sudah dibeli tidak dapat dikembalikan tanpa ada perjanjian sebelumnya",
      thanks_note: "Terima Kasih Banyak Atas Kepercayaannya, Bca.1091937731 a/n.saeful anwar",
      default_tax_percent: 0,
    }) as Settings,
  };
}
