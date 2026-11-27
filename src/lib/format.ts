// Format angka & tanggal mengikuti gaya nota (pemisah ribuan koma, mis. 101,000.00)

const TZ = "Asia/Jakarta";

export function money(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function money2(n: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function rupiah(n: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

/** Ukuran cm -> meter 2 desimal, mis. 405 -> "4.05" */
export function meters(cm: number): string {
  return (cm / 100).toFixed(2);
}

function parts(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return { day: get("day"), month: get("month"), year: get("year"), hour: get("hour"), minute: get("minute") };
}

/** "02 Nov 2026" */
export function dateNota(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const p = parts(value);
  return `${p.day} ${p.month} ${p.year}`;
}

/** "13:40" */
export function timeNota(value: string | Date | null | undefined): string {
  if (!value) return "";
  const p = parts(value);
  return `${p.hour}:${p.minute}`;
}

/** "04/11/2026" */
export function dateSlash(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" })
    .format(typeof value === "string" ? new Date(value) : value);
}

/** "27 Nov 2026 10:12" */
export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return `${dateNota(value)} ${timeNota(value)}`;
}

/** Nilai untuk <input type="datetime-local"> dalam WIB */
export function toLocalInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const f = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return f.replace(" ", "T");
}

/** Dari <input type="datetime-local"> (WIB) -> ISO */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}:00+07:00`).toISOString();
}

/** Tanggal hari ini (WIB) sebagai YYYY-MM-DD */
export function todayWib(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}
