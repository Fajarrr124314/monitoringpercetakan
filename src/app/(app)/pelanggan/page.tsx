import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";
import { ActionForm, SubmitButton } from "@/components/form";
import { deleteCustomer, saveCustomer } from "./actions";

export const metadata: Metadata = { title: "Pelanggan" };

function CustomerFields({ c, prefix = "" }: { c?: Partial<Customer>; prefix?: string }) {
  return (
    <>
      <div className="md:col-span-3">
        <label className="label">Nama (Kepada)</label>
        <input name={`${prefix}name`} defaultValue={c?.name} required className="input" placeholder="YOGYA KARAWANG" />
      </div>
      <div className="md:col-span-3">
        <label className="label">Alamat</label>
        <input name={`${prefix}address`} defaultValue={c?.address} className="input" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Kota</label>
        <input name={`${prefix}city`} defaultValue={c?.city} className="input" placeholder="karawang" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Provinsi</label>
        <input name={`${prefix}province`} defaultValue={c?.province} className="input" placeholder="Jawabarat" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Telepon</label>
        <input name={`${prefix}phone`} defaultValue={c?.phone} className="input" />
      </div>
    </>
  );
}

export default async function PelangganPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order("name").limit(200);
  if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_,()]/g, "")}%`);
  const { data } = await query;
  const customers = (data ?? []) as Customer[];

  return (
    <div className="space-y-4">
      <h1 className="page-title">Pelanggan</h1>

      <div className="card">
        <h2 className="mb-3 font-medium">Tambah pelanggan</h2>
        <ActionForm action={saveCustomer.bind(null, null)} resetOnSuccess className="grid gap-3 md:grid-cols-12 md:items-end">
          <CustomerFields />
          <div className="md:col-span-12">
            <SubmitButton>Tambah</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Cari nama pelanggan..." className="input max-w-xs" />
        <button className="btn">Cari</button>
      </form>

      <div className="card divide-y divide-slate-100 p-0">
        {customers.length === 0 && <p className="p-4 text-sm text-slate-500">Tidak ada pelanggan.</p>}
        {customers.map((c) => (
          <details key={c.id} className="group p-3">
            <summary className="flex cursor-pointer items-center justify-between text-sm">
              <span>
                <b>{c.name}</b>
                <span className="ml-2 text-slate-500">{[c.address, c.city, c.province].filter(Boolean).join(", ")}</span>
              </span>
              <span className="text-xs text-blue-600 group-open:hidden">Ubah</span>
            </summary>
            <ActionForm action={saveCustomer.bind(null, c.id)} className="mt-3 grid gap-3 md:grid-cols-12 md:items-end">
              <CustomerFields c={c} />
              <div className="md:col-span-12">
                <SubmitButton className="btn btn-sm">Simpan</SubmitButton>
              </div>
            </ActionForm>
            <ActionForm action={deleteCustomer.bind(null, c.id)} confirm={`Hapus ${c.name}?`} className="mt-1 text-right">
              <SubmitButton className="text-xs text-rose-600 hover:underline">Hapus</SubmitButton>
            </ActionForm>
          </details>
        ))}
      </div>
    </div>
  );
}
