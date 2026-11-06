import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Cifra de tokens de terceiros (AES-256-GCM) com ENCRYPTION_KEY. Formato: v1.iv.tag.dados (base64url).
// Sem ENCRYPTION_KEY só funciona em modo demonstração, com uma chave fixa de desenvolvimento.
function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw && raw.length >= 32) return createHash("sha256").update(raw).digest();
  if (process.env.INTEGRATIONS_MODE === "real") throw new Error("ENCRYPTION_KEY ausente: necessária no modo real.");
  return createHash("sha256").update("pauta-demonstracao-chave-local").digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Segredo em formato inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
