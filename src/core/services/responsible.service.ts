import "server-only";
import { prisma } from "@/infrastructure/database/prisma";

/**
 * Acha um responsável pelo e-mail (chave de deduplicação) ou cria um novo.
 * Se o nome mudou desde o último cadastro, atualiza também — assim editar
 * "Bruna" para "Bruna Alves" com o mesmo e-mail propaga pra todas as abas
 * dela, em vez de criar um segundo registro.
 */
export async function findOrCreateResponsible(name: string, email: string) {
  return prisma.responsible.upsert({
    where: { email },
    update: { name },
    create: { name, email },
  });
}

export async function listResponsibles() {
  return prisma.responsible.findMany({ orderBy: { name: "asc" } });
}
