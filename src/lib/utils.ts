import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * "—" sem responsável, "Nome" ou "Nome1, Nome2" com até 2, e
 * "Primeiro (alfabético) + N colaboradores" acima disso — evita listas de
 * responsável estourando a largura da coluna na tabela de Abas.
 */
export function formatResponsibleList(responsibles: { name: string }[]): string {
  if (responsibles.length === 0) return "—";
  const sorted = [...responsibles].sort((a, b) => a.name.localeCompare(b.name));
  if (sorted.length <= 2) return sorted.map((r) => r.name).join(", ");
  const rest = sorted.length - 1;
  return `${sorted[0].name} + ${rest} colaborador${rest === 1 ? "" : "es"}`;
}
