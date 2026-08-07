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

interface ResponsibleInput {
  name: string;
  email: string;
}

/**
 * Substitui a lista de responsáveis de uma aba pela informada: cria os que
 * faltam (ou reaproveita pelo e-mail), remove os vínculos que não estão
 * mais na lista. Não apaga o registro de `Responsible` em si — só o
 * vínculo com essa aba — porque a pessoa pode ser responsável por outras.
 */
export async function syncSheetResponsibles(sheetId: string, responsibles: ResponsibleInput[]) {
  const deduped = new Map<string, ResponsibleInput>();
  for (const r of responsibles) {
    const email = r.email.trim().toLowerCase();
    const name = r.name.trim();
    if (email && name) deduped.set(email, { name, email });
  }

  const resolved = await Promise.all(
    Array.from(deduped.values()).map((r) => findOrCreateResponsible(r.name, r.email)),
  );
  const responsibleIds = resolved.map((r) => r.id);

  await prisma.$transaction([
    prisma.sheetResponsible.deleteMany({
      where: { sheetId, responsibleId: { notIn: responsibleIds } },
    }),
    ...responsibleIds.map((responsibleId) =>
      prisma.sheetResponsible.upsert({
        where: { sheetId_responsibleId: { sheetId, responsibleId } },
        update: {},
        create: { sheetId, responsibleId },
      }),
    ),
  ]);

  return resolved;
}
