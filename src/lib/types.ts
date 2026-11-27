export type OrderStatus = "draft" | "masuk" | "produksi" | "finishing" | "selesai" | "batal";
export type PricingUnit = "m2" | "pcs";

export type Customer = {
  id: string; name: string; address: string; city: string; province: string; phone: string; created_at: string;
};

export type Product = {
  id: string; code: string; name: string; pricing_unit: PricingUnit; unit_label: string;
  price: number; is_active: boolean; created_at: string;
};

export type Budget = { id: string; name: string; period_start: string; period_end: string; amount: number };
export type BudgetUsage = Budget & { used: number; order_count: number };

export type Settings = {
  business_name: string; address: string; phone: string; email: string; tagline: string;
  footer_note: string; thanks_note: string; default_tax_percent: number;
};

export type Order = {
  id: string; order_no: string | null; status: OrderStatus; customer_id: string; title: string;
  order_date: string; due_at: string | null; notes: string; creator_name: string;
  subtotal: number; discount: number; tax_percent: number; tax: number; other_cost: number; total: number;
  down_payment: number; cash_paid: number; noncash_paid: number; payment_ref: string;
  issued_at: string | null; created_at: string; updated_at: string;
};

export type OrderItem = {
  id: string; order_id: string; position: number; product_id: string; product_code: string; product_name: string;
  pricing_unit: PricingUnit; unit_label: string; description: string; notes: string; qty: number;
  width_cm: number; height_cm: number; list_price: number; unit_price: number;
  design_fee: number; other_fee: number; subtotal: number;
};

export type OrderLog = {
  id: number; order_id: string; action: "dibuat" | "diubah" | "status" | "pembayaran" | "komentar";
  from_status: OrderStatus | null; to_status: OrderStatus | null; note: string; actor_name: string; created_at: string;
};

export type OrderFile = {
  id: string; order_id: string; path: string; file_name: string; size_bytes: number; uploaded_by: string; created_at: string;
};

export type OrderWithRefs = Order & {
  customer: Pick<Customer, "name" | "address" | "city" | "province" | "phone"> | null;
};

/** State standar untuk form dengan useActionState */
export type FormState = { error?: string; ok?: string } | undefined;
