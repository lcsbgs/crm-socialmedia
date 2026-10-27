// Utilitários de datas "YYYY-MM-DD" (sem fuso; tratadas como dias de calendário).

export function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekISO(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // segunda = 0
  return addDaysISO(iso, -dow);
}

export function monthGrid(month: string) {
  // month: "YYYY-MM". Semanas de segunda a domingo cobrindo o mês.
  const first = `${month}-01`;
  const start = startOfWeekISO(first);
  const lastDay = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10);
  const end = addDaysISO(startOfWeekISO(lastDay), 6);
  const days: string[] = [];
  for (let d = start; d <= end; d = addDaysISO(d, 1)) days.push(d);
  return { start, end, days };
}

export function shiftMonth(month: string, delta: number) {
  const d = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const weekdayShort = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export function weekdayLabel(iso: string) {
  return weekdayShort.format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
}
export function dayMonthLabel(iso: string) {
  return dayMonth.format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
}
export function monthLabel(month: string) {
  const t = monthLong.format(new Date(`${month}-01T00:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function monthEndISO(month: string) {
  return new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10);
}

// Timestamp -> "YYYY-MM-DD" e "HH:MM" em Brasília.
export function spDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
export function spTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
