import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { optionalServerEnv } from "@/lib/env.server";

// Sign in with ChatGPT (OAuth 2.0 + OIDC da OpenAI), fluxo no servidor com PKCE.
// Escopos do login: só "openid profile email". O uso do plano do ChatGPT na IA
// é um consentimento separado, pedido em Ajustes > IA e ChatGPT.
//
// TODO(oauth-setup): preencher OPENAI_OAUTH_CLIENT_ID, OPENAI_OAUTH_CLIENT_SECRET e,
// se a OpenAI publicar endpoints diferentes, OPENAI_OAUTH_ISSUER. Ver docs/oauth-setup.md.
export function chatgptOidcConfig() {
  const clientId = optionalServerEnv("OPENAI_OAUTH_CLIENT_ID");
  const clientSecret = optionalServerEnv("OPENAI_OAUTH_CLIENT_SECRET");
  const issuer = optionalServerEnv("OPENAI_OAUTH_ISSUER") ?? "https://auth.openai.com";
  if (!clientId) return null;
  return {
    clientId,
    clientSecret,
    authorizeUrl: `${issuer}/oauth/authorize`,
    tokenUrl: `${issuer}/oauth/token`,
    userinfoUrl: `${issuer}/userinfo`,
    scope: "openid profile email",
  };
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: randomBytes(16).toString("base64url") };
}
