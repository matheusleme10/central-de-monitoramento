import { z } from "zod";

// Máximo generoso (~1 ano em minutos) pra cobrir presets trimestrais/anuais
// sem travar o campo "Personalizado".
export const upsertScheduleSchema = z.object({
  expectedInterval: z.coerce.number().int().positive().max(60 * 24 * 366).nullable(),
  isActive: z.boolean().default(true),
});

export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>;
