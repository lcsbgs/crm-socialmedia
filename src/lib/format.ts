const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatBRL(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return brl.format(Number(value));
}

// Datas "YYYY-MM-DD" do Postgres são tratadas como UTC para não mudar de dia.
export function formatDate(value: string | null | undefined, style: "short" | "long" = "short") {
  if (!value) return "-";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return (style === "short" ? shortDate : longDate).format(date);
}

export function formatMonth(value: string) {
  const text = monthYear.format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Hoje no fuso de São Paulo, "YYYY-MM-DD".
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function currentMonthISO() {
  return `${todayISO().slice(0, 7)}-01`;
}

// "R$ 1.500,50", "1500.5", "1.500" -> 1500.5
export function parseMoney(input: unknown): number | null {
  if (typeof input === "number") return input;
  if (typeof input !== "string") return null;
  let s = input.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
