import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditOrder } from "@/lib/constants";
import { meters, toLocalInput } from "@/lib/format";
import { getOrderFull } from "@/lib/orders";
import type { Customer, Product, Settings } from "@/lib/types";
import { OrderForm, type ItemRow } from "@/components/order-form";
import { saveOrderAction } from "../../actions";

export const metadata: Metadata = { title: "Ubah Order" };

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const full = await getOrderFull(supabase, id);
  if (!full) notFound();

  const { order, items } = full;
  if (!canEditOrder(order.status)) redirect(`/orders/${id}`);

  const [{ data: customers }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from("customers").select("id, name, city").order("name"),
    supabase.from("products").select("*").order("name"),
    supabase.from("settings").select("default_tax_percent").eq("id", 1).single<Pick<Settings, "default_tax_percent">>(),
  ]);

  const rows: ItemRow[] = items.map((it) => ({
    key: it.id, product_id: it.product_id, description: it.description, notes: it.notes,
    qty: String(it.qty), width_m: meters(it.width_cm), height_m: meters(it.height_cm),
    unit_price: it.unit_price !== it.list_price ? String(it.unit_price) : "",
    design_fee: String(it.design_fee), other_fee: String(it.other_fee),
  }));

  const initial = {
    id: order.id, status: order.status as "draft" | "masuk", customer_id: order.customer_id,
    title: order.title, creator_name: order.creator_name || "Designer",
    order_date: toLocalInput(order.order_date),
    due_at: order.due_at ? toLocalInput(order.due_at) : "", notes: order.notes,
    discount: order.discount, tax_percent: Number(order.tax_percent), other_cost: order.other_cost,
    items: rows, countedTotal: (order.status as string) === "draft" || (order.status as string) === "batal" ? 0 : order.total,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Ubah Order {order.order_no ?? "(Draft)"}</h1>
        <p className="text-sm text-slate-500">
          Perubahan pada order berstatus Masuk akan langsung memperbarui nota dengan nomor yang sama.
        </p>
      </div>
      <OrderForm
        action={saveOrderAction}
        initial={initial}
        customers={(customers ?? []) as Customer[]}
        products={(products ?? []) as Product[]}
        taxDefault={Number(settings?.default_tax_percent ?? 0)}
      />
    </div>
  );
}
