import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { ActionForm, SubmitButton } from "@/components/form";
import { deleteProduct, saveProduct } from "./actions";

export const metadata: Metadata = { title: "Daftar Harga" };

function ProductFields({ p }: { p?: Product }) {
  return (
    <>
      <div className="md:col-span-2">
        <label className="label">Kode</label>
        <input name="code" defaultValue={p?.code} required className="input" placeholder="0200200003" />
      </div>
      <div className="md:col-span-3">
        <label className="label">Nama bahan / produk</label>
        <input name="name" defaultValue={p?.name} required className="input" placeholder="FLEXY CHINA" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Hitung per</label>
        <select name="pricing_unit" defaultValue={p?.pricing_unit ?? "m2"} className="input">
          <option value="m2">Meter persegi (m²)</option>
          <option value="pcs">Pcs / lembar</option>
        </select>
      </div>
      <div className="md:col-span-1">
        <label className="label">Satuan</label>
        <input name="unit_label" defaultValue={p?.unit_label ?? "PCS"} required className="input" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Harga (Rp)</label>
        <input name="price" type="number" min={0} step={1} defaultValue={p?.price} required className="input" />
      </div>
    </>
  );
}

export default async function HargaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").order("is_active", { ascending: false }).order("name");
  const products = (data ?? []) as Product[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Daftar Harga</h1>
        <p className="text-sm text-slate-500">
          Bahan per m²: <b>jumlah × lebar × tinggi (m) × harga</b>. Produk per pcs: <b>jumlah × harga</b>.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-medium">Tambah bahan</h2>
        <ActionForm action={saveProduct.bind(null, null)} resetOnSuccess className="grid gap-3 md:grid-cols-12 md:items-end">
          <ProductFields />
          <div className="md:col-span-2">
            <SubmitButton className="btn btn-primary w-full">Tambah</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <div className="card overflow-x-auto p-0">
        {products.length === 0 && <p className="p-4 text-sm text-slate-500">Belum ada bahan.</p>}
        <div className="divide-y divide-slate-100">
          {products.map((p) => (
            <div key={p.id} className={`p-3 ${p.is_active ? "" : "bg-slate-50 opacity-70"}`}>
              <ActionForm action={saveProduct.bind(null, p.id)} className="grid gap-3 md:grid-cols-12 md:items-end">
                <ProductFields p={p} />
                <div className="flex items-center gap-2 md:col-span-2">
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" name="is_active" defaultChecked={p.is_active} /> Aktif
                  </label>
                  <SubmitButton className="btn btn-sm">Simpan</SubmitButton>
                </div>
              </ActionForm>
              <ActionForm action={deleteProduct.bind(null, p.id)} confirm={`Hapus ${p.name}?`} className="mt-1 text-right">
                <SubmitButton className="text-xs text-rose-600 hover:underline">Hapus</SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
