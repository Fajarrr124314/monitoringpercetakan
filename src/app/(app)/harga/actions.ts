"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

const productSchema = z.object({
  code: z.string().trim().min(1, "Kode wajib diisi").max(50),
  name: z.string().trim().min(1, "Nama bahan wajib diisi").max(120),
  pricing_unit: z.enum(["m2", "pcs"]),
  unit_label: z.string().trim().min(1).max(20).transform((s) => s.toUpperCase()),
  price: z.coerce.number().int("Harga harus bilangan bulat").min(0, "Harga tidak boleh negatif").max(1e12),
  is_active: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export async function saveProduct(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const parsed = productSchema.safeParse({ ...Object.fromEntries(formData), is_active: formData.get("is_active") ?? (id ? "false" : "true") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = id
    ? await supabase.from("products").update(parsed.data).eq("id", id)
    : await supabase.from("products").insert(parsed.data);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/harga");
  return { ok: id ? "Tersimpan" : "Bahan ditambahkan" };
}

export async function deleteProduct(id: string, _prev: FormState): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: friendlyError(error) + ". Nonaktifkan saja jika sudah pernah dipakai." };
  revalidatePath("/harga");
  return { ok: "Dihapus" };
}
