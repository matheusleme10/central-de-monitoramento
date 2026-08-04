import { NextResponse, type NextRequest } from "next/server";

/**
 * Primeira linha de defesa, executada no Edge Runtime.
 *
 * Importante: este middleware NÃO importa `@/auth` (que carrega
 * PrismaAdapter, Argon2 e o provider Credentials — todos dependentes de
 * APIs Node.js incompatíveis com o Edge Runtime). Em vez de decodificar a
 * sessão aqui, apenas verificamos a presença do cookie de sessão do
 * Auth.js. A validação completa (assinatura do token, papel, permissões)
 * é sempre refeita no servidor — em `(app)/layout.tsx` e em cada
 * Route Handler/Server Action via `requireAuth()` / `requirePermission()`.
 * Isso segue o padrão oficial do Auth.js v5 para Credentials provider.
 */
const PUBLIC_ROUTES = ["/login"];
const PUBLIC_PREFIXES = ["/api/auth"];

const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) return NextResponse.next();

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    req.cookies.has(name),
  );

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
