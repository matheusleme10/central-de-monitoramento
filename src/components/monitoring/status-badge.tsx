import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "destructive" | "secondary" | "outline" }> = {
  SUCCESS: { label: "Sucesso", variant: "success" },
  ERROR: { label: "Erro", variant: "destructive" },
  RUNNING: { label: "Em andamento", variant: "outline" },
  CANCELLED: { label: "Cancelada", variant: "secondary" },
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <Badge variant="secondary">Nunca atualizada</Badge>;
  }
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
