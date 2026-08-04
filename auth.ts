import NextAuth from "next-auth";
import { authConfig } from "@/infrastructure/auth/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
