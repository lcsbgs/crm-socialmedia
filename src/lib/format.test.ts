import { describe, expect, it } from "vitest";
import { clientPalette } from "@/config/client-colors";
import { formatBRL, plural } from "./format";

describe("format", () => {
  it("formata reais", () => {
    expect(formatBRL(1200).replace(/\s/g, " ")).toBe("R$ 1.200,00");
  });
  it("plural sem parênteses", () => {
    expect(plural(1, "post", "posts")).toBe("1 post");
    expect(plural(3, "post", "posts")).toBe("3 posts");
  });
  it("paleta de cliente é circular", () => {
    expect(clientPalette(0).hex).toBe("#F28C28");
    expect(clientPalette(10).hex).toBe("#F28C28");
    expect(clientPalette(-1).hex).toBe(clientPalette(9).hex);
  });
});
