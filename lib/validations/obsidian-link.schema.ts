import { z } from "zod";

export const createObsidianLinkSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    sheetId: z.string().uuid().optional(),
    type: z.enum(["MARKDOWN", "URI"]),
    value: z.string().trim().min(1, "Informe o caminho/URI").max(500),
  })
  .refine((data) => Boolean(data.projectId) !== Boolean(data.sheetId), {
    message: "Informe projectId OU sheetId (nunca os dois nem nenhum)",
    path: ["projectId"],
  });

export type CreateObsidianLinkInput = z.infer<typeof createObsidianLinkSchema>;
