/**
 * Papéis fixos do RBAC. O valor deve corresponder exatamente ao enum
 * `RoleName` definido em prisma/schema.prisma.
 */
export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  GESTOR: "GESTOR",
  OPERADOR: "OPERADOR",
  VISUALIZADOR: "VISUALIZADOR",
} as const;

export type RoleKey = keyof typeof ROLES;

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
  VISUALIZADOR: "Visualizador",
};

/** Hierarquia usada apenas para exibição/ordenação — a autorização real é feita por permissão, não por hierarquia implícita. */
export const ROLE_ORDER: RoleKey[] = [
  "SUPERADMIN",
  "ADMIN",
  "GESTOR",
  "OPERADOR",
  "VISUALIZADOR",
];
