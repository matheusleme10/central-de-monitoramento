import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  formatToAppTimeZone,
  startOfAppDay,
  startOfAppWeek,
  startOfAppMonth,
} from "./timezone";

/** Extrai partes da data em America/Sao_Paulo sem depender da nossa própria implementação. */
function partsInAppZone(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return parts;
}

describe("startOfAppDay", () => {
  it("retorna meia-noite em America/Sao_Paulo (UTC-3, sem horário de verão)", () => {
    // 2026-08-04T02:30:00Z == 2026-08-03T23:30:00 em America/Sao_Paulo
    const reference = new Date("2026-08-04T02:30:00.000Z");
    const boundary = startOfAppDay(reference);

    expect(boundary.toISOString()).toBe("2026-08-03T03:00:00.000Z");

    const parts = partsInAppZone(boundary);
    expect(`${parts.hour}:${parts.minute}:${parts.second}`).toBe("00:00:00");
    expect(`${parts.year}-${parts.month}-${parts.day}`).toBe("2026-08-03");
  });
});

describe("startOfAppWeek", () => {
  it("retorna a segunda-feira (weekStartsOn: 1) à meia-noite local", () => {
    const reference = new Date("2026-08-06T15:00:00.000Z"); // quinta-feira à tarde
    const boundary = startOfAppWeek(reference);
    const parts = partsInAppZone(boundary);

    expect(parts.weekday).toBe("Mon");
    expect(`${parts.hour}:${parts.minute}:${parts.second}`).toBe("00:00:00");
    expect(boundary.getTime()).toBeLessThanOrEqual(reference.getTime());
  });
});

describe("startOfAppMonth", () => {
  it("retorna o primeiro dia do mês à meia-noite local", () => {
    const reference = new Date("2026-08-20T15:00:00.000Z");
    const boundary = startOfAppMonth(reference);
    const parts = partsInAppZone(boundary);

    expect(parts.day).toBe("01");
    expect(parts.month).toBe("08");
    expect(`${parts.hour}:${parts.minute}:${parts.second}`).toBe("00:00:00");
  });
});

describe("formatToAppTimeZone", () => {
  it("formata usando o padrão dd/MM/yyyy HH:mm:ss por padrão", () => {
    const date = new Date("2026-08-04T02:30:00.000Z");
    expect(formatToAppTimeZone(date)).toBe("03/08/2026 23:30:00");
  });

  it("aceita um padrão customizado", () => {
    const date = new Date("2026-08-04T02:30:00.000Z");
    expect(formatToAppTimeZone(date, "dd/MM")).toBe("03/08");
  });
});
