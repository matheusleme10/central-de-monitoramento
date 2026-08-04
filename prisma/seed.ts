import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { ROLES, type RoleKey } from "../src/lib/constants/roles";
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "../src/lib/constants/permissions";

const prisma = new PrismaClient();

/**
 * Seed idempotente: popula papéis, permissões e a matriz role→permission,
 * além de criar o primeiro usuário Superadmin caso ainda não exista.
 *
 * Credenciais do Superadmin inicial são lidas de variáveis de ambiente
 * para nunca ficarem hardcoded no código-fonte.
 */
async function main() {
  console.log("Criando papéis...");
  const roleRecords = await Promise.all(
    (Object.keys(ROLES) as RoleKey[]).map((roleName) =>
      prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      }),
    ),
  );
  const roleByName = Object.fromEntries(
    roleRecords.map((r) => [r.name, r]),
  ) as Record<RoleKey, (typeof roleRecords)[number]>;

  console.log("Criando permissões...");
  const permissionRecords = await Promise.all(
    Object.values(PERMISSIONS).map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );
  const permissionByKey = Object.fromEntries(
    permissionRecords.map((p) => [p.key, p]),
  );

  console.log("Vinculando papéis às permissões...");
  // Superadmin recebe todas as permissões.
  for (const permission of permissionRecords) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roleByName.SUPERADMIN.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: roleByName.SUPERADMIN.id,
        permissionId: permission.id,
      },
    });
  }

  for (const [roleName, permissionKeys] of Object.entries(
    DEFAULT_ROLE_PERMISSIONS,
  )) {
    const role = roleByName[roleName as RoleKey];
    for (const key of permissionKeys) {
      const permission = permissionByKey[key];
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL;
  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;

  if (superadminEmail && superadminPassword) {
    console.log(`Criando usuário Superadmin (${superadminEmail})...`);
    const passwordHash = await argon2.hash(superadminPassword, {
      type: argon2.argon2id,
    });

    await prisma.user.upsert({
      where: { email: superadminEmail },
      update: {},
      create: {
        name: "Administrador",
        email: superadminEmail,
        passwordHash,
        roleId: roleByName.SUPERADMIN.id,
        isActive: true,
      },
    });
  } else {
    console.warn(
      "SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD não definidos — nenhum usuário Superadmin foi criado.",
    );
  }

  console.log("Seed concluído.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
