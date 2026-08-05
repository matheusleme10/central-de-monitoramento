import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import { hashPassword, verifyPassword } from "@/infrastructure/auth/password";
import type {
  ChangePasswordInput,
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/validations/user.schema";

const SELECT_SAFE_FIELDS = {
  id: true,
  name: true,
  email: true,
  image: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: SELECT_SAFE_FIELDS,
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: SELECT_SAFE_FIELDS,
  });
}

export async function createUser(input: CreateUserInput, invitedBy: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: input.role } });
  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      roleId: role.id,
      invitedBy,
    },
    select: SELECT_SAFE_FIELDS,
  });
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.role !== undefined) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: input.role } });
    data.roleId = role.id;
  }
  if (input.password) {
    data.passwordHash = await hashPassword(input.password);
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: SELECT_SAFE_FIELDS,
  });
}

/**
 * Troca de senha self-service (a própria pessoa logada, não um admin
 * editando outra conta — esse fluxo é `updateUser`). Retorna `false` se a
 * senha atual não confere, sem lançar exceção — evita vazar detalhes
 * internos e deixa o Route Handler decidir o status HTTP (400).
 */
export async function changeOwnPassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) return false;

  const isCurrentPasswordValid = await verifyPassword(
    user.passwordHash,
    input.currentPassword,
  );
  if (!isCurrentPasswordValid) return false;

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return true;
}

export async function softDeleteUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  });
}
