"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { friendlyError } from "@/lib/auth";
import { fromLocalInput } from "@/lib/format";
import { customerSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import type { FormState, OrderStatus } from "@/lib/types";

const itemSchema = z.object({
  product_id: z.uuid("Bahan wajib dipilih"),
  description: z.string().trim().max(150).default(""),
  notes: z.string().trim().max(200).default(""),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1").max(1e7),
  width_cm: z.coerce.number().int().min(1).max(1e6),
  height_cm: z.coerce.number().int().min(1).max(1e6),
  unit_price: z.coerce.number().int().min(0).max(1e12).nullable().optional(),
  design_fee: z.coerce.number().int().min(0).max(1e12).default(0),
  other_fee: z.coerce.number().int().min(0).max(1e12).default(0),
});

const payloadSchema = z.object({
  id: z.uuid().optional(),
  customer_id: z.string().min(1, "Pelanggan wajib dipilih"),
  title: z.string().trim().max(150).default(""),
  creator_name: z.string().trim().max(100).default("Designer"),
  order_date: z.string().min(1),
  due_at: z.string().optional(),
  notes: z.string().trim().max(500).default(""),
  discount: z.coerce.number().int().min(0).max(1e12).optional(),
  tax_percent: z.coerce.number().min(0).max(100).optional(),
  other_cost: z.coerce.number().int().min(0).max(1e12).optional(),
  items: z.array(itemSchema).min(1, "Minimal 1 item"),
});

export async function saveOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") return { error: "Data formulir tidak valid" };

  let json: unknown;
  try { json = JSON.parse(rawPayload); } catch { return { error: "Format formulir rusak" }; }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let customerId = parsed.data.customer_id;
  if (customerId === "new") {
    const cParsed = customerSchema.safeParse({
      name: formData.get("nc_name"), address: formData.get("nc_address") ?? "",
      city: formData.get("nc_city") ?? "", province: formData.get("nc_province") ?? "", phone: "",
    });
    if (!cParsed.success) return { error: cParsed.error.issues[0].message };
    const { data: cData, error: cErr } = await supabase.from("customers").insert(cParsed.data).select("id").single();
    if (cErr || !cData) return { error: friendlyError(cErr, "Gagal menambahkan pelanggan baru") };
    customerId = cData.id;
  }

  const intent = formData.get("intent");
  const submit = intent === "submit";
  const orderDateIso = fromLocalInput(parsed.data.order_date) ?? new Date().toISOString();
  const dueAtIso = parsed.data.due_at ? fromLocalInput(parsed.data.due_at) : null;
  const title = String(formData.get("title") ?? parsed.data.title).trim();
  const creatorName = String(formData.get("creator_name") ?? parsed.data.creator_name).trim() || "Designer";
  const notes = String(formData.get("notes") ?? parsed.data.notes).trim();

  const rpcPayload = {
    id: parsed.data.id ?? null, customer_id: customerId, title,
    creator_name: creatorName,
    order_date: orderDateIso, due_at: dueAtIso, notes,
    discount: parsed.data.discount ?? null, tax_percent: parsed.data.tax_percent ?? null,
    other_cost: parsed.data.other_cost ?? null, submit,
    items: parsed.data.items.map((it) => ({
      product_id: it.product_id, description: it.description, notes: it.notes,
      qty: it.qty, width_cm: it.width_cm, height_cm: it.height_cm,
      unit_price: it.unit_price ?? null,
      design_fee: it.design_fee, other_fee: it.other_fee,
    })),
  };

  const { data: savedId, error } = await supabase.rpc("save_order", { p: rpcPayload });
  if (error || !savedId) return { error: friendlyError(error, "Gagal menyimpan order") };

  revalidatePath("/orders");
  revalidatePath(`/orders/${savedId}`);
  redirect(`/orders/${savedId}`);
}

export async function setStatusAction(id: string, toStatus: OrderStatus, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const note = String(formData.get("note") ?? "").trim();
  const actor = String(formData.get("actor") ?? "Percetakan").trim();
  const { error } = await supabase.rpc("set_order_status", { p_order_id: id, p_status: toStatus, p_note: note, p_actor: actor });
  if (error) return { error: friendlyError(error) };
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  return { ok: "Status diperbarui" };
}

const paymentSchema = z.object({
  down_payment: z.coerce.number().int().min(0, "Nominal tidak boleh negatif").max(1e12),
  cash: z.coerce.number().int().min(0, "Nominal tidak boleh negatif").max(1e12),
  noncash: z.coerce.number().int().min(0, "Nominal tidak boleh negatif").max(1e12),
  payment_ref: z.string().trim().max(100).default(""),
  note: z.string().trim().max(200).default(""),
  actor: z.string().trim().max(100).default("Kasir"),
});

