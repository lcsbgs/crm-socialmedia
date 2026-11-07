// Contrato de publicação na Meta. As telas e a fila só falam com esta interface.

export type MetaPlatform = "instagram" | "facebook";

export type DiscoveredAccount = {
  plataforma: MetaPlatform;
  externalId: string;
  nome: string;
  username?: string | null;
  avatarUrl?: string | null;
  pageId?: string | null;
  pageToken?: string | null; // token da página (Facebook) para publicar nela
};

export type PublishKind = "image" | "carousel" | "video" | "reels" | "story" | "page_post";

export type PublishInput = {
  kind: PublishKind;
  caption: string;
  mediaUrls: string[]; // URLs públicas temporárias (assinadas) das mídias
  mediaTypes: ("image" | "video")[];
};

export type PublishTarget = { plataforma: MetaPlatform; externalId: string; accessToken: string };

export type PublishResult = { externalId: string; permalink: string | null };

export class MetaError extends Error {
  constructor(
    public code: string,
    public friendly: string,
    public recoverable: boolean,
  ) {
    super(friendly);
  }
}

export interface MetaAdapter {
  simulated: boolean;
  exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; expiresAt: Date | null }>;
  discoverAccounts(accessToken: string): Promise<DiscoveredAccount[]>;
  publish(target: PublishTarget, input: PublishInput): Promise<PublishResult>;
  refreshToken(accessToken: string): Promise<{ accessToken: string; expiresAt: Date | null }>;
}

// Formato do post do Pauta -> tipo de publicação.
export function publishKindFor(formato: string, plataforma: MetaPlatform, mediaCount: number): PublishKind {
  if (plataforma === "facebook") return "page_post";
  if (formato === "story") return "story";
  if (formato === "reels") return "reels";
  if (formato === "carrossel" || mediaCount > 1) return "carousel";
  return "image";
}
