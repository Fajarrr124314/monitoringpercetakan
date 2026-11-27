import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { NOTA_H, NOTA_W, type NotaPage } from "@/lib/nota-layout";
import { NOTA_LOGO } from "@/lib/nota-logo";

// Jarak dari atas kotak teks ke baseline (x ukuran font) untuk Helvetica di react-pdf, line-height 1.2.
// Dikalibrasi terhadap PDF asli (lihat tests/nota.test.ts).
export const PDF_BASELINE = 0.9;

export function NotaPdf({
  pages,
  title,
  orientation = "landscape",
}: {
  pages: NotaPage[];
  title: string;
  orientation?: "landscape" | "portrait";
}) {
  const isPortrait = orientation === "portrait";

  // Dimensi A4 Portrait: 595.28 pt x 841.89 pt
  // Nota Continuous Form Asli: 684 pt x 396 pt
  // Di A4 Portrait, kita scale sebesar 0.817 agar lebar 684pt menjadi 558.8pt (pas di tengah A4 dengan margin 18pt)
  const scale = isPortrait ? 0.817 : 1.0;
  const offsetX = isPortrait ? (595.28 - NOTA_W * scale) / 2 : 0;
  const offsetY = isPortrait ? 36 : 0;

  return (
    <Document title={title} creator="Monitoring Percetakan" producer="Monitoring Percetakan">
      {pages.map((p, i) => (
        <Page
          key={i}
          size={isPortrait ? "A4" : [NOTA_W, NOTA_H]}
          orientation={isPortrait ? "portrait" : "landscape"}
          style={{ fontFamily: "Helvetica", color: "#000000" }}
        >
          {/* Logo */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={NOTA_LOGO}
            style={{
              position: "absolute",
              left: p.logo.x * scale + offsetX,
              top: p.logo.y * scale + offsetY,
              width: p.logo.w * scale,
              height: p.logo.h * scale,
            }}
          />

          {/* Garis-garis tabel */}
          {p.lines.map((l, j) => (
            <View
              key={`l${j}`}
              style={{
                position: "absolute",
                left: l.x1 * scale + offsetX,
                top: (l.y - 0.25) * scale + offsetY,
                width: (l.x2 - l.x1) * scale,
                borderTopWidth: 0.5 * scale,
                borderTopColor: l.color,
                borderTopStyle: "solid",
              }}
            />
          ))}

          {/* Teks Nota */}
          {p.texts.map((t, j) => {
            const rawW = t.maxWidth ?? (t.align === "right" ? 220 : NOTA_W - t.x - 4);
            const w = rawW * scale;
            const tx = t.x * scale + offsetX;
            const ty = t.y * scale + offsetY;
            const tSize = t.size * scale;

            return (
              <Text
                key={`t${j}`}
                hyphenationCallback={(word) => [word]}
                style={{
                  position: "absolute",
                  top: ty - PDF_BASELINE * tSize,
                  left: t.align === "right" ? tx - w : tx,
                  width: w,
                  fontSize: tSize,
                  lineHeight: 1.2,
                  fontFamily: t.bold ? "Helvetica-Bold" : "Helvetica",
                  textAlign: t.align ?? "left",
                }}
              >
                {t.text}
              </Text>
            );
          })}

          {/* Watermark LUNAS */}
          {p.watermark && (
            <Text
              style={{
                position: "absolute",
                top: (NOTA_H / 2 - 50) * scale + offsetY,
                left: offsetX,
                width: NOTA_W * scale,
                textAlign: "center",
                fontSize: 80 * scale,
                fontFamily: "Helvetica-Bold",
                color: "#e11d48",
                opacity: 0.22,
                transform: "rotate(-18deg)",
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
