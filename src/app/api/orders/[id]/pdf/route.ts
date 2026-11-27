import { notFound } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { buildNota } from "@/lib/nota-layout";
import { NotaPdf } from "@/lib/nota-pdf";
import { getOrderFull, toNotaData } from "@/lib/orders";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const full = await getOrderFull(supabase, id);
  if (!full) notFound();

  const pages = buildNota(toNotaData(full));
  const filename = `${full.order.order_no ?? `order-${full.order.id.slice(0, 8)}`}.pdf`;
  const buf = await renderToBuffer(NotaPdf({ pages, title: filename }));

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
