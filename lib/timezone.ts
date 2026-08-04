import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

/**
 * Todas as datas são persistidas em UTC no banco de dados.
 * Estas funções centralizam a conversão para o fuso de exibição
 * (America/Sao_Paulo), evitando conversões manuais espalhadas pela UI.
 */
export const APP_TIME_ZONE = "America/Sao_Paulo";

export function formatToAppTimeZone(
  date: Date | string,
  pattern: string = "dd/MM/yyyy HH:mm:ss",
): string {
  return formatInTimeZone(date, APP_TIME_ZONE, pattern);
}

export function toAppTimeZoneDate(date: Date | string): Date {
  return toZonedTime(date, APP_TIME_ZONE);
}

/**
 * Boundaries (em UTC) do início do dia/semana/mês, calculados em relação
 * ao fuso America/Sao_Paulo — usados pelos indicadores do Dashboard
 * ("atualizações de hoje/semana/mês").
 */
export function startOfAppDay(reference: Date = new Date()): Date {
  const zoned = toZonedTime(reference, APP_TIME_ZONE);
  return fromZonedTime(startOfDay(zoned), APP_TIME_ZONE);
}

export function startOfAppWeek(reference: Date = new Date()): Date {
  const zoned = toZonedTime(reference, APP_TIME_ZONE);
  return fromZonedTime(startOfWeek(zoned, { weekStartsOn: 1 }), APP_TIME_ZONE);
}

export function startOfAppMonth(reference: Date = new Date()): Date {
  const zoned = toZonedTime(reference, APP_TIME_ZONE);
  return fromZonedTime(startOfMonth(zoned), APP_TIME_ZONE);
}
