import { MetaError } from "./types";

// Erros da Graph API traduzidos para quem usa o Pauta.
// https://developers.facebook.com/docs/graph-api/guides/error-handling
export function metaErrorFrom(body: unknown, status: number): MetaError {
  const err = (body as { error?: { code?: number; error_subcode?: number; message?: string } })?.error ?? {};
  const code = String(err.code ?? status);
  const sub = err.error_subcode;
  if (err.code === 190 || sub === 463 || sub === 467)
    return new MetaError(code, "Token expirado: reconecte a conta da Meta em Ajustes, Integrações.", false);
  if (err.code === 10 || err.code === 200 || (err.code ?? 0) >= 200 && (err.code ?? 0) < 300)
    return new MetaError(code, "Falta permissão para publicar nesta conta. Reconecte e aceite todas as permissões.", false);
  if (err.code === 4 || err.code === 17 || err.code === 32 || err.code === 613)
    return new MetaError(code, "A Meta limitou as publicações por agora. Vamos tentar de novo em alguns minutos.", true);
  if (err.code === 9004 || err.code === 2207026 || sub === 2207026)
    return new MetaError(code, "A Meta não conseguiu baixar a mídia. Confira o formato e o tamanho do arquivo.", false);
  if (err.code === 36003 || sub === 2207009)
    return new MetaError(code, "Proporção da imagem fora do aceito pelo Instagram (use entre 4:5 e 1.91:1).", false);
  if (status >= 500 || err.code === 1 || err.code === 2)
    return new MetaError(code, "A Meta está instável agora. Vamos tentar de novo sozinhos.", true);
  return new MetaError(code, err.message ? `A Meta recusou: ${err.message}` : "A Meta recusou a publicação.", false);
}

// Espera antes da próxima tentativa (minutos), igual ao banco.
export function backoffMinutes(tentativas: number) {
  return [1, 5, 15, 60][Math.min(Math.max(tentativas, 1), 4) - 1];
}
