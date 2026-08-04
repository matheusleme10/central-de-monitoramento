import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/auth/project-access";
import { handleApiError } from "@/lib/api/error-response";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { generateProjectMarkdown } from "@/core/services/markdown-export.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission(PERMISSIONS.PROJECT_READ);
    const { id } = await params;
    await assertProjectAccess(session, id);
    const markdown = await generateProjectMarkdown(id);
    if (!markdown) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="projeto-${id}.md"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
