import { z } from "zod";

/** Extrai o Spreadsheet ID a partir de uma URL do Google Sheets, se aplicável. */
function extractSpreadsheetId(value: string): string {
  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : value;
}

export const createSpreadsheetSchema = z.object({
  url: z.string().trim().url("Informe uma URL válida do Google Sheets"),
  spreadsheetId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  friendlyName: z.string().trim().max(200).optional().or(z.literal("")),
});

export const createSpreadsheetInputSchema = createSpreadsheetSchema.transform((data) => ({
  ...data,
  spreadsheetId: data.spreadsheetId?.length
    ? data.spreadsheetId
    : extractSpreadsheetId(data.url),
}));

export const updateSpreadsheetSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  friendlyName: z.string().trim().max(200).optional().or(z.literal("")),
  url: z.string().trim().url().optional(),
});

export type CreateSpreadsheetInput = z.infer<typeof createSpreadsheetSchema>;
export type UpdateSpreadsheetInput = z.infer<typeof updateSpreadsheetSchema>;
