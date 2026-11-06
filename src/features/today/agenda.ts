// Montagem da Em pauta hoje a partir de dados reais. Função pura: recebe as linhas
// já lidas do banco e devolve os blocos da tela. Nada aqui inventa dados: o que não
// existe fica de fora e o bloco mostra estado vazio.

export type AgendaClient = { id: string; nome: string; cor: number };
export type AgendaPerson = { id: string; nome: string };

export type RawMeeting = { id: string; titulo: string; data: string; client: AgendaClient };
export type RawAdjustment = {
  deliverableId: string;
  titulo: string;
  autor: string | null;
  createdAt: string;
  client: AgendaClient;
};
export type RawTask = {
  id: string;
  titulo: string;
  dueDate: string | null;
  origem: "template" | "ata" | "manual";
  status: "pendente" | "feita";
  doneAt: string | null;
  responsavelId: string | null;
  client: AgendaClient | null;
};
export type RawPost = {
  id: string;
  titulo: string;
  status: "planejar" | "produzir" | "em_aprovacao" | "ajuste" | "aprovado" | "agendado" | "publicado";
  dataPublicacao: string | null;
  hora: string | null;
  statusChangedAt: string;
  responsavelId: string | null;
  client: AgendaClient;
  contato: { nome: string; telefone: string } | null;
  portalUrl: string | null;
};
export type RawPayment = {
  id: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "pago" | "atrasado";
  client: AgendaClient;
  contato: { nome: string; telefone: string } | null;
};

export type AgendaInput = {
  today: string; // YYYY-MM-DD no fuso do estúdio
  now: string; // ISO
  userId: string;
  scope: "minha" | "time";
  myClientIds: string[];
  people: AgendaPerson[];
  meetings: RawMeeting[];
  adjustments: RawAdjustment[];
  tasks: RawTask[];
  posts: RawPost[];
  payments: RawPayment[];
};

type Base = { key: string; client: AgendaClient | null; responsavel: AgendaPerson | null };

export type FalarItem =
  | (Base & { kind: "reuniao"; id: string; titulo: string; hora: string; destaque: boolean })
  | (Base & { kind: "ajuste"; deliverableId: string; quantos: number; desde: string; autor: string | null })
  | (Base & { kind: "ata"; taskId: string; titulo: string });

export type FazerItem =
  | (Base & { kind: "tarefa"; id: string; titulo: string; atrasoDias: number; dueDate: string | null })
  | (Base & {
      kind: "post";
      id: string;
      titulo: string;
      status: "planejar" | "produzir" | "ajuste";
      atrasoDias: number;
      dataPublicacao: string;
    });

export type ClienteItem = Base & {
  kind: "aprovacao";
  quantos: number;
  desde: string;
  diasEsperando: number;
  postIds: string[];
  contato: { nome: string; telefone: string } | null;
  portalUrl: string | null;
};

export type PublicacaoItem = Base & {
  kind: "publicacao";
  id: string;
  titulo: string;
  hora: string | null;
  noAr: boolean;
};

export type DinheiroItem = Base & {
  kind: "cobranca";
  id: string;
  valor: number;
  vencimento: string;
  atrasoDias: number;
  venceHoje: boolean;
  contato: { nome: string; telefone: string } | null;
};

export type FeitoItem = Base & { kind: "feito"; id: string; titulo: string; doneAt: string };

export type DailyAgenda = {
  counts: { reunioes: number; postsNoAr: number; clientesEsperando: number; total: number; atrasados: number };
  falar: FalarItem[];
  fazer: FazerItem[];
  cliente: ClienteItem[];
  publicacoes: PublicacaoItem[];
  dinheiro: DinheiroItem[];
  feitoHoje: FeitoItem[];
};

