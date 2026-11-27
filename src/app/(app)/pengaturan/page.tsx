import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";
import { ActionForm, SubmitButton } from "@/components/form";
import { updateSettings } from "./actions";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  const s = (data ?? {}) as Settings;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Pengaturan Nota &amp; Usaha</h1>
        <p className="text-sm text-slate-500">
          Data ini ditampilkan pada kop dan catatan kaki nota (web maupun hasil cetak/PDF).
        </p>
      </div>

      <div className="card">
        <ActionForm action={updateSettings} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">Nama usaha (kop kiri atas)</label>
              <input name="business_name" defaultValue={s.business_name} required className="input" />
            </div>
            <div>
              <label className="label">Tagline (di bawah logo)</label>
              <input name="tagline" defaultValue={s.tagline} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Alamat usaha</label>
              <input name="address" defaultValue={s.address} className="input" />
            </div>
            <div>
              <label className="label">Telepon</label>
              <input name="phone" defaultValue={s.phone} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" defaultValue={s.email} className="input" />
            </div>
            <div>
              <label className="label">PPN bawaan (%)</label>
              <input type="number" min={0} max={100} step={0.01} name="default_tax_percent" defaultValue={s.default_tax_percent} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Catatan bawah (di atas rekening)</label>
            <textarea name="footer_note" defaultValue={s.footer_note} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Catatan terima kasih &amp; info rekening bank</label>
            <textarea name="thanks_note" defaultValue={s.thanks_note} rows={2} className="input" />
          </div>

          <SubmitButton>Simpan Pengaturan</SubmitButton>
        </ActionForm>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold">Mengganti Logo Nota</h2>
        <p className="text-xs text-slate-600">
          Untuk mengganti logo nota di server/lokal, jalankan perintah berikut dari terminal:
        </p>
        <pre className="mt-2 rounded bg-slate-900 p-2 font-mono text-xs text-slate-100">
          npm run logo -- path/ke/logo-baru.jpg
        </pre>
        <p className="mt-2 text-xs text-slate-400">
          Format: JPEG atau PNG. Logo akan otomatis di-bundle dalam bentuk base64 agar PDF &amp; cetak selalu tampil tanpa perlu koneksi internet.
        </p>
      </div>
    </div>
  );
}
