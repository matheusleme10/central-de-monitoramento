"use client";

import Link from "next/link";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  AlertTriangle,
  Clock,
  FolderKanban,
  Loader2,
  Sheet as SheetIcon,
  XCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  History,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardIndicators, StatusDistributionItem, LiveAlert } from "@/core/services/dashboard.service";

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "hsl(var(--success))",
  ERROR: "hsl(var(--destructive))",
  RUNNING: "hsl(var(--info))",
  CANCELLED: "hsl(var(--muted-foreground))",
  NEVER_UPDATED: "hsl(var(--muted-foreground))",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Sucesso",
  ERROR: "Erro",
  RUNNING: "Em andamento",
  CANCELLED: "Cancelada",
  NEVER_UPDATED: "Nunca atualizada",
};

interface IndicatorCardConfig {
  key: keyof DashboardIndicators;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "destructive";
}

const INDICATOR_CARDS: IndicatorCardConfig[] = [
  { key: "projectsCount", label: "Projetos", icon: FolderKanban },
  { key: "spreadsheetsCount", label: "Planilhas", icon: SheetIcon },
  { key: "sheetsCount", label: "Abas", icon: SheetIcon },
  { key: "updatesToday", label: "Atualizações de hoje", icon: Calendar },
  { key: "updatesWeek", label: "Atualizações da semana", icon: CalendarDays },
  { key: "updatesMonth", label: "Atualizações do mês", icon: CalendarRange },
  { key: "updatesOverdue", label: "Atualizações atrasadas", icon: Clock, tone: "warning" },
  { key: "updatesError", label: "Atualizações com erro", icon: XCircle, tone: "destructive" },
  { key: "updatesRunning", label: "Atualizações em andamento", icon: Loader2 },
  { key: "neverUpdated", label: "Nunca atualizadas", icon: History },
];

export function DashboardClient({
  indicators,
  distribution,
  alerts,
  userName,
}: {
  indicators: DashboardIndicators;
  distribution: StatusDistributionItem[];
  alerts: LiveAlert[];
  userName: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo, {userName} — visão consolidada de todos os projetos. Use a busca no topo para
          abrir um projeto específico.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {INDICATOR_CARDS.map(({ key, label, icon: Icon, tone }) => {
          const toneVar =
            tone === "destructive" ? "var(--destructive)" : tone === "warning" ? "var(--warning)" : "var(--primary)";
          const toneClass =
            tone === "destructive"
              ? { bar: "from-destructive", iconWrap: "bg-destructive/10 text-destructive" }
              : tone === "warning"
                ? { bar: "from-warning", iconWrap: "bg-warning/10 text-warning" }
                : { bar: "from-primary", iconWrap: "bg-primary/10 text-primary" };
          return (
            <div
              key={key}
              style={{ "--glow": toneVar } as React.CSSProperties}
              className="glow-card group relative overflow-hidden rounded-xl border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5"
            >
              <span
                className={cn(
                  "absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent",
                  toneClass.bar,
                )}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{label}</p>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    toneClass.iconWrap,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{indicators[key]}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4">
        <Card className="lg:max-w-xl">
          <CardHeader>
            <CardTitle>Status atual das abas</CardTitle>
            <CardDescription>Última execução conhecida de cada aba</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {distribution.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados suficientes
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {distribution.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => STATUS_LABELS[value as string] ?? value}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, STATUS_LABELS[name] ?? name]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
          <CardDescription>
            Calculados a partir das execuções e dos intervalos esperados configurados por aba
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum alerta no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <Link
                  key={`${alert.sheetId}-${alert.type}-${index}`}
                  href={`/projetos/${alert.projectId}/planilhas/${alert.spreadsheetDbId}/abas/${alert.sheetId}`}
                  className="flex items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-accent"
                >
                  {alert.type === "ERROR" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {alert.projectName} / {alert.spreadsheetName} / {alert.sheetName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                  <Badge variant={alert.severity === "CRITICAL" ? "destructive" : "warning"}>
                    {alert.severity === "CRITICAL" ? "Crítico" : "Atenção"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
