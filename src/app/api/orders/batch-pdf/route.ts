import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { buildNota, type NotaPage } from "@/lib/nota-layout";
import { NotaPdf } from "@/lib/nota-pdf";
import type { OrderItem, OrderWithRefs, Settings } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const orientationParam = searchParams.get("orientation") || searchParams.get("format");
  const orientation: "landscape" | "portrait" = orientationParam === "portrait" ? "portrait" : "landscape";

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*, customer:customers(name, address, city, province, phone)")
    .neq("status", "batal")
    .neq("status", "draft")
    .order("order_date", { ascending: true });

  if (start) query = query.gte("order_date", start);
  if (end) query = query.lte("order_date", end);
  if (status && status !== "semua") query = query.eq("status", status);
  if (q?.trim()) {
    const clean = q.trim().replace(/[%_,()]/g, "");
    query = query.or(`order_no.ilike.%${clean}%,title.ilike.%${clean}%,creator_name.ilike.%${clean}%`);
  }

  const { data: ordersData } = await query;
  const orders = (ordersData ?? []) as OrderWithRefs[];

  if (orders.length === 0) {
    return new Response("Tidak ada faktur nota yang ditemukan pada filter ini", { status: 404 });
  }

  const orderIds = orders.map((o) => o.id);
  const [{ data: itemsData }, { data: settingsData }] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", orderIds).order("position", { ascending: true }),
    supabase.from("settings").select("*").eq("id", 1).single<Settings>(),
  ]);

  const items = (itemsData ?? []) as OrderItem[];
  const settings = (settingsData ?? {
    business_name: "Percetakan Sakinah",
    address: "Jl. Arif Rahman Hakim Niaga, Nagasari Karawang Barat, Karawang",
    phone: "0895626621300",
    email: "percetakansakinah@gmail.com",
    tagline: "Smart Shoping for Smart Buyer",
    footer_note: "Barang yang sudah dibeli tidak dapat dikembalikan tanpa ada perjanjian sebelumnya",
    thanks_note: "Terima Kasih Banyak Atas Kepercayaannya, Bca.1091937731 a/n.saeful anwar",
    default_tax_percent: 0,
  }) as Settings;

  const itemsByOrderId = new Map<string, OrderItem[]>();
  for (const it of items) {
    const list = itemsByOrderId.get(it.order_id) ?? [];
    list.push(it);
    itemsByOrderId.set(it.order_id, list);
  }

  // Gabungkan seluruh lembar nota continuous form
  const allPages: NotaPage[] = [];
  const now = new Date();

  for (const o of orders) {
    const pages = buildNota({
      settings,
      order: o,
      customer: o.customer,
      creatorName: o.creator_name || "Designer",
      items: itemsByOrderId.get(o.id) ?? [],
      printedAt: now,
    });
    allPages.push(...pages);
  }

  const filename = `Semua-Nota-Faktur-${start ?? "all"}_sd_${end ?? "all"}-${orientation}.pdf`;
  const buf = await renderToBuffer(NotaPdf({ pages: allPages, title: filename, orientation }));

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
