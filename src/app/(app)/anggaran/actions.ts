"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

const budgetSchema = z.object({
  name: z.string().trim().min(1, "Nama anggaran wajib diisi").max(100),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai harus YYYY-MM-DD"),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal akhir harus YYYY-MM-DD"),
  amount: z.coerce.number().int().min(0, "Nominal tidak boleh negatif").max(1e13),
}).refine((d) => d.period_end >= d.period_start, { message: "Tanggal akhir harus sama atau setelah tanggal mulai" });

export async function saveBudget(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = id
    ? await supabase.from("budgets").update(parsed.data).eq("id", id)
    : await supabase.from("budgets").insert(parsed.data);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/anggaran");
  revalidatePath("/dashboard");
  return { ok: id ? "Tersimpan" : "Anggaran ditambahkan" };
}

export async function deleteBudget(id: string, _prev: FormState): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/anggaran");
  revalidatePath("/dashboard");
  return { ok: "Dihapus" };
}
