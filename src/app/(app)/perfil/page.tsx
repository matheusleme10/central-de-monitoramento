import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/guards";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Meu perfil — Central de Monitoramento" };

export default async function PerfilPage() {
  const session = await requireAuth();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          {session.user.name} — {session.user.email}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Alterar senha</h2>
        <p className="text-xs text-muted-foreground">
          Informe sua senha atual e a nova senha desejada (mínimo de 8 caracteres).
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
