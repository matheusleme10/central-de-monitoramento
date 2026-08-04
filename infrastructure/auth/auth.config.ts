import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { prisma } from "@/infrastructure/database/prisma";
import { verifyPassword } from "@/infrastructure/auth/password";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { RoleKey } from "@/lib/constants/roles";

const credentialsSchema = z.object({
  email: z.string().email(),
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
 * - Não há cadastro público: o Credentials provider apenas autentica
 *   usuários já existentes, criados por um administrador.
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Proteção contra força bruta: 5 tentativas por minuto, por
        // combinação IP + e-mail. Não diferencia "usuário não existe" de
        // "senha errada" na resposta, evitando enumeração de contas.
        const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const rateLimit = checkRateLimit(`login:${ip}:${email}`, 5);
        if (!rateLimit.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true },
        });

        if (!user || !user.passwordHash || user.deletedAt || !user.isActive) {
          return null;
        }

        const isValid = await verifyPassword(user.passwordHash, password);
        if (!isValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role.name as RoleKey,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Login via Google: só permite se já existir um usuário convidado
      // com este e-mail (sem cadastro público).
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });
        if (!existing || existing.deletedAt || !existing.isActive) {
          return false;
        }
      }
      return true;
    },
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
            (rp) => rp.permission.key,
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
};
