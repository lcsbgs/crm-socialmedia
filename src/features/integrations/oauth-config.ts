import "server-only";

// OAuth das integrações pessoais. TODO(oauth-setup): preencher as variáveis de cada provedor.
export type OAuthProvider = "google" | "canva" | "granola";

export function oauthConfig(id: string) {
  switch (id) {
    case "google":
      return process.env.GOOGLE_CLIENT_ID
        ? {
            authorize: "https://accounts.google.com/o/oauth2/v2/auth",
            token: "https://oauth2.googleapis.com/token",
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            scope: "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
            extra: { access_type: "offline", prompt: "consent" } as Record<string, string>,
          }
        : null;
    case "canva":
      return process.env.CANVA_CLIENT_ID
        ? {
            authorize: "https://www.canva.com/api/oauth/authorize",
            token: "https://api.canva.com/rest/v1/oauth/token",
            clientId: process.env.CANVA_CLIENT_ID,
            clientSecret: process.env.CANVA_CLIENT_SECRET,
            scope: "design:content:read design:content:write design:meta:read asset:read asset:write profile:read",
            extra: {} as Record<string, string>,
          }
        : null;
    case "granola":
      // O servidor MCP do Granola publica os endpoints por descoberta (/.well-known/oauth-authorization-server)
      // e aceita registro dinâmico de cliente. TODO(oauth-setup): implementar descoberta e registro.
      return process.env.GRANOLA_CLIENT_ID
        ? {
            authorize: process.env.GRANOLA_AUTHORIZE_URL ?? "https://mcp.granola.ai/authorize",
            token: process.env.GRANOLA_TOKEN_URL ?? "https://mcp.granola.ai/token",
            clientId: process.env.GRANOLA_CLIENT_ID,
            clientSecret: undefined,
            scope: "",
            extra: {} as Record<string, string>,
          }
        : null;
    default:
      return null;
  }
}
