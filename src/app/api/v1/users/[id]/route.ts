import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { updateUserSchema } from "@/lib/validations/user.schema";
import { getUserById, updateUser, softDeleteUser } from "@/core/services/user.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(PERMISSIONS.USER_MANAGE);
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.USER_MANAGE);
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Você não pode alterar seu próprio papel ou status por aqui" },
        { status: 400 },
      );
    }

    const existing = await getUserById(id);
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const input = updateUserSchema.parse(body);
    const user = await updateUser(id, input);

    // Nunca inclua a senha no log de auditoria.
    await recordAuditLog({
      userId: session.user.id,
      action: "user.update",
      entityType: "user",
      entityId: id,
      metadata: {
        role: input.role,
        isActive: input.isActive,
        passwordChanged: Boolean(input.password),
      },
      request,
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.USER_MANAGE);
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Você não pode desativar a própria conta" },
        { status: 400 },
      );
    }

    const existing = await getUserById(id);
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    await softDeleteUser(id);

    await recordAuditLog({
      userId: session.user.id,
      action: "user.delete",
      entityType: "user",
      entityId: id,
      request,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
