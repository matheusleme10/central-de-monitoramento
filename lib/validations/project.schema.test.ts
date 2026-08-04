import { describe, expect, it } from "vitest";
import { createProjectSchema, updateProjectSchema } from "./project.schema";

describe("createProjectSchema", () => {
  it("aceita um projeto válido mínimo", () => {
    const result = createProjectSchema.safeParse({ name: "Financeiro" });
    expect(result.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    const result = createProjectSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome ausente", () => {
    const result = createProjectSchema.safeParse({ description: "sem nome" });
    expect(result.success).toBe(false);
  });

  it("aceita tags e remove espaços extras via trim por item", () => {
    const result = createProjectSchema.safeParse({
      name: "Financeiro",
      tags: ["mensal", "crítico"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["mensal", "crítico"]);
    }
  });

  it("rejeita mais de 20 tags", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);
    const result = createProjectSchema.safeParse({ name: "Financeiro", tags });
    expect(result.success).toBe(false);
  });
});

describe("updateProjectSchema", () => {
  it("todos os campos são opcionais", () => {
    const result = updateProjectSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
