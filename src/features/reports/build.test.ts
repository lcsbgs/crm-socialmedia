import { describe, expect, it } from "vitest";
import { mockInsights } from "@/lib/integrations/meta/insights";
import { buildReportSummary, type MetricRow } from "./build";

const m = (data: string, alcance: number, seguidores: number | null = null): MetricRow => ({ data, alcance, impressoes: alcance * 2, interacoes: 10, seguidores, simulated: false });

describe("relatório mensal", () => {
  it("soma métricas, calcula variação e seguidores", () => {
    const r = buildReportSummary({
      metrics: [m("2026-11-01", 100, 1000), m("2026-11-30", 200, 1050)],
      prevMetrics: [m("2026-10-10", 200)],
      published: [
        { titulo: "a", formato: "carrossel", data_publicacao: "2026-11-02" },
        { titulo: "b", formato: "reels", data_publicacao: "2026-11-05" },
        { titulo: "c", formato: "carrossel", data_publicacao: "2026-11-09" },
      ],
      approvals: [
        { decisao: "aprovado", deliverable_id: "a" },
        { decisao: "ajuste", deliverable_id: "b" },
        { decisao: "aprovado", deliverable_id: "b" },
      ],
    });
    expect(r).toMatchObject({ alcance: 300, impressoes: 600, interacoes: 20, seguidoresInicio: 1000, seguidoresFim: 1050, variacaoAlcance: 50, postsPublicados: 3, aprovadosDePrimeira: 1, ajustesPedidos: 1 });
    expect(r.porFormato).toEqual({ carrossel: 2, reels: 1 });
  });
  it("sem mês anterior não inventa variação", () => {
    expect(buildReportSummary({ metrics: [], prevMetrics: [], published: [], approvals: [] }).variacaoAlcance).toBeNull();
  });
  it("métrica simulada é estável por conta e dia", () => {
    expect(mockInsights("acc", "2026-11-01")).toEqual(mockInsights("acc", "2026-11-01"));
    expect(mockInsights("acc", "2026-11-01")).not.toEqual(mockInsights("acc", "2026-11-02"));
  });
});
