import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { prisma } from "@/infrastructure/database/prisma";
import { verifyPassword } from "@/infrastructure/auth/password";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { RoleKey } from "@/lib/constants/roles";

const credentialsSchema = z.object({
  password: z.string().min(1),
});

/**
 * Configuração central do Auth.js.
 *
 * - Estratégia de sessão JWT: obrigatória porque o Credentials provider não
 *   é compatível com sessões de banco de dados no Auth.js.
 * - Cookies HttpOnly + Secure (em produção) + SameSite=lax são o padrão do
 *   Auth.js e não são sobrescritos aqui.
 * - CSRF é protegido nativamente pelas rotas internas do Auth.js
 *   (`/api/auth/csrf` + cookie de duplo envio).
 * - **Login por senha única**: a pedido do cliente, não há mais tela
 *   pedindo e-mail nem conceito de conta visível no login. Quem souber a
 *   senha entra. Por trás dos panos, o login testa a senha contra o hash
 *   da mesma conta "sistema" (a primeira Superadmin ativa no banco) —
 *   reaproveita o Argon2 já existente em vez de um segredo separado em
 *   variável de ambiente, então a senha continua trocável dentro do
 *   próprio sistema em `/perfil` (sem precisar redeploy). Isso preserva
 *   RBAC, auditoria e associação a projetos já construídos sem precisar
 *   reescrever essas camadas. Se no futuro for necessário voltar a ter
 *   múltiplas contas reais logando, é só restaurar o campo `email` aqui e
 *   no formulário de login — a lógica de papéis/permissões nem precisa
 *   mudar.
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  // Necessário atrás de proxy (Vercel, qualquer PaaS): sem isso, o Auth.js
  // pode ignorar o host real da requisição e cair de volta pra um valor
  // fixo — foi a causa do redirect indo para localhost:3000 em produção,
  // mesmo com AUTH_URL configurado errado na Vercel. Com trustHost, o
  // Auth.js confia no header Host da requisição real; AUTH_URL deixa de
  // ser obrigatório (mas se estiver setado com um valor errado, ainda
  // pode causar problema — ver docs/DEPLOY.md).
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        password: { label: "Senha", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { password } = parsed.data;

        // Proteção contra força bruta: 5 tentativas por minuto, por IP
        // (não há mais e-mail para diferenciar tentativas).
        const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const rateLimit = checkRateLimit(`login:${ip}`, 5);
        if (!rateLimit.allowed) {
          console.warn("[auth] login bloqueado por rate limit", { ip });
          return null;
        }

        // Não há seleção de conta no login: sempre resolve para a mesma
        // conta "sistema" (primeira Superadmin ativa cadastrada) e testa a
        // senha digitada contra o hash Argon2 dela.
        const systemUser = await prisma.user.findFirst({
          where: { role: { name: "SUPERADMIN" }, deletedAt: null, isActive: true },
          orderBy: { createdAt: "asc" },
          include: { role: true },
        });

        if (!systemUser?.passwordHash) {
          // Nunca loga a senha digitada — só o fato de não haver conta
          // Superadmin ativa/com senha definida (ex.: seed não rodou).
          console.warn("[auth] nenhuma conta Superadmin ativa com senha definida foi encontrada");
          return null;
        }

        const isValid = await verifyPassword(systemUser.passwordHash, password);
        if (!isValid) {
          console.warn("[auth] senha não confere com o hash da conta Superadmin", {
            userId: systemUser.id,
          });
          return null;
        }

        await prisma.user.update({
          where: { id: systemUser.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: systemUser.id,
          name: systemUser.name,
          email: systemUser.email,
          image: systemUser.image,
          role: systemUser.role.name as RoleKey,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role.name as RoleKey;
          token.permissions = dbUser.role.permissions.map(
            (rp: { permission: { key: string } }) => rp.permission.key,
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      // O tipo `JWT` do Auth.js (`@auth/core/jwt`) estende
      // `Record<string, unknown>`, então campos customizados (id/role/
      // permissions) chegam aqui como `unknown` mesmo com a extensão de
      // tipos em `src/types/next-auth.d.ts` — o `next-auth` e o
      // `@auth/prisma-adapter` instalados apontam para versões diferentes
      // de `@auth/core` (0.37.2 vs 0.41.3, ver `npm ls @auth/core`), então
      // o merge de tipos não alcança o `JWT` realmente usado aqui. Os
      // valores são de fato string/RoleKey/string[] — foram escritos por
      // nós mesmos no callback `jwt` acima — então o cast é seguro.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as RoleKey;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
};