export async function recordPaymentAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.rpc("record_payment", {
    p_order_id: id, p_down_payment: parsed.data.down_payment, p_cash: parsed.data.cash,
    p_noncash: parsed.data.noncash, p_ref: parsed.data.payment_ref, p_note: parsed.data.note,
    p_actor: parsed.data.actor,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  return { ok: "Pembayaran dicatat" };
}

export async function addCommentAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const note = String(formData.get("note") ?? "").trim();
  const actor = String(formData.get("actor") ?? "").trim();
  if (!note) return { error: "Komentar tidak boleh kosong" };
  const { error } = await supabase.rpc("add_comment", { p_order_id: id, p_note: note, p_actor: actor });
  if (error) return { error: friendlyError(error) };
  revalidatePath(`/orders/${id}`);
  return { ok: "Komentar ditambahkan" };
}

export async function uploadFileAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const file = formData.get("file");
  const uploader = String(formData.get("uploader") ?? "User").trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file terlebih dahulu" };
  if (file.size > 50 * 1024 * 1024) return { error: "Ukuran file maksimal 50 MB" };

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${id}/${Date.now()}-${safe}`;
  const { error: upErr } = await supabase.storage.from("order-files").upload(path, file);
  if (upErr) return { error: friendlyError(upErr, "Gagal mengunggah file") };

  const { error: dbErr } = await supabase.from("order_files").insert({
    order_id: id, path, file_name: file.name, size_bytes: file.size, uploaded_by: uploader,
  });
  if (dbErr) return { error: friendlyError(dbErr) };
  revalidatePath(`/orders/${id}`);
  return { ok: "File diunggah" };
}

export async function deleteFileAction(id: string, fileId: string, path: string): Promise<FormState> {
  const supabase = await createClient();
  await supabase.storage.from("order-files").remove([path]);
  const { error } = await supabase.from("order_files").delete().eq("id", fileId);
  if (error) return { error: friendlyError(error) };
  revalidatePath(`/orders/${id}`);
  return { ok: "File dihapus" };
}

/**
 * Hapus order secara permanen (otomatis cascade ke item, file, dan log)
 */
export async function deleteOrderAction(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return { error: friendlyError(error, "Gagal menghapus order") };

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: "Order berhasil dihapus" };
}

/**
 * Pelunasan Cepat 1-Klik untuk Pihak Yogya / Kasir
 */
export async function quickSettleOrderAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();

  // Ambil data order saat ini
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("total, down_payment, cash_paid, noncash_paid, status")
    .eq("id", id)
    .single();

  if (fetchErr || !order) return { error: "Order tidak ditemukan" };

  const actor = String(formData.get("actor") ?? "Pihak Yogya").trim();
  const ref = String(formData.get("payment_ref") ?? "Transfer Pelunasan Yogya").trim();
  const method = String(formData.get("method") ?? "noncash"); // noncash atau cash

  const total = Number(order.total) || 0;
  const currentPaid = (Number(order.down_payment) || 0) + (Number(order.cash_paid) || 0) + (Number(order.noncash_paid) || 0);
  const remaining = Math.max(0, total - currentPaid);

  let newCash = Number(order.cash_paid) || 0;
  let newNoncash = Number(order.noncash_paid) || 0;

  if (method === "cash") {
    newCash += remaining;
  } else {
    newNoncash += remaining;
  }

  const { error } = await supabase.rpc("record_payment", {
    p_order_id: id,
    p_down_payment: Number(order.down_payment) || 0,
    p_cash: newCash,
    p_noncash: newNoncash,
    p_ref: ref,
    p_note: `Dinyatakan LUNAS oleh ${actor} (Sisa ${remaining.toLocaleString("id-ID")})`,
    p_actor: actor,
  });

  if (error) return { error: friendlyError(error, "Gagal mencatat pelunasan") };

  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: "Status berhasil ditandai LUNAS!" };
}

/**
 * Pelunasan Kolektif untuk Seluruh Order dalam Siklus 15 Hari
 */
export async function settleCycleOrdersAction(startDate: string, endDate: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const actor = String(formData.get("actor") ?? "Pihak Yogya").trim();
  const ref = String(formData.get("payment_ref") ?? `Transfer Siklus ${startDate} s/d ${endDate}`).trim();

  // Ambil semua order aktif di siklus ini
  const { data: orders, error: fetchErr } = await supabase
    .from("orders")
    .select("id, total, down_payment, cash_paid, noncash_paid")
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .neq("status", "batal");

  if (fetchErr || !orders) return { error: "Gagal mengambil data order siklus" };

  for (const o of orders) {
    const total = Number(o.total) || 0;
    const paid = (Number(o.down_payment) || 0) + (Number(o.cash_paid) || 0) + (Number(o.noncash_paid) || 0);
    const remaining = total - paid;

    if (remaining > 0) {
      const newNoncash = (Number(o.noncash_paid) || 0) + remaining;
      await supabase.rpc("record_payment", {
        p_order_id: o.id,
        p_down_payment: Number(o.down_payment) || 0,
        p_cash: Number(o.cash_paid) || 0,
        p_noncash: newNoncash,
        p_ref: ref,
        p_note: `Pelunasan kolektif siklus 15 hari oleh ${actor}`,
        p_actor: actor,
      });
    }
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: "Seluruh order dalam siklus 15 hari berhasil ditandai LUNAS!" };
}
