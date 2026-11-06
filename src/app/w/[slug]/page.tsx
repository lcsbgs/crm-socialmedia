import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DailyAgendaView } from "@/features/today/components/daily-agenda";
import { GreetingCookie } from "@/features/today/components/greeting-cookie";
import { pickGreeting } from "@/features/today/greeting";
import { getDailyAgenda, getGreetingFacts } from "@/features/today/queries";
import { getProfile, getWorkspaceBySlug } from "@/features/workspaces/queries";
import { requireUser } from "@/lib/auth";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Em pauta hoje" };

const longToday = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

function spNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 9);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  return { hour, weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd) };
}

function Pill({ tone, children }: { tone: "accent" | "ok" | "late" | "neutral"; children: React.ReactNode }) {
  const cls = {
    accent: "bg-accent-tonal text-accent-tonal-ink",
    ok: "bg-ok-tonal text-ok-ink",
    late: "bg-late-tonal text-late-ink",
    neutral: "bg-surface text-ink-2",
  }[tone];
  return <span className={`mx-0.5 my-1 inline-flex items-center rounded-full px-4 ${cls}`}>{children}</span>;
}

export default async function TodayPage({ params, searchParams }: PageProps<"/w/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [user, workspace, profile, cookieStore] = await Promise.all([
    requireUser(),
    getWorkspaceBySlug(slug),
    getProfile(),
    cookies(),
  ]);
  const scope = query.pauta === "time" ? "time" : "minha";
  const [agenda, facts] = await Promise.all([
    getDailyAgenda(workspace.id, { userId: user.id, scope, canSeeFinance: workspace.canManage }),
    getGreetingFacts(workspace.id),
  ]);
  const { hour, weekday } = spNow();
  const greeting = pickGreeting({
    name: profile?.nome || user.email.split("@")[0],
    hour,
    weekday,
    facts,
    last: cookieStore.get("pauta_saudacao")?.value ?? null,
  });
  const { reunioes, postsNoAr, clientesEsperando } = agenda.counts;
  const parts = [
    reunioes ? <Pill key="r" tone="accent">{plural(reunioes, "reunião", "reuniões")}</Pill> : null,
    postsNoAr ? <Pill key="p" tone="ok">{plural(postsNoAr, "post no ar", "posts no ar")}</Pill> : null,
    clientesEsperando ? (
      <Pill key="c" tone="late">{plural(clientesEsperando, "cliente esperando", "clientes esperando")}</Pill>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-7">
      <GreetingCookie value={greeting.key} />
      <header className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline gap-3.5">
          <span className="font-display text-2xl text-accent">{greeting.text}</span>
          <span className="text-md font-medium text-muted first-letter:uppercase">{longToday.format(new Date())}</span>
        </div>
        <h1 className="max-w-[980px] font-display text-3xl leading-[1.18] sm:text-4xl">
          {parts.length === 0 ? (
            <>Em pauta hoje: nada urgente. Dia bom para adiantar.</>
          ) : (
            <>
              Em pauta hoje: {parts.length === 1 ? parts[0] : null}
              {parts.length === 2 ? (
                <>
                  {parts[0]} e {parts[1]}
                </>
              ) : null}
              {parts.length === 3 ? (
                <>
                  {parts[0]}, {parts[1]} e {parts[2]}
                </>
              ) : null}
              {clientesEsperando ? " você." : "."}
            </>
          )}
        </h1>
        {scope === "time" ? <p className="text-sm text-muted">Mostrando a pauta de todo o time.</p> : null}
      </header>
      <DailyAgendaView agenda={agenda} canSeeFinance={workspace.canManage} />
    </div>
  );
}
