import "server-only";
import type { NextRequest } from "next/server";

/**
 * Extrai o IP do cliente a partir dos headers de proxy padrão. `NextRequest`
 * não expõe mais `.ip` de forma confiável em todos os ambientes de deploy
 * (depende do proxy/CDN na frente da aplicação).
 */
export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return null;
}
