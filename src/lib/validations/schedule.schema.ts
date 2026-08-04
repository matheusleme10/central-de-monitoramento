import { z } from "zod";

export const upsertScheduleSchema = z.object({
  expectedInterval: z.coerce.number().int().positive().max(60 * 24 * 30).nullable(),
  isActive: z.boolean().default(true),
});

export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>;
