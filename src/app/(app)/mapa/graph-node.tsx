"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  FolderKanban,
  Sheet as SheetIcon,
  Code2,
  Database,
  Server,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphNodeKind } from "@/core/services/graph.service";

const NODE_STYLES: Record<
  GraphNodeKind,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  PROJECT: { icon: FolderKanban, className: "border-primary/60 bg-primary/10 text-primary" },
  SPREADSHEET: { icon: SheetIcon, className: "border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  SHEET: { icon: SheetIcon, className: "border-border bg-card text-foreground" },
  APPSCRIPT: { icon: Code2, className: "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  DATABASE: { icon: Database, className: "border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  API: { icon: Server, className: "border-violet-500/50 bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  DOCS: { icon: BookOpen, className: "border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400" },
};

export interface GraphNodeData {
  kind: GraphNodeKind;
  label: string;
  subtitle?: string;
  meta: Record<string, unknown>;
  dimmed?: boolean;
  highlighted?: boolean;
}

function GraphNodeComponent({ data, selected }: NodeProps<GraphNodeData>) {
  const style = NODE_STYLES[data.kind];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "min-w-40 rounded-lg border-2 px-3 py-2 shadow-sm transition-opacity",
        style.className,
        selected && "ring-2 ring-ring",
        data.dimmed && "opacity-20",
        data.highlighted && "ring-2 ring-ring",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{data.label}</p>
          {data.subtitle && (
            <p className="truncate text-xs opacity-70">{data.subtitle}</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
