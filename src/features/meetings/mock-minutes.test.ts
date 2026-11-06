import { describe, expect, it } from "vitest";
import { mockMinutes } from "./mock-minutes";

describe("ata de demonstração", () => {
  it("separa decisões e próximos passos das anotações, sem inventar", () => {
    const m = mockMinutes("- Ficou combinado foco em delivery\n- enviar fotos do Natal\n- cliente gostou dos carrosséis");
    expect(m.decisoes).toEqual(["Ficou combinado foco em delivery"]);
    expect(m.proximos_passos.map((p) => p.titulo)).toEqual(["Enviar fotos do Natal"]);
    expect(m.resumo).toContain("demonstração");
  });
});
