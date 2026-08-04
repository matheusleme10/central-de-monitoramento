import type { RoleKey } from "./roles";

/**
 * Catálogo de permissões (chave estável usada em `permissions.key` no banco).
 * Novas permissões devem ser adicionadas aqui e sincronizadas via seed.
 */
export const PERMISSIONS = {
  PROJECT_READ: "project:read",
  PROJECT_WRITE: "project:write",
  PROJECT_DELETE: "project:delete",
  SPREADSHEET_READ: "spreadsheet:read",
  SPREADSHEET_WRITE: "spreadsheet:write",
  SHEET_READ: "sheet:read",
  SHEET_WRITE: "sheet:write",
  UPDATE_EVENT_READ: "update_event:read",
  UPDATE_EVENT_WRITE: "update_event:write",
  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",
  GROUP_MANAGE: "group:manage",
  API_TOKEN_MANAGE: "api_token:manage",
  AUDIT_LOG_READ: "audit_log:read",
  ALERT_MANAGE: "alert:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Matriz padrão papel → permissões, usada pelo seed para popular
 * `role_permissions`. Superadmin recebe todas as permissões automaticamente
 * (checado por código, não precisa constar aqui).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  Exclude<RoleKey, "SUPERADMIN">,
  PermissionKey[]
> = {
  ADMIN: Object.values(PERMISSIONS),
  GESTOR: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_WRITE,
    PERMISSIONS.SPREADSHEET_READ,
    PERMISSIONS.SPREADSHEET_WRITE,
    PERMISSIONS.SHEET_READ,
    PERMISSIONS.SHEET_WRITE,
    PERMISSIONS.UPDATE_EVENT_READ,
    PERMISSIONS.ALERT_MANAGE,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.API_TOKEN_MANAGE,
  ],
  OPERADOR: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.SPREADSHEET_READ,
    PERMISSIONS.SHEET_READ,
    PERMISSIONS.UPDATE_EVENT_READ,
    PERMISSIONS.UPDATE_EVENT_WRITE,
  ],
  VISUALIZADOR: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.SPREADSHEET_READ,
    PERMISSIONS.SHEET_READ,
    PERMISSIONS.UPDATE_EVENT_READ,
  ],
};
