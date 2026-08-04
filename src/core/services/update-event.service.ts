import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import type { RecordUpdateEventInput } from "@/lib/validations/update-event.schema";

/**
 * Registra um evento de execução vindo do Apps Script.
 *
 * Auto-registra Planilha e Aba na primeira vez que o painel as vê (o
 * Apps Script não deve ficar bloqueado esperando um cadastro manual — ver
 * `apps-script/central-monitoramento.gs.js`). Cadastros manuais feitos via
 * UI (Fase 2) continuam funcionando normalmente; o auto-registro só
 * preenche nome/URL quando o registro ainda não existe.
 *
 * O evento é identificado por `(sheetId, executionId)`: a primeira chamada
 * (status RUNNING) cria o registro; chamadas seguintes com o mesmo
 * `executionId` (SUCCESS/ERROR/CANCELLED) atualizam o mesmo registro.
 */
export async function recordUpdateEvent(input: RecordUpdateEventInput) {
  const spreadsheet = await prisma.spreadsheet.upsert({
    where: {
      projectId_spreadsheetId: {
        projectId: input.projectId,
        spreadsheetId: input.spreadsheetId,
      },
    },
    update: {},
    create: {
      projectId: input.projectId,
      spreadsheetId: input.spreadsheetId,
      name: input.spreadsheetName,
      url: `https://docs.google.com/spreadsheets/d/${input.spreadsheetId}/edit`,
    },
  });

  const sheet = await prisma.sheet.upsert({
    where: {
      spreadsheetId_gid: {
        spreadsheetId: spreadsheet.id,
        gid: input.sheetId,
      },
    },
    update: {},
    create: {
      spreadsheetId: spreadsheet.id,
      gid: input.sheetId,
      name: input.sheetName,
      url: `${spreadsheet.url}#gid=${input.sheetId}`,
    },
  });

  const durationMs =
    input.duration ??
    (input.finishedAt
      ? input.finishedAt.getTime() - input.startedAt.getTime()
      : undefined);

  const event = await prisma.updateEvent.upsert({
    where: {
      sheetId_executionId: { sheetId: sheet.id, executionId: input.executionId },
    },
    update: {
      finishedAt: input.finishedAt,
      durationMs,
      rowsProcessed: input.rowsProcessed,
      status: input.status,
      message: input.message,
      errorCode: input.errorCode,
    },
    create: {
      sheetId: sheet.id,
      executionId: input.executionId,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      durationMs,
      rowsProcessed: input.rowsProcessed,
      status: input.status,
      message: input.message,
      errorCode: input.errorCode,
    },
  });

  return { spreadsheet, sheet, event };
}

export async function listUpdateEventsBySheet(sheetId: string, take = 50) {
  return prisma.updateEvent.findMany({
    where: { sheetId },
    orderBy: { startedAt: "desc" },
    take,
  });
}

export async function getLatestEventPerSheet(sheetIds: string[]) {
  if (sheetIds.length === 0) return new Map();

  const events = await prisma.updateEvent.findMany({
    where: { sheetId: { in: sheetIds } },
    orderBy: { startedAt: "desc" },
  });

  const latestBySheet = new Map<string, (typeof events)[number]>();
  for (const event of events) {
    if (!latestBySheet.has(event.sheetId)) {
      latestBySheet.set(event.sheetId, event);
    }
  }
  return latestBySheet;
}
