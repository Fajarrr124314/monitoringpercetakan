import { notFound } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { buildNota } from "@/lib/nota-layout";
import { NotaPdf } from "@/lib/nota-pdf";
import { getOrderFull, toNotaData } from "@/lib/orders";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const orientationParam = searchParams.get("orientation") || searchParams.get("format");
  const orientation: "landscape" | "portrait" = orientationParam === "portrait" ? "portrait" : "landscape";

  const supabase = await createClient();
  const full = await getOrderFull(supabase, id);
  if (!full) notFound();

  const pages = buildNota(toNotaData(full));
  const baseName = full.order.order_no ?? `order-${full.order.id.slice(0, 8)}`;
  const filename = `${baseName}-${orientation}.pdf`;
  const buf = await renderToBuffer(NotaPdf({ pages, title: filename, orientation }));

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
