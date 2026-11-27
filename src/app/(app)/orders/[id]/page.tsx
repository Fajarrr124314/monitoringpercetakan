import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { allowedTransitions, canEditOrder, paymentInfo, STATUS_ACTION } from "@/lib/constants";
import { dateTime, rupiah } from "@/lib/format";
import { buildNota } from "@/lib/nota-layout";
import { getOrderFull, toNotaData } from "@/lib/orders";
import type { OrderLog, OrderFile } from "@/lib/types";
import { ActionForm, SubmitButton } from "@/components/form";
import { NotaHtml } from "@/components/nota-html";
import { PdfExportMenu } from "@/components/pdf-export-menu";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { PayBadge, StatusBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/status-select";
import { addCommentAction, deleteFileAction, deleteOrderAction, quickSettleOrderAction, recordPaymentAction, setStatusAction, uploadFileAction } from "../actions";
import { CheckCircle2, CreditCard, FileText, ArrowLeft, Trash2 } from "lucide-react";

export const metadata: Metadata = { title: "Detail Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const full = await getOrderFull(supabase, id);
  if (!full) notFound();

  const { order, items } = full;
  const editable = canEditOrder(order.status);
  const nextStatuses = allowedTransitions(order.status);
  const pay = paymentInfo(order);

  const [{ data: logsData }, { data: filesData }] = await Promise.all([
    supabase.from("order_logs").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("order_files").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  const logs = (logsData ?? []) as OrderLog[];
  const files = (filesData ?? []) as OrderFile[];

  const signedFiles = await Promise.all(
    files.map(async (f) => {
      const { data } = await supabase.storage.from("order-files").createSignedUrl(f.path, 3600);
      return { ...f, url: data?.signedUrl ?? "#" };
    })
  );

  const pages = order.status !== "draft" ? buildNota(toNotaData(full)) : null;

  return (
    <div className="space-y-6">
      <RealtimeRefresh orderId={id} />

      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/orders" className="text-slate-400 hover:text-slate-700 mr-1" title="Kembali ke Daftar Order">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="page-title font-mono">{order.order_no ?? "(Draft)"}</h1>
            <StatusSelect orderId={order.id} currentStatus={order.status} compact />
            <PayBadge label={pay.label} />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dibuat {dateTime(order.created_at)} · Karyawan: <b>{order.creator_name || "-"}</b>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && <Link href={`/orders/${id}/edit`} className="btn">Ubah Order</Link>}
          {order.status !== "draft" && (
            <PdfExportMenu orderId={id} />
          )}
          <ActionForm
            action={deleteOrderAction.bind(null, id)}
            confirm={`Apakah Anda yakin ingin menghapus order ${order.order_no ?? "(draft)"} secara permanen?`}
          >
            <SubmitButton className="btn btn-danger">
              Hapus
            </SubmitButton>
          </ActionForm>
        </div>
      </div>

      {/* Banner Status Pelunasan Pihak Yogya */}
      {order.status !== "draft" && order.status !== "batal" && (
        pay.due <= 0 && order.total > 0 ? (
          <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-sm text-emerald-900 tracking-wide uppercase">
                  FAKTUR INI SUDAH LUNAS
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  Pembayaran penuh sebesar <b>{rupiah(order.total)}</b> telah tercatat lunas.
                  {order.payment_ref && <span> (Ref: <b>{order.payment_ref}</b>)</span>}
                </div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white tracking-wider uppercase shadow-2xs">
              LUNAS
            </span>
          </div>
        ) : (
          <div className="no-print rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-amber-900">
                  MENUNGGU PELUNASAN DARI PIHAK YOGYA
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  Total Tagihan: <b>{rupiah(order.total)}</b> · Sudah Bayar/DP: <b>{rupiah(pay.paid)}</b> · Sisa: <b className="text-rose-700 text-sm font-bold">{rupiah(pay.due)}</b>
                </div>
              </div>
            </div>
            <ActionForm
              action={quickSettleOrderAction.bind(null, id)}
              confirm={`Konfirmasi bahwa Pihak Yogya telah membayar lunas sisa tagihan ${rupiah(pay.due)}?`}
            >
              <input type="hidden" name="actor" value="Pihak Yogya" />
              <input type="hidden" name="payment_ref" value="Transfer Pelunasan Yogya" />
              <input type="hidden" name="method" value="noncash" />
              <SubmitButton className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Konfirmasi Lunas dari Yogya
              </SubmitButton>
            </ActionForm>
          </div>
        )
      )}

      {nextStatuses.length > 0 && (
        <div className="no-print card">
          <h2 className="mb-2 text-sm font-semibold">Ubah status produksi</h2>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <ActionForm
                key={s}
                action={setStatusAction.bind(null, id, s)}
                confirm={s === "batal" ? "Yakin membatalkan order ini?" : undefined}
                className="flex items-center gap-2"
              >
                <input name="actor" defaultValue="Percetakan" className="input max-w-[110px] text-xs" title="Nama yang mengubah status" />
                <input name="note" placeholder="Catatan (opsional)..." className="input max-w-xs text-xs" />
                <SubmitButton className={s === "batal" ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"}>
                  {STATUS_ACTION[s]}
                </SubmitButton>
              </ActionForm>
            ))}
          </div>
        </div>
      )}

      {order.status !== "draft" ? (
        <div className="space-y-2">
          <div className="no-print flex items-center justify-between">
            <h2 className="text-base font-semibold">Nota</h2>
            <span className="text-xs text-slate-500">Tampilan sama dengan hasil cetak continuous form</span>
          </div>
          <div className="nota-wrap overflow-x-auto rounded-lg bg-slate-200 p-4">
            <NotaHtml pages={pages!} />
          </div>
        </div>
      ) : (
        <div className="no-print card space-y-3">
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Order ini masih berstatus <b>Draft</b>. Nota belum diterbitkan. Klik tombol di bawah untuk menerbitkan nota.
          </div>
          <table className="tbl">
            <thead>
              <tr><th>No</th><th>Bahan</th><th>Nama pekerjaan</th><th>Jumlah</th><th className="text-right">Subtotal</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id}>
                  <td>{i + 1}</td>
                  <td>{it.product_name}</td>
                  <td>{it.description || "-"}</td>
                  <td>{it.qty} {it.unit_label}</td>
                  <td className="text-right font-medium">{rupiah(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right text-lg font-semibold">Total: {rupiah(order.total)}</div>
        </div>
      )}

      {order.status !== "draft" && order.status !== "batal" && (
        <div className="no-print card space-y-3">
          <h2 className="text-base font-semibold">Catat Pembayaran</h2>
          <ActionForm action={recordPaymentAction.bind(null, id)} className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-2">
              <label className="label">Uang muka / DP (Rp)</label>
              <input type="number" min={0} step={1} name="down_payment" defaultValue={order.down_payment} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Tunai (Rp)</label>
              <input type="number" min={0} step={1} name="cash" defaultValue={order.cash_paid} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Non tunai (Rp)</label>
              <input type="number" min={0} step={1} name="noncash" defaultValue={order.noncash_paid} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Ref transfer</label>
              <input name="payment_ref" defaultValue={order.payment_ref} className="input" placeholder="BCA / Mandiri" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Penerima / Kasir</label>
              <input name="actor" defaultValue="Kasir" className="input" />
            </div>
            <div className="md:col-span-2">
              <SubmitButton className="btn btn-primary w-full">Simpan</SubmitButton>
            </div>
            <div className="md:col-span-12">
              <span className="text-sm">
                Total: <b>{rupiah(order.total)}</b> · Dibayar: <b>{rupiah(pay.paid)}</b> · Sisa: <b>{rupiah(pay.due)}</b>
              </span>
            </div>
          </ActionForm>
        </div>
      )}

      <div className="no-print grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="text-base font-semibold">File Desain &amp; Lampiran</h2>
          {editable && (
            <ActionForm action={uploadFileAction.bind(null, id)} resetOnSuccess className="flex gap-2">
              <input type="file" name="file" required className="input text-xs" />
              <input name="uploader" placeholder="Nama pengunggah..." className="input max-w-[120px] text-xs" defaultValue="Designer" />
              <SubmitButton className="btn btn-sm">Unggah</SubmitButton>
            </ActionForm>
          )}
          {signedFiles.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada file diunggah.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {signedFiles.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2">
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {f.file_name} <span className="text-xs text-slate-400">({Math.round(f.size_bytes / 1024)} KB · {f.uploaded_by})</span>
                  </a>
                  <ActionForm action={deleteFileAction.bind(null, id, f.id, f.path)} confirm={`Hapus ${f.file_name}?`}>
                    <SubmitButton className="text-xs text-rose-600 hover:underline">Hapus</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="text-base font-semibold">Timeline &amp; Diskusi</h2>
          <ActionForm action={addCommentAction.bind(null, id)} resetOnSuccess className="flex gap-2">
            <input name="actor" placeholder="Nama..." className="input max-w-[110px] text-xs" defaultValue="Designer" />
            <input name="note" required placeholder="Tulis komentar..." className="input text-xs" />
            <SubmitButton className="btn btn-sm">Kirim</SubmitButton>
          </ActionForm>
          <ul className="space-y-2 text-xs">
            {logs.map((l) => (
              <li key={l.id} className="rounded border-l-2 border-slate-300 bg-slate-50 p-2">
                <div className="flex justify-between text-slate-400">
                  <span className="font-semibold uppercase text-slate-600">
                    {l.action} {l.actor_name ? `· ${l.actor_name}` : ""}
                  </span>
                  <span>{dateTime(l.created_at)}</span>
                </div>
                {l.from_status && l.to_status && (
                  <div className="text-slate-700">{l.from_status} → <b>{l.to_status}</b></div>
                )}
                {l.note && <div className="text-slate-800">{l.note}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
