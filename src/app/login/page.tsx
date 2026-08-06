import type { Metadata } from "next";
import { Suspense } from "react";
import { LayoutDashboard, ShieldCheck, History, Network } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Central de Monitoramento de Atualizações",
};

const HIGHLIGHTS = [
  { icon: LayoutDashboard, text: "Visão consolidada de projetos, planilhas e abas" },
  { icon: History, text: "Histórico completo de cada atualização" },
  { icon: ShieldCheck, text: "Permissões e auditoria por usuário" },
  { icon: Network, text: "Mapa de dependências entre integrações" },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Painel de marca — visível apenas em telas maiores */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary-foreground)/0.15),_transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary-foreground/10"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-foreground/15">
            <span className="h-2 w-2 rounded-full bg-primary-foreground" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-primary-foreground">
            Central de Monitoramento
          </span>
        </div>

        <div className="relative space-y-8">
          <h2 className="max-w-sm text-3xl font-semibold leading-tight text-primary-foreground">
            Monitore todas as suas planilhas em um só lugar
          </h2>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          Projeto → Planilha → Aba → Histórico de Atualizações
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary lg:mx-0">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Central de Monitoramento de Atualizações
            </h1>
            <p className="text-sm text-muted-foreground">
              Entre com sua conta para continuar
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
