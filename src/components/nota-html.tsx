import { NOTA_H, NOTA_W, type NotaPage, type NotaText } from "@/lib/nota-layout";
import { NOTA_LOGO } from "@/lib/nota-logo";

// Arial/Helvetica: ascent 0.905, descent 0.212. Dengan line-height 1.2, baseline = 0.9465 em dari atas kotak.
const BASELINE = 0.9465;
const pt = (n: number) => `${n}pt`;

function textStyle(t: NotaText): React.CSSProperties {
  const w = t.maxWidth ?? (t.align === "right" ? 220 : undefined);
  return {
    position: "absolute",
    top: pt(t.y - BASELINE * t.size),
    left: pt(t.align === "right" ? t.x - (w ?? 0) : t.x),
    width: w ? pt(w) : undefined,
    textAlign: t.align ?? "left",
    fontSize: pt(t.size),
    lineHeight: 1.2,
    fontWeight: t.bold ? 700 : 400,
    whiteSpace: "pre",
    overflow: t.maxWidth ? "hidden" : undefined,
    textOverflow: t.maxWidth ? "ellipsis" : undefined,
  };
}

export function NotaHtml({ pages }: { pages: NotaPage[] }) {
  return (
    <>
      {pages.map((p, i) => (
        <div
          key={i}
          className="nota-page mx-auto mb-6"
          style={{ width: pt(NOTA_W), height: pt(NOTA_H), fontFamily: 'Arial, "Liberation Sans", Arimo, Helvetica, sans-serif' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NOTA_LOGO}
            alt="Logo"
            style={{ position: "absolute", left: pt(p.logo.x), top: pt(p.logo.y), width: pt(p.logo.w), height: pt(p.logo.h) }}
          />
          {p.lines.map((l, j) => (
            <div
              key={`l${j}`}
              style={{ position: "absolute", left: pt(l.x1), top: pt(l.y - 0.25), width: pt(l.x2 - l.x1), borderTop: `0.5pt solid ${l.color}` }}
            />
          ))}
          {p.texts.map((t, j) => (
            <span key={`t${j}`} style={textStyle(t)}>
              {t.text}
            </span>
          ))}
          {p.watermark && (
            <div
              style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "80pt", fontWeight: 700, color: "rgb(225 29 72 / 0.22)", transform: "rotate(-18deg)", pointerEvents: "none",
              }}
            >
              {p.watermark}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
