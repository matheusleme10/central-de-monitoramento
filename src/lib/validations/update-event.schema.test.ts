import { describe, expect, it } from "vitest";
import { recordUpdateEventSchema } from "./update-event.schema";

const basePayload = {
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  spreadsheetId: "1a2b3c",
  spreadsheetName: "Planilha de Vendas",
  sheetName: "Página1",
  executionId: "exec-001",
  startedAt: "2026-08-04T12:00:00.000Z",
  status: "RUNNING",
};

describe("recordUpdateEventSchema", () => {
  it("aceita payload mínimo válido com sheetId numérico do Google Sheets", () => {
    const result = recordUpdateEventSchema.safeParse({ ...basePayload, sheetId: 0 });
    expect(result.success).toBe(true);
    if (result.success) {
      // sheetId numérico é convertido para string (mapeado para Sheet.gid)
      expect(result.data.sheetId).toBe("0");
    }
  });

  it("aceita sheetId já como string", () => {
    const result = recordUpdateEventSchema.safeParse({ ...basePayload, sheetId: "123456789" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sheetId).toBe("123456789");
    }
  });

  it("rejeita projectId que não é UUID", () => {
    const result = recordUpdateEventSchema.safeParse({
      ...basePayload,
      sheetId: "0",
      projectId: "não-é-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita status fora do enum", () => {
    const result = recordUpdateEventSchema.safeParse({
      ...basePayload,
      sheetId: "0",
      status: "FINALIZADO",
    });
    expect(result.success).toBe(false);
  });

  it("aceita finishedAt, rowsProcessed e duration opcionais quando ausentes", () => {
    const result = recordUpdateEventSchema.safeParse({ ...basePayload, sheetId: "0" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.finishedAt).toBeUndefined();
      expect(result.data.rowsProcessed).toBeUndefined();
    }
  });

  it("converte startedAt em Date", () => {
    const result = recordUpdateEventSchema.safeParse({ ...basePayload, sheetId: "0" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startedAt).toBeInstanceOf(Date);
    }
  });
});