export function daysBetween(fromISODate: string, toISODate: string) {
  const a = Date.parse(`${fromISODate.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toISODate.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

const spTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(
    new Date(iso),
  );

const spDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

export function buildDailyAgenda(input: AgendaInput): DailyAgenda {
  const { today, userId, scope } = input;
  const person = (id: string | null) => (id ? (input.people.find((p) => p.id === id) ?? null) : null);
  const mine = (responsavelId: string | null, clientId: string | null) => {
    if (scope === "time") return true;
    if (responsavelId) return responsavelId === userId;
    return clientId ? input.myClientIds.includes(clientId) : true;
  };
  const myClient = (clientId: string) => scope === "time" || input.myClientIds.includes(clientId);

  // Com quem falar: reuniões do dia, ajustes pedidos (um por cliente), próximos passos de ata para hoje.
  const meetings = input.meetings
    .filter((m) => spDate(m.data) === today && myClient(m.client.id))
    .sort((a, b) => a.data.localeCompare(b.data));
  const nextMeeting = meetings.find((m) => m.data >= input.now);
  const falar: FalarItem[] = meetings.map((m) => ({
    key: `reuniao:${m.id}`,
    kind: "reuniao",
    id: m.id,
    titulo: m.titulo,
    hora: spTime(m.data),
    destaque: m.id === nextMeeting?.id,
    client: m.client,
    responsavel: null,
  }));

  const adjustmentsByClient = new Map<string, RawAdjustment[]>();
  for (const a of input.adjustments) {
    if (!myClient(a.client.id)) continue;
    adjustmentsByClient.set(a.client.id, [...(adjustmentsByClient.get(a.client.id) ?? []), a]);
  }
  for (const list of adjustmentsByClient.values()) {
    const latest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const distinct = new Set(list.map((a) => a.deliverableId)).size;
    falar.push({
      key: `ajuste:${latest.client.id}`,
      kind: "ajuste",
      deliverableId: latest.deliverableId,
      quantos: distinct,
      desde: latest.createdAt,
      autor: latest.autor,
      client: latest.client,
      responsavel: null,
    });
  }

  const pendentes = input.tasks.filter((t) => t.status === "pendente");
  for (const t of pendentes) {
    if (t.origem !== "ata" || t.dueDate !== today || !mine(t.responsavelId, t.client?.id ?? null)) continue;
    falar.push({
      key: `ata:${t.id}`,
      kind: "ata",
      taskId: t.id,
      titulo: t.titulo,
      client: t.client,
      responsavel: person(t.responsavelId),
    });
  }

  // O que fazer: tarefas até hoje (menos as de ata, que ficam em Com quem falar) e posts atrasados na produção.
  const fazer: FazerItem[] = [];
  for (const t of pendentes) {
    if (t.origem === "ata" && t.dueDate === today) continue;
    if (!t.dueDate || t.dueDate > today || !mine(t.responsavelId, t.client?.id ?? null)) continue;
    fazer.push({
      key: `tarefa:${t.id}`,
      kind: "tarefa",
      id: t.id,
      titulo: t.titulo,
      dueDate: t.dueDate,
      atrasoDias: Math.max(0, daysBetween(t.dueDate, today)),
      client: t.client,
      responsavel: person(t.responsavelId),
    });
  }
  for (const p of input.posts) {
    if ((p.status !== "planejar" && p.status !== "produzir" && p.status !== "ajuste") || !p.dataPublicacao) continue;
    if (p.dataPublicacao > today || !mine(p.responsavelId, p.client.id)) continue;
    fazer.push({
      key: `post:${p.id}`,
      kind: "post",
      id: p.id,
      titulo: p.titulo,
      status: p.status,
      dataPublicacao: p.dataPublicacao,
      atrasoDias: Math.max(0, daysBetween(p.dataPublicacao, today)),
      client: p.client,
      responsavel: person(p.responsavelId),
    });
  }
  fazer.sort((a, b) => b.atrasoDias - a.atrasoDias);

  // Com o cliente: posts em aprovação agrupados por cliente.
  const waiting = new Map<string, RawPost[]>();
  for (const p of input.posts) {
    if (p.status !== "em_aprovacao" || !myClient(p.client.id)) continue;
    waiting.set(p.client.id, [...(waiting.get(p.client.id) ?? []), p]);
  }
  const cliente: ClienteItem[] = [...waiting.values()]
    .map((list) => {
      const oldest = [...list].sort((a, b) => a.statusChangedAt.localeCompare(b.statusChangedAt))[0];
      return {
        key: `aprovacao:${oldest.client.id}`,
        kind: "aprovacao" as const,
        quantos: list.length,
        desde: oldest.statusChangedAt,
        diasEsperando: Math.max(0, daysBetween(spDate(oldest.statusChangedAt), today)),
        postIds: list.map((p) => p.id),
        contato: oldest.contato,
        portalUrl: oldest.portalUrl,
        client: oldest.client,
        responsavel: null,
      };
    })
    .sort((a, b) => a.desde.localeCompare(b.desde));

  // Publicações do dia.
  const publicacoes: PublicacaoItem[] = input.posts
    .filter((p) => p.dataPublicacao === today && (p.status === "aprovado" || p.status === "agendado" || p.status === "publicado"))
    .filter((p) => myClient(p.client.id))
    .map((p) => ({
      key: `publicacao:${p.id}`,
      kind: "publicacao" as const,
      id: p.id,
      titulo: p.titulo,
      hora: p.hora ? p.hora.slice(0, 5) : null,
      noAr: p.status === "publicado",
      client: p.client,
      responsavel: person(p.responsavelId),
    }))
    .sort((a, b) => (a.hora ?? "99").localeCompare(b.hora ?? "99"));

  // Dinheiro: cobranças vencidas ou vencendo hoje.
  const dinheiro: DinheiroItem[] = input.payments
    .filter((p) => p.status !== "pago" && p.vencimento <= today)
    .map((p) => ({
      key: `cobranca:${p.id}`,
      kind: "cobranca" as const,
      id: p.id,
      valor: p.valor,
      vencimento: p.vencimento,
      atrasoDias: Math.max(0, daysBetween(p.vencimento, today)),
      venceHoje: p.vencimento === today,
      contato: p.contato,
      client: p.client,
      responsavel: null,
    }))
    .sort((a, b) => b.atrasoDias - a.atrasoDias);

  const feitoHoje: FeitoItem[] = input.tasks
    .filter((t) => t.status === "feita" && t.doneAt && spDate(t.doneAt) === today)
    .filter((t) => mine(t.responsavelId, t.client?.id ?? null))
    .map((t) => ({
      key: `feito:${t.id}`,
      kind: "feito" as const,
      id: t.id,
      titulo: t.titulo,
      doneAt: t.doneAt as string,
      client: t.client,
      responsavel: person(t.responsavelId),
    }));

  const atrasados = fazer.filter((i) => i.atrasoDias > 0).length;
  return {
    counts: {
      reunioes: meetings.length,
      postsNoAr: publicacoes.length,
      clientesEsperando: cliente.length,
      total: falar.length + fazer.length + cliente.length + publicacoes.length + dinheiro.length,
      atrasados,
    },
    falar,
    fazer,
    cliente,
    publicacoes,
    dinheiro,
    feitoHoje,
  };
}
