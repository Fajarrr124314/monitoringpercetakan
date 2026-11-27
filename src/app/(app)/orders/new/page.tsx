import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { toLocalInput } from "@/lib/format";
import type { BudgetUsage, Customer, Product, Settings } from "@/lib/types";
import { OrderForm } from "@/components/order-form";
import { saveOrderAction } from "../actions";

export const metadata: Metadata = { title: "Order Baru" };

export default async function NewOrderPage() {
  const supabase = await createClient();
  const [{ data: customers }, { data: products }, { data: budgets }, { data: settings }] = await Promise.all([
    supabase.from("customers").select("id, name, city").order("name"),
    supabase.from("products").select("*").order("name"),
    supabase.rpc("budget_usage"),
    supabase.from("settings").select("default_tax_percent").eq("id", 1).single<Pick<Settings, "default_tax_percent">>(),
  ]);

  const initial = {
    status: "draft" as const, customer_id: "", title: "", creator_name: "Designer",
    order_date: toLocalInput(new Date()), due_at: "", notes: "", discount: 0,
    tax_percent: Number(settings?.default_tax_percent ?? 0),
    other_cost: 0, items: [], countedTotal: 0,
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
        budgets={(budgets ?? []) as BudgetUsage[]}
        taxDefault={Number(settings?.default_tax_percent ?? 0)}
      />
    </div>
  );
}
