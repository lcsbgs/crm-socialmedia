import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("cifra de tokens", () => {
  it("cifra e decifra", () => {
    const c = encryptSecret("token-secreto");
    expect(c).not.toContain("token-secreto");
    expect(decryptSecret(c)).toBe("token-secreto");
  });
  it("cada cifra é diferente (iv aleatório)", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });
  it("detecta adulteração", () => {
    const [v, iv, tag, data] = encryptSecret("abc").split(".");
    const flipped = data.slice(0, -2) + (data.at(-2) === "A" ? "B" : "A") + data.at(-1);
    expect(() => decryptSecret([v, iv, tag, flipped].join("."))).toThrow();
  });
});
