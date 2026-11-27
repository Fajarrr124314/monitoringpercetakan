"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setActivePartnerCookie, clearActivePartnerCookie } from "@/lib/partners";

export async function loginPartnerAction(partnerId: string, inputPin: string) {
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", partnerId)
    .single();

  if (error || !customer) {
    return { error: "Kerjasama tidak ditemukan." };
  }

  const expectedPin = customer.phone?.trim() ? customer.phone.trim() : "1234";

  if (inputPin.trim() !== expectedPin) {
    return { error: "PIN yang dimasukkan salah. Silakan coba lagi." };
  }

  // PIN Benar -> simpan cookie mitra aktif
  await setActivePartnerCookie(partnerId);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePinAction(partnerId: string, oldPin: string, newPin: string) {
  if (!newPin || newPin.trim().length < 4) {
    return { error: "PIN baru harus minimal 4 karakter/angka." };
  }

  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", partnerId)
    .single();

  if (error || !customer) {
    return { error: "Kerjasama tidak ditemukan." };
  }

  const currentPin = customer.phone?.trim() ? customer.phone.trim() : "1234";

  if (oldPin.trim() !== currentPin) {
    return { error: "PIN lama yang Anda masukkan salah." };
  }

  // Update PIN baru ke kolom phone
  const { error: updateErr } = await supabase
    .from("customers")
    .update({ phone: newPin.trim() })
    .eq("id", partnerId);

  if (updateErr) {
    return { error: "Gagal memperbarui PIN: " + updateErr.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "PIN berhasil diperbarui!" };
}

export async function createPartnerAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "Karawang").trim();
  const address = String(formData.get("address") || "").trim();
  const pin = String(formData.get("pin") || "1234").trim();

  if (!name) {
    return { error: "Nama kerjasama / mitra wajib diisi." };
  }

  if (pin.length < 4) {
    return { error: "PIN akses harus minimal 4 digit." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: name.toUpperCase(),
      city,
      address,
      phone: pin,
      province: "Jawa Barat",
    })
    .select()
    .single();

  if (error) {
    return { error: "Gagal menambah kerjasama: " + error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, partnerId: data.id };
}

export async function switchPartnerAction() {
  await clearActivePartnerCookie();
  redirect("/");
}
