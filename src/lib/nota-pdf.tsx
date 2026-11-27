import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { NOTA_H, NOTA_W, type NotaPage } from "@/lib/nota-layout";
import { NOTA_LOGO } from "@/lib/nota-logo";

// Jarak dari atas kotak teks ke baseline (x ukuran font) untuk Helvetica di react-pdf, line-height 1.2.
// Dikalibrasi terhadap PDF asli (lihat tests/nota.test.ts).
export const PDF_BASELINE = 0.9;

export function NotaPdf({ pages, title }: { pages: NotaPage[]; title: string }) {
  return (
    <Document title={title} creator="Monitoring Percetakan" producer="Monitoring Percetakan">
      {pages.map((p, i) => (
        <Page key={i} size={[NOTA_W, NOTA_H]} style={{ fontFamily: "Helvetica", color: "#000000" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={NOTA_LOGO} style={{ position: "absolute", left: p.logo.x, top: p.logo.y, width: p.logo.w, height: p.logo.h }} />
          {p.lines.map((l, j) => (
            <View
              key={`l${j}`}
              style={{
                position: "absolute", left: l.x1, top: l.y - 0.25, width: l.x2 - l.x1,
                borderTopWidth: 0.5, borderTopColor: l.color, borderTopStyle: "solid",
              }}
            />
          ))}
          {p.texts.map((t, j) => {
            const w = t.maxWidth ?? (t.align === "right" ? 220 : NOTA_W - t.x - 4);
            return (
              <Text
                key={`t${j}`}
                hyphenationCallback={(word) => [word]}
                style={{
                  position: "absolute",
                  top: t.y - PDF_BASELINE * t.size,
                  left: t.align === "right" ? t.x - w : t.x,
                  width: w,
                  fontSize: t.size,
                  lineHeight: 1.2,
                  fontFamily: t.bold ? "Helvetica-Bold" : "Helvetica",
                  textAlign: t.align ?? "left",
                }}
              >
                {t.text}
              </Text>
            );
          })}
          {p.watermark && (
            <Text
              style={{
                position: "absolute", top: NOTA_H / 2 - 50, left: 0, width: NOTA_W, textAlign: "center",
                fontSize: 80, fontFamily: "Helvetica-Bold", color: "#e11d48", opacity: 0.22, transform: "rotate(-18deg)",
              }}
            >
              {p.watermark}
            </Text>
          )}
        </Page>
      ))}
    </Document>
  );
}
