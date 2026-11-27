"use server";

import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { customerSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function saveCustomer(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = id
    ? await supabase.from("customers").update(parsed.data).eq("id", id)
    : await supabase.from("customers").insert(parsed.data);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/pelanggan");
  return { ok: id ? "Tersimpan" : "Pelanggan ditambahkan" };
}

export async function deleteCustomer(id: string, _prev: FormState): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/pelanggan");
  return { ok: "Dihapus" };
}
