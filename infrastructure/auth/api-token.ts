import "server-only";
import { randomBytes, createHash } from "node:crypto";

const TOKEN_PREFIX = "cma";

/**
 * Tokens de API não usam Argon2 (custoso demais para ser verificado a cada
 * requisição do Apps Script) — em vez disso, geramos um valor de alta
 * entropia e armazenamos apenas seu hash SHA-256, prática padrão para
 * tokens de acesso (o mesmo modelo usado por GitHub/Stripe). O valor em
 * texto puro só existe no momento da criação e nunca é persistido.
 */
export function generateApiToken(): { token: string; tokenHash: string; preview: string } {
  const secret = randomBytes(32).toString("hex");
  const token = `${TOKEN_PREFIX}_${secret}`;
  const tokenHash = hashApiToken(token);
  const preview = `${TOKEN_PREFIX}_${secret.slice(0, 4)}…${secret.slice(-4)}`;
  return { token, tokenHash, preview };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
