import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneClass = {
    default: "text-foreground bg-muted",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  }[tone];

  return (
    <Card className="glow-card">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
