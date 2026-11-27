"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

const settingsSchema = z.object({
  business_name: z.string().trim().min(1, "Nama usaha wajib diisi").max(150),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(50).default(""),
  email: z.string().trim().max(100).default(""),
  tagline: z.string().trim().max(150).default(""),
  footer_note: z.string().trim().max(300).default(""),
  thanks_note: z.string().trim().max(300).default(""),
  default_tax_percent: z.coerce.number().min(0).max(100),
});

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.from("settings").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/pengaturan");
  revalidatePath("/orders");
  return { ok: "Pengaturan nota berhasil disimpan" };
}
