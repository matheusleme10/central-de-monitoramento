"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Sheet,
  Network,
  Users,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Itens marcados como "em breve" pertencem às próximas fases do roadmap.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/planilhas", label: "Planilhas", icon: Sheet },
  { href: "/mapa", label: "Mapa", icon: Network },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/permissoes", label: "Permissões", icon: ShieldCheck },
  { href: "/auditoria", label: "Auditoria", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="h-2 w-2 rounded-full bg-primary-foreground" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          Central de Monitoramento
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "border-primary bg-accent font-semibold text-accent-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
        Fase 1 — Infraestrutura
      </div>
    </aside>
  );
}
