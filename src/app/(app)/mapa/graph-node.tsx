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
  { icon: React.ComponentType<{ className?: string }>; className: string; iconWrap: string }
> = {
  PROJECT: {
    icon: FolderKanban,
    className: "border-primary/40 bg-card text-foreground",
    iconWrap: "bg-primary/10 text-primary",
  },
  SPREADSHEET: {
    icon: SheetIcon,
    className: "border-info/30 bg-card text-foreground",
    iconWrap: "bg-info/10 text-info",
  },
  SHEET: {
    icon: SheetIcon,
    className: "border-border bg-card text-foreground",
    iconWrap: "bg-muted text-muted-foreground",
  },
  APPSCRIPT: {
    icon: Code2,
    className: "border-warning/30 bg-card text-foreground",
    iconWrap: "bg-warning/10 text-warning",
  },
  DATABASE: {
    icon: Database,
    className: "border-success/30 bg-card text-foreground",
    iconWrap: "bg-success/10 text-success",
  },
  API: {
    icon: Server,
    className: "border-primary/30 bg-card text-foreground",
    iconWrap: "bg-primary/10 text-primary",
  },
  DOCS: {
    icon: BookOpen,
    className: "border-border bg-card text-foreground",
    iconWrap: "bg-muted text-muted-foreground",
  },
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
        "min-w-44 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-all hover:shadow-md",
        style.className,
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        data.dimmed && "opacity-20",
        data.highlighted && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", style.iconWrap)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{data.label}</p>
          {data.subtitle && (
            <p className="truncate text-xs text-muted-foreground">{data.subtitle}</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
