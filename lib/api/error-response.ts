import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/guards";

/**
 * Tradutor central de erros para respostas HTTP. Nunca expõe stack trace
 * ou detalhes internos ao cliente — apenas mensagens seguras.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos", details: error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2025"
  ) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return NextResponse.json(
      { error: "Já existe um registro com esses dados" },
      { status: 409 },
    );
  }

  console.error("Erro não tratado na API:", error);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}
