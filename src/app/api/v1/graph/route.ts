import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { buildGraphData } from "@/core/services/graph.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_READ);
    const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
    if (projectId) {
      await assertProjectAccess(session, projectId);
    }
    const graph = await buildGraphData(session, projectId);
    return NextResponse.json({ data: graph });
  } catch (error) {
    return handleApiError(error);
  }
}
