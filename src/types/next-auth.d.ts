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
