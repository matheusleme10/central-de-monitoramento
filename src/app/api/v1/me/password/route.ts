import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { changePasswordSchema } from "@/lib/validations/user.schema";
import { changeOwnPassword } from "@/core/services/user.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

/**
 * Troca da própria senha (qualquer usuário autenticado, sem exigir
 * permissão especial — diferente de `PATCH /api/v1/users/[id]`, que é
 * restrito a quem tem `user:manage` e não exige a senha atual).
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const input = changePasswordSchema.parse(body);

    const success = await changeOwnPassword(session.user.id, input);
    if (!success) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }

    // Nunca gravar a senha (nem hash) no log de auditoria.
    await recordAuditLog({
      userId: session.user.id,
      action: "user.change_own_password",
      entityType: "user",
      entityId: session.user.id,
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
