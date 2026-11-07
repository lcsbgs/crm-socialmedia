import { describe, expect, it } from "vitest";
import { buildDailyAgenda, type AgendaInput, type RawPost, type RawTask } from "./agenda";

const padaria = { id: "c1", nome: "Padaria Pão Quente", cor: 0 };
const clinica = { id: "c2", nome: "Clínica Sorrir", cor: 1 };
const bia = { id: "u1", nome: "Bia" };
const julia = { id: "u2", nome: "Júlia" };

function base(over: Partial<AgendaInput> = {}): AgendaInput {
  return {
    today: "2026-11-06",
    now: "2026-11-06T12:00:00Z",
    userId: "u1",
    scope: "time",
    myClientIds: ["c1"],
    people: [bia, julia],
    meetings: [],
    adjustments: [],
    tasks: [],
    posts: [],
    payments: [],
    ...over,
  };
}

const task = (over: Partial<RawTask>): RawTask => ({
  id: "t",
  titulo: "Tarefa",
  dueDate: "2026-11-06",
  origem: "manual",
  status: "pendente",
  doneAt: null,
  responsavelId: null,
  client: padaria,
  ...over,
});

const post = (over: Partial<RawPost>): RawPost => ({
  id: "p",
  titulo: "Post",
  status: "produzir",
  dataPublicacao: "2026-11-06",
  hora: null,
  statusChangedAt: "2026-11-04T12:00:00Z",
  responsavelId: null,
  client: padaria,
  contato: null,
  portalUrl: null,
  ...over,
});

