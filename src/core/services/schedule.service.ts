import "server-only";
import { prisma } from "@/infrastructure/database/prisma";
import type { UpsertScheduleInput } from "@/lib/validations/schedule.schema";

export async function getScheduleBySheet(sheetId: string) {
  return prisma.schedule.findUnique({ where: { sheetId } });
}

export async function upsertSchedule(sheetId: string, input: UpsertScheduleInput) {
  return prisma.schedule.upsert({
    where: { sheetId },
    update: { expectedInterval: input.expectedInterval, isActive: input.isActive },
    create: {
      sheetId,
      expectedInterval: input.expectedInterval,
      isActive: input.isActive,
    },
  });
}
