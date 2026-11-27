import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface Partner {
  id: string;
  name: string;
  city: string;
  province: string;
  address: string;
  pin: string;
  hasPin: boolean;
  orderCount?: number;
  totalUnpaid?: number;
}

const COOKIE_NAME = "active_partner_id";
export const DEFAULT_PIN = "1234";

export function isPinEnabled(pin: string | null | undefined): boolean {
  if (!pin) return false;
  const clean = pin.trim().toUpperCase();
  return clean !== "" && clean !== "NOPIN" && clean !== "OFF" && clean !== "FALSE" && clean !== "NONE";
}

/**
 * Mengambil daftar seluruh mitra kerjasama dari tabel customers
 */
export async function getPartnersList(): Promise<Partner[]> {
  const supabase = await createClient();

  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("*").order("name", { ascending: true }),
    supabase.from("orders").select("customer_id, total, down_payment, cash_paid, noncash_paid, status"),
  ]);

  if (!customers || customers.length === 0) {
    // Jika belum ada customer, buat default Yogya Grand Karawang
    const { data: created } = await supabase
      .from("customers")
      .insert({
        name: "YOGYA KARAWANG",
        city: "Karawang",
        province: "Jawa Barat",
        phone: DEFAULT_PIN,
      })
      .select()
      .single();

    if (created) {
      return [
        {
          id: created.id,
          name: created.name,
          city: created.city || "Karawang",
          province: created.province || "Jawa Barat",
          address: created.address || "",
          pin: created.phone || DEFAULT_PIN,
          hasPin: isPinEnabled(created.phone || DEFAULT_PIN),
          orderCount: 0,
          totalUnpaid: 0,
        },
      ];
    }
    return [];
  }

  // Hitung jumlah order dan sisa tagihan per customer
  const orderStats = new Map<string, { count: number; unpaid: number }>();
  if (orders) {
    for (const o of orders) {
      if (o.status !== "batal") {
        const cur = orderStats.get(o.customer_id) ?? { count: 0, unpaid: 0 };
        cur.count += 1;
        const paid = (Number(o.down_payment) || 0) + (Number(o.cash_paid) || 0) + (Number(o.noncash_paid) || 0);
        const due = Math.max(0, (Number(o.total) || 0) - paid);
        cur.unpaid += due;
        orderStats.set(o.customer_id, cur);
      }
    }
  }

  return customers.map((c) => {
    const stats = orderStats.get(c.id) ?? { count: 0, unpaid: 0 };
    const rawPin = c.phone?.trim() ?? "";
    const activePin = isPinEnabled(rawPin) ? rawPin : "";
    return {
      id: c.id,
      name: c.name,
      city: c.city || "Karawang",
      province: c.province || "Jawa Barat",
      address: c.address || "",
      pin: activePin,
      hasPin: isPinEnabled(rawPin),
      orderCount: stats.count,
      totalUnpaid: stats.unpaid,
    };
  });
}

/**
 * Mendapatkan data mitra aktif dari cookie saat ini
 */
export async function getActivePartner(): Promise<Partner | null> {
  const cookieStore = await cookies();
  const partnerId = cookieStore.get(COOKIE_NAME)?.value;

  if (!partnerId) return null;

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", partnerId)
    .single();

  if (!customer) return null;

  const rawPin = customer.phone?.trim() ?? "";
  return {
    id: customer.id,
    name: customer.name,
    city: customer.city || "Karawang",
    province: customer.province || "Jawa Barat",
    address: customer.address || "",
    pin: isPinEnabled(rawPin) ? rawPin : "",
    hasPin: isPinEnabled(rawPin),
  };
}

/**
 * Mengatur cookie mitra aktif setelah verifikasi PIN berhasil
 */
export async function setActivePartnerCookie(partnerId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, partnerId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    httpOnly: true,
    sameSite: "lax",
  });
}

/**
 * Menghapus cookie mitra aktif untuk beralih kerjasama
 */
export async function clearActivePartnerCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
