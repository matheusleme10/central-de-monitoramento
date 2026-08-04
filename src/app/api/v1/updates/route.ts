import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiToken } from "@/lib/auth/api-token-guard";
import { ForbiddenError } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordUpdateEventSchema } from "@/lib/validations/update-event.schema";
import { recordUpdateEvent } from "@/core/services/update-event.service";

const RATE_LIMIT_PER_MINUTE = 120;

/**
 * Ingestão de eventos de execução do Apps Script.
 *
 * Autenticado por API Token (não por sessão — o Apps Script não tem
 * cookie de navegador). Esta é a única rota `/api/v1` que não usa
 * `requirePermission`, pois seu "usuário" é o token, não uma sessão.
 */
export async function POST(request: NextRequest) {
  try {
    const apiToken = await authenticateApiToken(request);

    const rateLimit = checkRateLimit(`updates:${apiToken.id}`, RATE_LIMIT_PER_MINUTE);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente em instantes." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    const input = recordUpdateEventSchema.parse(body);

    if (apiToken.projectId && apiToken.projectId !== input.projectId) {
      throw new ForbiddenError("Este token não tem acesso a este projeto");
    }

    const result = await recordUpdateEvent(input);
    return NextResponse.json({ data: { eventId: result.event.id, status: result.event.status } }, {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
