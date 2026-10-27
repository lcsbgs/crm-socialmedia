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

// plural(3, "tarefa", "tarefas") -> "3 tarefas"
export function plural(n: number, singular: string, pluralForm: string, { withCount = true } = {}) {
  const word = n === 1 ? singular : pluralForm;
  return withCount ? `${n} ${word}` : word;
}

function diffDays(iso: string, today = todayISO()) {
  const a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Math.round((a - b) / 86_400_000);
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });

// Data relativa para dias: "hoje", "ontem", "amanhã", "há 4 dias", "sexta", "12/11".
export function formatRelativeDay(iso: string | null | undefined) {
  if (!iso) return "";
  const d = diffDays(iso.slice(0, 10));
  if (d === 0) return "hoje";
  if (d === -1) return "ontem";
  if (d === 1) return "amanhã";
  if (d < 0 && d >= -30) return `há ${-d} dias`;
  if (d > 1 && d < 7) return weekday.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
  return formatDate(iso);
}

// Para timestamps: "agora", "há 5 min", "há 3 h", depois data relativa.
export function formatRelativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
  return formatRelativeDay(day);
}

export function daysOverdue(iso: string) {
  return -diffDays(iso);
}
