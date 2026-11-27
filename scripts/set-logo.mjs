import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

// Pakai: npm run logo -- path/ke/logo.jpg   (jpg/png)
// Menyalin logo ke assets/ lalu membuat src/lib/nota-logo.ts (data URI untuk nota web & PDF).
const src = process.argv[2] ?? "assets/logo-nota.jpg";
const isPng = src.toLowerCase().endsWith(".png");
const target = `assets/logo-nota.${isPng ? "png" : "jpg"}`;
if (src !== target) copyFileSync(src, target);
const b64 = readFileSync(target).toString("base64");
writeFileSync(
  "src/lib/nota-logo.ts",
  `// Dibuat otomatis oleh scripts/set-logo.mjs dari ${target} - jangan diedit manual.\n` +
    `export const NOTA_LOGO = "data:image/${isPng ? "png" : "jpeg"};base64,${b64}";\n`,
);
console.log(`Logo nota diperbarui dari ${target} (${Math.round(b64.length / 1024)} KB base64)`);
