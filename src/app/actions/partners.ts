"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setActivePartnerCookie, clearActivePartnerCookie, isPinEnabled } from "@/lib/partners";

export async function loginPartnerAction(partnerId: string, inputPin?: string) {
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", partnerId)
    .single();

  if (error || !customer) {
    return { error: "Kerjasama tidak ditemukan." };
  }

  // Cek apakah mitra ini menggunakan PIN atau bebas akses
  const pinRequired = isPinEnabled(customer.phone);

  if (pinRequired) {
    const expectedPin = customer.phone.trim();
    if (!inputPin || inputPin.trim() !== expectedPin) {
      return { error: "PIN yang dimasukkan salah. Silakan coba lagi." };
    }
  }

  // Masuk berhasil -> simpan cookie mitra aktif
  await setActivePartnerCookie(partnerId);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePartnerPinSettingsAction(
  partnerId: string,
  params: {
    enablePin: boolean;
    oldPin?: string;
    newPin?: string;
  }
) {
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", partnerId)
    .single();

  if (error || !customer) {
    return { error: "Kerjasama tidak ditemukan." };
  }

  const currentHasPin = isPinEnabled(customer.phone);
  const currentPin = customer.phone?.trim() || "";

  // 1. Jika pengguna menonaktifkan PIN (Bebas Akses)
  if (!params.enablePin) {
    if (currentHasPin && params.oldPin) {
      if (params.oldPin.trim() !== currentPin) {
        return { error: "PIN saat ini tidak cocok." };
      }
    }
    const { error: updErr } = await supabase
      .from("customers")
      .update({ phone: "NOPIN" })
      .eq("id", partnerId);

    if (updErr) return { error: "Gagal menonaktifkan PIN: " + updErr.message };

    revalidatePath("/", "layout");
    return { ok: true, message: "PIN berhasil dinonaktifkan! Kerjasama ini kini bebas akses tanpa PIN." };
  }

  // 2. Jika pengguna mengaktifkan atau mengganti PIN
  const newPin = params.newPin?.trim() || "";
  if (newPin.length < 4) {
    return { error: "PIN baru harus minimal 4 karakter/angka." };
  }

  // Jika sebelumnya sudah punya PIN, verifikasi PIN lama
  if (currentHasPin && currentPin) {
    if (!params.oldPin || params.oldPin.trim() !== currentPin) {
      return { error: "PIN lama yang Anda masukkan salah." };
    }
  }

  const { error: updateErr } = await supabase
    .from("customers")
    .update({ phone: newPin })
    .eq("id", partnerId);

  if (updateErr) {
    return { error: "Gagal memperbarui PIN: " + updateErr.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "PIN keamanan berhasil diaktifkan & diperbarui!" };
}

export async function createPartnerAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "Karawang").trim();
  const address = String(formData.get("address") || "").trim();
  const enablePin = formData.get("enablePin") === "true";
  const pin = String(formData.get("pin") || "1234").trim();

  if (!name) {
    return { error: "Nama kerjasama / mitra wajib diisi." };
  }

  let finalPhone = "NOPIN";
  if (enablePin) {
    if (pin.length < 4) {
      return { error: "PIN akses harus minimal 4 digit." };
    }
    finalPhone = pin;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: name.toUpperCase(),
      city,
      address,
      phone: finalPhone,
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
