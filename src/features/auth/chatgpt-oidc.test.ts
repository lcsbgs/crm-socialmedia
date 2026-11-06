import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { chatgptOidcConfig, pkcePair } from "./chatgpt-oidc";

describe("Sign in with ChatGPT", () => {
  afterEach(() => {
    delete process.env.OPENAI_OAUTH_CLIENT_ID;
  });
  it("sem client id o login real fica desligado", () => {
    expect(chatgptOidcConfig()).toBeNull();
  });
  it("pede só openid profile email no login", () => {
    process.env.OPENAI_OAUTH_CLIENT_ID = "abc";
    expect(chatgptOidcConfig()?.scope).toBe("openid profile email");
  });
  it("PKCE usa S256 do verifier", () => {
    const { verifier, challenge, state } = pkcePair();
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(challenge);
    expect(state.length).toBeGreaterThan(10);
  });
});
