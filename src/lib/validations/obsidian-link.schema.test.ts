import { describe, expect, it } from "vitest";
import { createObsidianLinkSchema } from "./obsidian-link.schema";

const PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
const SHEET_ID = "660e8400-e29b-41d4-a716-446655440000";

describe("createObsidianLinkSchema", () => {
  it("aceita link de projeto do tipo URI", () => {
    const result = createObsidianLinkSchema.safeParse({
      projectId: PROJECT_ID,
      type: "URI",
      value: "obsidian://open?vault=MeuVault",
    });
    expect(result.success).toBe(true);
  });

  it("aceita link de aba do tipo MARKDOWN", () => {
    const result = createObsidianLinkSchema.safeParse({
      sheetId: SHEET_ID,
      type: "MARKDOWN",
      value: "Projetos/aba.md",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando projectId e sheetId são informados juntos", () => {
    const result = createObsidianLinkSchema.safeParse({
      projectId: PROJECT_ID,
      sheetId: SHEET_ID,
      type: "URI",
      value: "obsidian://open",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando nem projectId nem sheetId são informados", () => {
    const result = createObsidianLinkSchema.safeParse({
      type: "URI",
      value: "obsidian://open",
    });
    expect(result.success).toBe(false);
  });
});
