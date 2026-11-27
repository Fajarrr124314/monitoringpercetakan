import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { buildNota, type NotaPage } from "@/lib/nota-layout";
import { NotaPdf } from "@/lib/nota-pdf";
import { getPeriodOrdersFull } from "@/lib/orders";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return new Response("Parameter start dan end wajib disertakan", { status: 400 });
  }

  const supabase = await createClient();
  const { orders, settings } = await getPeriodOrdersFull(supabase, start, end);

  if (orders.length === 0) {
    return new Response("Tidak ada order/faktur yang ditemukan pada periode ini", { status: 404 });
  }

  // Gabungkan seluruh lembar nota continuous form untuk periode ini
  const allPages: NotaPage[] = [];
  for (const o of orders) {
    const notaData = {
      settings,
      order: o,
      customer: o.customer,
      creatorName: o.creator_name || "Designer",
      items: o.items,
      printedAt: new Date(),
    };
    const pages = buildNota(notaData);
    allPages.push(...pages);
  }

  const filename = `Batch-Faktur-${start}_sd_${end}.pdf`;
  const buf = await renderToBuffer(NotaPdf({ pages: allPages, title: filename }));

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
