import { describe, expect, it } from "vitest";
import { defaultContractTemplate, fillTemplate } from "./contract-template";

describe("modelo de contrato", () => {
  it("troca as variáveis e some com as que faltam", () => {
    const t = fillTemplate("Oi {{cliente}}, valor {{valor}}{{nada}}.", { cliente: "Padaria", valor: "R$ 1.200,00" });
    expect(t).toBe("Oi Padaria, valor R$ 1.200,00.");
  });
  it("modelo padrão não tem travessão", () => {
    expect(defaultContractTemplate).not.toMatch(/—/);
  });
});