describe("getDailyAgenda (montagem)", () => {
  it("dia sem nada devolve tudo vazio, sem inventar itens", () => {
    const a = buildDailyAgenda(base());
    expect(a.counts.total).toBe(0);
    expect(a.falar).toEqual([]);
    expect(a.fazer).toEqual([]);
    expect(a.cliente).toEqual([]);
    expect(a.publicacoes).toEqual([]);
    expect(a.dinheiro).toEqual([]);
  });

  it("reuniões do dia em ordem, com a próxima em destaque", () => {
    const a = buildDailyAgenda(
      base({
        meetings: [
          { id: "m2", titulo: "Kickoff", data: "2026-11-06T17:30:00Z", client: clinica },
          { id: "m1", titulo: "Alinhamento", data: "2026-11-06T13:00:00Z", client: padaria },
          { id: "m0", titulo: "Amanhã", data: "2026-11-07T13:00:00Z", client: padaria },
        ],
      }),
    );
    expect(a.falar.map((i) => i.key)).toEqual(["reuniao:m1", "reuniao:m2"]);
    expect(a.falar[0]).toMatchObject({ hora: "10:00", destaque: true });
    expect(a.counts.reunioes).toBe(2);
  });

  it("ajustes viram um item por cliente com a contagem de posts", () => {
    const a = buildDailyAgenda(
      base({
        adjustments: [
          { deliverableId: "p1", titulo: "A", autor: "Mariana", createdAt: "2026-11-06T09:00:00Z", client: clinica },
          { deliverableId: "p2", titulo: "B", autor: "Mariana", createdAt: "2026-11-06T10:00:00Z", client: clinica },
        ],
      }),
    );
    expect(a.falar).toHaveLength(1);
    expect(a.falar[0]).toMatchObject({ kind: "ajuste", quantos: 2, deliverableId: "p2" });
  });

  it("tarefa de ata para hoje vai para Com quem falar; atrasada vai para O que fazer", () => {
    const a = buildDailyAgenda(
      base({
        tasks: [
          task({ id: "ata1", origem: "ata", titulo: "enviar fotos do Natal" }),
          task({ id: "t2", dueDate: "2026-11-04", titulo: "Arte do carrossel" }),
          task({ id: "t3", dueDate: "2026-11-09", titulo: "Futuro" }),
        ],
      }),
    );
    expect(a.falar.map((i) => i.key)).toEqual(["ata:ata1"]);
    expect(a.fazer.map((i) => i.key)).toEqual(["tarefa:t2"]);
    expect(a.fazer[0]).toMatchObject({ atrasoDias: 2 });
    expect(a.counts.atrasados).toBe(1);
  });

  it("posts em aprovação agrupados por cliente com dias de espera", () => {
    const a = buildDailyAgenda(
      base({
        posts: [
          post({ id: "a1", status: "em_aprovacao", statusChangedAt: "2026-11-04T12:00:00Z" }),
          post({ id: "a2", status: "em_aprovacao", statusChangedAt: "2026-11-05T12:00:00Z" }),
          post({ id: "a3", status: "em_aprovacao", client: clinica, statusChangedAt: "2026-11-06T12:00:00Z" }),
        ],
      }),
    );
    expect(a.cliente).toHaveLength(2);
    expect(a.cliente[0]).toMatchObject({ quantos: 2, diasEsperando: 2, postIds: ["a1", "a2"] });
    expect(a.counts.clientesEsperando).toBe(2);
  });

  it("publicações do dia ordenadas por hora; cobranças vencidas e de hoje", () => {
    const a = buildDailyAgenda(
      base({
        posts: [
          post({ id: "x", status: "aprovado", hora: "18:00:00" }),
          post({ id: "y", status: "publicado", hora: "09:00:00" }),
          post({ id: "z", status: "aprovado", dataPublicacao: "2026-11-07" }),
        ],
        payments: [
          { id: "pg1", valor: 1200, vencimento: "2026-11-01", status: "atrasado", client: padaria, contato: null },
          { id: "pg2", valor: 1800, vencimento: "2026-11-06", status: "pendente", client: clinica, contato: null },
          { id: "pg3", valor: 900, vencimento: "2026-11-10", status: "pendente", client: clinica, contato: null },
          { id: "pg4", valor: 500, vencimento: "2026-11-02", status: "pago", client: clinica, contato: null },
        ],
      }),
    );
    expect(a.publicacoes.map((p) => [p.id, p.hora, p.noAr])).toEqual([
      ["y", "09:00", true],
      ["x", "18:00", false],
    ]);
    expect(a.dinheiro.map((d) => [d.id, d.atrasoDias, d.venceHoje])).toEqual([
      ["pg1", 5, false],
      ["pg2", 0, true],
    ]);
  });

  it("Minha pauta mostra o que é meu, sem responsável dos meus clientes, e esconde o resto", () => {
    const input = base({
      scope: "minha",
      tasks: [
        task({ id: "minha", responsavelId: "u1", client: clinica }),
        task({ id: "dajulia", responsavelId: "u2" }),
        task({ id: "semdono-meu-cliente", responsavelId: null, client: padaria }),
        task({ id: "semdono-outro", responsavelId: null, client: clinica }),
      ],
      posts: [post({ id: "ap", status: "em_aprovacao", client: clinica })],
    });
    const a = buildDailyAgenda(input);
    expect(a.fazer.map((i) => i.key).sort()).toEqual(["tarefa:minha", "tarefa:semdono-meu-cliente"]);
    expect(a.cliente).toEqual([]);
    const time = buildDailyAgenda({ ...input, scope: "time" });
    expect(time.fazer).toHaveLength(4);
    expect(time.cliente).toHaveLength(1);
  });

  it("falha de publicação aparece primeiro com o erro", () => {
    const a = buildDailyAgenda(
      base({
        posts: [post({ id: "x", status: "agendado", hora: "18:00:00" })],
        publishErrors: [{ deliverableId: "z", titulo: "Desafio", erro: "Token expirado", quando: "2026-11-06T22:00:00Z", client: clinica }],
      }),
    );
    expect(a.publicacoes[0]).toMatchObject({ id: "z", erro: "Token expirado", hora: "19:00" });
  });

  it("concluídas hoje vão para Feito hoje", () => {
    const a = buildDailyAgenda(
      base({
        tasks: [
          task({ id: "f1", status: "feita", doneAt: "2026-11-06T14:00:00Z" }),
          task({ id: "f0", status: "feita", doneAt: "2026-11-05T14:00:00Z" }),
        ],
      }),
    );
    expect(a.feitoHoje.map((i) => i.id)).toEqual(["f1"]);
    expect(a.fazer).toEqual([]);
  });
});
