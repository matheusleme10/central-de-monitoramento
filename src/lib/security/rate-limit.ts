import "server-only";

/**
 * Rate limiter em memória, por processo (janela deslizante simples).
 *
 * Suficiente para uma única instância. Em produção com múltiplas
 * instâncias/replicas, substituir por um backend compartilhado (ex.:
 * Redis/Upstash) — a interface abaixo foi mantida pequena de propósito
 * para facilitar essa troca futura sem alterar os chamadores.
 */
const WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    buckets.set(key, timestamps);
    return { allowed: false, remaining: 0, retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, remaining: limit - timestamps.length, retryAfterMs: 0 };
}
