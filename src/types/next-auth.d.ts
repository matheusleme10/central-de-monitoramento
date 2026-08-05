import type { DefaultSession } from "next-auth";
import type { RoleKey } from "@/lib/constants/roles";

/**
 * Extensão de tipos do Auth.js para incluir papel e permissões do usuário
 * no token JWT e na sessão exposta à aplicação.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleKey;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role?: RoleKey;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: RoleKey;
    permissions: string[];
  }
}

// `next-auth/jwt` apenas reexporta (`export * from "@auth/core/jwt"`) — a
// interface `JWT` de fato é declarada em `@auth/core/jwt`. Sem este segundo
// `declare module`, o merge de tipos acima não é aplicado onde o Auth.js
// realmente usa `JWT` internamente (ex.: no callback `session`), fazendo
// `token.id`/`token.role`/`token.permissions` ficarem como `unknown`.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: RoleKey;
    permissions: string[];
  }
}
