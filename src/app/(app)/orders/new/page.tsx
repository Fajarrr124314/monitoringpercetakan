import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { toLocalInput } from "@/lib/format";
import type { Customer, Product, Settings } from "@/lib/types";
import { OrderForm } from "@/components/order-form";
import { saveOrderAction } from "../actions";
import { getActivePartner } from "@/lib/partners";

export const metadata: Metadata = { title: "Order Baru" };

export default async function NewOrderPage() {
  const supabase = await createClient();
  const activePartner = await getActivePartner();

  const [{ data: customers }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from("customers").select("id, name, city").order("name"),
    supabase.from("products").select("*").order("name"),
    supabase.from("settings").select("default_tax_percent").eq("id", 1).single<Pick<Settings, "default_tax_percent">>(),
  ]);

  const initial = {
    status: "draft" as const,
    customer_id: activePartner?.id ?? (customers?.[0]?.id ?? ""),
    title: "",
    creator_name: "Designer",
    order_date: toLocalInput(new Date()),
    due_at: "",
    notes: "",
    discount: 0,
    tax_percent: Number(settings?.default_tax_percent ?? 0),
    other_cost: 0,
    items: [],
    countedTotal: 0,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Buat Order Baru</h1>
        <p className="text-sm text-slate-500">
          Biaya dihitung otomatis saat memilih bahan &amp; ukuran. Klik <b>Kirim &amp; Terbitkan Nota</b> agar nota langsung terbit.
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
