"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { DashboardIndicators, StatusDistributionItem, LiveAlert } from "@/core/services/dashboard.service";

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "#22c55e",
  ERROR: "#ef4444",
  RUNNING: "#f59e0b",
  CANCELLED: "#6b7280",
  NEVER_UPDATED: "#9ca3af",
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
  projects,
  currentProjectId,
  userName,
}: {
  indicators: DashboardIndicators;
  distribution: StatusDistributionItem[];
  alerts: LiveAlert[];
  projects: Array<{ id: string; name: string }>;
  currentProjectId: string;
  userName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: "projectId", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Bem-vindo, {userName}</p>
        </div>

        <div className="flex gap-2">
          <Select value={currentProjectId || "ALL"} onValueChange={(v) => updateFilter("projectId", v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos os projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os projetos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {INDICATOR_CARDS.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon
                className={
                  "h-3.5 w-3.5 " +
                  (tone === "destructive"
                    ? "text-destructive"
                    : tone === "warning"
                      ? "text-amber-500"
                      : "text-muted-foreground")
                }
              />
            </div>
            <p className="mt-1 text-2xl font-semibold">{indicators[key]}</p>
          </div>
        ))}
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
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {alert.projectName} / {alert.spreadsheetName} / {alert.sheetName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                  <Badge variant={alert.severity === "CRITICAL" ? "destructive" : "secondary"}>
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
