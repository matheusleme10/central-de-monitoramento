import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-response";
import { globalSearch } from "@/core/services/search.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const results = await globalSearch(session, query);
    return NextResponse.json({ data: results });
  } catch (error) {
    return handleApiError(error);
  }
}
