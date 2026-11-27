"use client";

import { useState } from "react";
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
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  return (
    <div>
      {/* Selector Pratinjau Landscape vs Portrait */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
        <div className="text-xs text-slate-600">
          <span className="font-bold text-slate-900">Format Pratinjau Layar: </span>
          <span>
            {orientation === "landscape"
              ? "Landscape (Continuous Form 9.5 × 5.5 inci)"
              : "Portrait (A4 Tegak Pas Fit)"}
          </span>
        </div>
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setOrientation("landscape")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              orientation === "landscape"
                ? "bg-white text-blue-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Landscape (Form Asli)
          </button>
          <button
            type="button"
            onClick={() => setOrientation("portrait")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              orientation === "portrait"
                ? "bg-white text-blue-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Portrait (A4 Fit)
          </button>
        </div>
      </div>

      {/* Pages Render */}
      <div className="space-y-6">
        {pages.map((p, i) => (
          <div
            key={i}
            className={`mx-auto transition-all ${
              orientation === "portrait"
                ? "w-[595pt] min-h-[842pt] bg-white p-4 rounded-xl shadow-md border border-slate-200"
                : ""
            }`}
          >
            <div
              className="nota-page mx-auto"
              style={{
                width: pt(NOTA_W),
                height: pt(NOTA_H),
                fontFamily: 'Arial, "Liberation Sans", Arimo, Helvetica, sans-serif',
                transform: orientation === "portrait" ? "scale(0.817)" : undefined,
                transformOrigin: orientation === "portrait" ? "top center" : undefined,
                marginBottom: orientation === "portrait" ? "-60pt" : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={NOTA_LOGO}
                alt="Logo"
                style={{
                  position: "absolute",
                  left: pt(p.logo.x),
                  top: pt(p.logo.y),
                  width: pt(p.logo.w),
                  height: pt(p.logo.h),
                }}
              />
              {p.lines.map((l, j) => (
                <div
                  key={`l${j}`}
                  style={{
                    position: "absolute",
                    left: pt(l.x1),
                    top: pt(l.y - 0.25),
                    width: pt(l.x2 - l.x1),
                    borderTop: `0.5pt solid ${l.color}`,
                  }}
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
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: "64pt",
                      fontWeight: 900,
                      letterSpacing: "6px",
                      color:
                        p.watermark === "LUNAS"
                          ? "rgb(5 150 105 / 0.25)"
                          : "rgb(225 29 72 / 0.22)",
                      border:
                        p.watermark === "LUNAS"
                          ? "6px solid rgb(5 150 105 / 0.3)"
                          : "6px solid rgb(225 29 72 / 0.25)",
                      borderRadius: "14px",
                      padding: "4px 28px",
                      transform: "rotate(-16deg)",
                      textTransform: "uppercase",
                    }}
                  >
                    {p.watermark}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
