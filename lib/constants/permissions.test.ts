import { describe, expect, it } from "vitest";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "./permissions";
import { ROLES } from "./roles";

describe("catálogo de permissões", () => {
  it("não possui chaves de permissão duplicadas", () => {
    const values = Object.values(PERMISSIONS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("todas as permissões seguem o padrão recurso:acao", () => {
    for (const value of Object.values(PERMISSIONS)) {
      expect(value).toMatch(/^[a-z_]+:[a-z_]+$/);
    }
  });
});

describe("DEFAULT_ROLE_PERMISSIONS", () => {
  const validPermissionKeys = new Set(Object.values(PERMISSIONS));
  const nonSuperadminRoles = Object.keys(ROLES).filter((role) => role !== "SUPERADMIN");

  it("possui uma entrada para cada papel exceto SUPERADMIN", () => {
    expect(Object.keys(DEFAULT_ROLE_PERMISSIONS).sort()).toEqual(nonSuperadminRoles.sort());
  });

  it("referencia apenas chaves de permissão válidas, sem duplicatas por papel", () => {
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        expect(validPermissionKeys.has(permission), `${role} -> ${permission}`).toBe(true);
      }
      expect(new Set(permissions).size, `duplicatas em ${role}`).toBe(permissions.length);
    }
  });

  it("ADMIN recebe todas as permissões do catálogo", () => {
    const adminPermissions = new Set(DEFAULT_ROLE_PERMISSIONS.ADMIN);
    for (const permission of Object.values(PERMISSIONS)) {
      expect(adminPermissions.has(permission)).toBe(true);
    }
  });

  it("VISUALIZADOR só possui permissões de leitura", () => {
    for (const permission of DEFAULT_ROLE_PERMISSIONS.VISUALIZADOR) {
      expect(permission.endsWith(":read")).toBe(true);
    }
  });
});
