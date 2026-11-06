import { describe, expect, it } from "vitest";
import { planAiRoute, type RouteInput } from "./route";

const base: RouteInput = {
  workspaceMode: "chatgpt",
  connection: { status: "ativa", simulated: true },
  hasAnthropicKey: false,
  integrationsMock: true,
  credits: { usados: 0, limite: 100 },
  cost: 3,
};

describe("roteamento da IA", () => {
  it("usa o ChatGPT quando a pessoa conectou e o espaço escolheu ChatGPT", () => {
    const r = planAiRoute(base);
    expect(r.kind).toBe("chatgpt");
    if (r.kind === "chatgpt") expect(r.then).toMatchObject({ kind: "credits", provider: "mock" });
  });
  it("sem conexão usa créditos; com chave usa Anthropic", () => {
    expect(planAiRoute({ ...base, connection: null })).toEqual({ kind: "credits", provider: "mock" });
    expect(planAiRoute({ ...base, connection: null, hasAnthropicKey: true })).toEqual({ kind: "credits", provider: "anthropic" });
  });
  it("limite do ChatGPT cai para créditos com aviso", () => {
    const r = planAiRoute({ ...base, connection: { status: "limite", simulated: true } });
    expect(r.kind).toBe("credits");
    if (r.kind === "credits") expect(r.warning).toMatch(/limite/);
  });
  it("conta inelegível cai para créditos com aviso", () => {
    const r = planAiRoute({ ...base, connection: { status: "inelegivel", simulated: true } });
    expect(r).toMatchObject({ kind: "credits" });
  });
  it("créditos esgotados bloqueiam quem não tem ChatGPT", () => {
    expect(planAiRoute({ ...base, connection: null, credits: { usados: 99, limite: 100 } }).kind).toBe("blocked");
  });
  it("conexão simulada não vale no modo real", () => {
    expect(planAiRoute({ ...base, integrationsMock: false }).kind).toBe("credits");
  });
});
