import "server-only";
import { prisma } from "@/infrastructure/database/prisma";

export async function listRolesWithPermissions() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: { include: { permission: true } },
    },
  });
}

export async function listAllPermissions() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  return prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    }),
  ]);
}
