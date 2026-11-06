import { describe, expect, it } from "vitest";
import { greetingOptions, pickGreeting } from "./greeting";

describe("saudação", () => {
  it("usa o primeiro nome", () => {
    expect(pickGreeting({ name: "Bia Martins", hour: 9, weekday: 3, random: 0 }).text).toBe("Olá, Bia!");
  });
  it("muda com o período do dia", () => {
    const manha = greetingOptions({ name: "Bia", hour: 8, weekday: 3 }).map((g) => g.key);
    const noite = greetingOptions({ name: "Bia", hour: 21, weekday: 3 }).map((g) => g.key);
    expect(manha).toContain("bomdia-cafe");
    expect(noite).toContain("boanoite");
    expect(noite).not.toContain("bomdia-cafe");
  });
  it("sexta tem saudação própria", () => {
    expect(greetingOptions({ name: "Bia", hour: 10, weekday: 5 }).map((g) => g.key)).toContain("sexta");
  });
  it("inclui fatos do dia", () => {
    const opts = greetingOptions({
      name: "Bia",
      hour: 10,
      weekday: 2,
      facts: [{ key: "aprovou", text: "a Padaria aprovou 2 posts ontem." }],
    });
    expect(opts.at(-1)?.text).toBe("Bia, a Padaria aprovou 2 posts ontem.");
  });
  it("não repete a última saudação", () => {
    for (let i = 0; i < 20; i++) {
      const g = pickGreeting({ name: "Bia", hour: 9, weekday: 3, last: "ola", random: i / 20 });
      expect(g.key).not.toBe("ola");
    }
  });
});
