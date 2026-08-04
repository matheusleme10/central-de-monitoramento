import { z } from "zod";

/**
 * Payload enviado pela biblioteca do Apps Script (ver `apps-script/`).
 * `sheetId` aqui é o ID numérico nativo do Google Sheets (sheet.getSheetId()),
 * equivalente ao `gid` usado nas URLs — mapeado para `Sheet.gid` no banco.
 */
export const recordUpdateEventSchema = z.object({
  projectId: z.string().uuid(),
  spreadsheetId: z.string().trim().min(1),
  spreadsheetName: z.string().trim().min(1).max(200),
  sheetId: z.union([z.string(), z.number()]).transform((v) => String(v)),
  sheetName: z.string().trim().min(1).max(200),
  executionId: z.string().trim().min(1).max(200),
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().optional(),
  rowsProcessed: z.coerce.number().int().nonnegative().optional(),
  duration: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(["RUNNING", "SUCCESS", "ERROR", "CANCELLED"]),
  message: z.string().trim().max(2000).optional(),
  errorCode: z.string().trim().max(120).optional(),
});

export type RecordUpdateEventInput = z.infer<typeof recordUpdateEventSchema>;
