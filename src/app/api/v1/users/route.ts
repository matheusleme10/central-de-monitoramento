import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createUserSchema } from "@/lib/validations/user.schema";
import { listUsers, createUser } from "@/core/services/user.service";
import { recordAuditLog } from "@/core/services/audit-log.service";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.USER_MANAGE);
    const users = await listUsers();
    return NextResponse.json({ data: users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(PERMISSIONS.USER_MANAGE);
    const body = await request.json();
    const input = createUserSchema.parse(body);
    const user = await createUser(input, session.user.id);

    // Nunca inclua a senha no log de auditoria.
    await recordAuditLog({
      userId: session.user.id,
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      metadata: { email: input.email, role: input.role },
      request,
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
