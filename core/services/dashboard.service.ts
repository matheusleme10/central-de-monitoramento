import "server-only";
import type { Session } from "next-auth";
import { prisma } from "@/infrastructure/database/prisma";
import { buildProjectFilter } from "@/lib/auth/project-access";
import {
  startOfAppDay,
  startOfAppWeek,
  startOfAppMonth,
  formatToAppTimeZone,
} from "@/lib/timezone";

function sheetScopeWhere(session: Session, projectId?: string) {
  return {
    deletedAt: null,
    spreadsheet: {
      deletedAt: null,
      project: buildProjectFilter(session, projectId),
    },
  };
}

export interface DashboardIndicators {
  projectsCount: number;
  spreadsheetsCount: number;
  sheetsCount: number;
  updatesToday: number;
  updatesWeek: number;
  updatesMonth: number;
  updatesOverdue: number;
  updatesError: number;
  updatesRunning: number;
  neverUpdated: number;
}

/** Um evento por aba — o mais recente — usado para status/atraso/distribuição. */
async function getLatestEventsInScope(session: Session, projectId?: string) {
  return prisma.updateEvent.findMany({
    where: { sheet: sheetScopeWhere(session, projectId) },
    orderBy: { startedAt: "desc" },
    distinct: ["sheetId"],
    select: { sheetId: true, status: true, startedAt: true },
  });
}

export async function getDashboardIndicators(
  session: Session,
  projectId?: string,
): Promise<DashboardIndicators> {
  const projectFilter = buildProjectFilter(session, projectId);
  const scopeWhere = sheetScopeWhere(session, projectId);

  const [
    projectsCount,
    spreadsheetsCount,
    sheetsCount,
    updatesToday,
    updatesWeek,
    updatesMonth,
    neverUpdated,
    latestEvents,
    activeSchedules,
  ] = await Promise.all([
    prisma.project.count({ where: projectFilter }),
    prisma.spreadsheet.count({
      where: { deletedAt: null, project: projectFilter },
    }),
    prisma.sheet.count({ where: scopeWhere }),
    prisma.updateEvent.count({
      where: { startedAt: { gte: startOfAppDay() }, sheet: scopeWhere },
    }),
    prisma.updateEvent.count({
      where: { startedAt: { gte: startOfAppWeek() }, sheet: scopeWhere },
    }),
    prisma.updateEvent.count({
      where: { startedAt: { gte: startOfAppMonth() }, sheet: scopeWhere },
    }),
    prisma.sheet.count({ where: { ...scopeWhere, updateEvents: { none: {} } } }),
    getLatestEventsInScope(session, projectId),
    prisma.schedule.findMany({
      where: { isActive: true, expectedInterval: { not: null }, sheet: scopeWhere },
      select: { sheetId: true, expectedInterval: true },
    }),
  ]);

  type LatestEvent = { sheetId: string; status: string; startedAt: Date };
  type ActiveSchedule = { sheetId: string; expectedInterval: number | null };

  const latestBySheet = new Map(
    (latestEvents as LatestEvent[]).map((e) => [e.sheetId, e]),
  );

  const updatesError = (latestEvents as LatestEvent[]).filter((e) => e.status === "ERROR").length;
  const updatesRunning = (latestEvents as LatestEvent[]).filter((e) => e.status === "RUNNING").length;

  const now = Date.now();
  const updatesOverdue = (activeSchedules as ActiveSchedule[]).filter((schedule) => {
    const latest = latestBySheet.get(schedule.sheetId);
    if (!latest || !schedule.expectedInterval) return false;
    const elapsedMinutes = (now - new Date(latest.startedAt).getTime()) / 60_000;
    return elapsedMinutes > schedule.expectedInterval;
  }).length;

  return {
    projectsCount,
    spreadsheetsCount,
    sheetsCount,
    updatesToday,
    updatesWeek,
    updatesMonth,
    updatesOverdue,
    updatesError,
    updatesRunning,
    neverUpdated,
  };
}

export interface StatusDistributionItem {
  status: "SUCCESS" | "ERROR" | "RUNNING" | "CANCELLED" | "NEVER_UPDATED";
  count: number;
}

export async function getStatusDistribution(
  session: Session,
  projectId?: string,
): Promise<StatusDistributionItem[]> {
  const [latestEvents, sheetsCount] = await Promise.all([
    getLatestEventsInScope(session, projectId),
    prisma.sheet.count({ where: sheetScopeWhere(session, projectId) }),
  ]);

  const counts: Record<string, number> = { SUCCESS: 0, ERROR: 0, RUNNING: 0, CANCELLED: 0 };
  for (const event of latestEvents) {
    counts[event.status] = (counts[event.status] ?? 0) + 1;
  }
  const neverUpdated = sheetsCount - latestEvents.length;

  const items: StatusDistributionItem[] = [
    { status: "SUCCESS", count: counts.SUCCESS },
    { status: "ERROR", count: counts.ERROR },
    { status: "RUNNING", count: counts.RUNNING },
    { status: "CANCELLED", count: counts.CANCELLED },
    { status: "NEVER_UPDATED", count: Math.max(neverUpdated, 0) },
  ];
  return items.filter((item) => item.count > 0);
}

export interface TimeseriesPoint {
  date: string;
  SUCCESS: number;
  ERROR: number;
  RUNNING: number;
  CANCELLED: number;
}

export async function getUpdatesTimeseries(
  session: Session,
  projectId: string | undefined,
  days: number,
): Promise<TimeseriesPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.updateEvent.findMany({
    where: { startedAt: { gte: since }, sheet: sheetScopeWhere(session, projectId) },
    select: { startedAt: true, status: true },
  });

  const buckets = new Map<string, TimeseriesPoint>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = formatToAppTimeZone(date, "dd/MM");
    buckets.set(key, { date: key, SUCCESS: 0, ERROR: 0, RUNNING: 0, CANCELLED: 0 });
  }

  for (const event of events) {
    const key = formatToAppTimeZone(event.startedAt, "dd/MM");
    const bucket = buckets.get(key);
    if (bucket) {
      bucket[event.status as keyof Omit<TimeseriesPoint, "date">] += 1;
    }
  }

  return Array.from(buckets.values());
}

export interface LiveAlert {
  sheetId: string;
  type: "OVERDUE" | "ERROR";
  severity: "WARNING" | "CRITICAL";
  message: string;
  sheetName: string;
  spreadsheetName: string;
  projectId: string;
  projectName: string;
  spreadsheetDbId: string;
}

export async function getLiveAlerts(
  session: Session,
  projectId?: string,
): Promise<LiveAlert[]> {
  const [latestEvents, activeSchedules] = await Promise.all([
    prisma.updateEvent.findMany({
      where: { sheet: sheetScopeWhere(session, projectId) },
      orderBy: { startedAt: "desc" },
      distinct: ["sheetId"],
      include: {
        sheet: {
          include: { spreadsheet: { include: { project: true } } },
        },
      },
    }),
    prisma.schedule.findMany({
      where: { isActive: true, expectedInterval: { not: null }, sheet: sheetScopeWhere(session, projectId) },
      select: { sheetId: true, expectedInterval: true },
    }),
  ]);

  type ActiveScheduleRow = { sheetId: string; expectedInterval: number | null };
  const scheduleBySheet = new Map(
    (activeSchedules as ActiveScheduleRow[]).map((s) => [s.sheetId, s.expectedInterval!]),
  );
  const now = Date.now();
  const alerts: LiveAlert[] = [];

  for (const event of latestEvents) {
    const base = {
      sheetId: event.sheet.id,
      sheetName: event.sheet.friendlyName || event.sheet.name,
      spreadsheetName: event.sheet.spreadsheet.friendlyName || event.sheet.spreadsheet.name,
      spreadsheetDbId: event.sheet.spreadsheet.id,
      projectId: event.sheet.spreadsheet.project.id,
      projectName: event.sheet.spreadsheet.project.name,
    };

    if (event.status === "ERROR") {
      alerts.push({
        ...base,
        type: "ERROR",
        severity: "CRITICAL",
        message: event.message || event.errorCode || "Última execução falhou",
      });
    }

    const expectedInterval = scheduleBySheet.get(event.sheet.id);
    if (expectedInterval) {
      const elapsedMinutes = (now - event.startedAt.getTime()) / 60_000;
      if (elapsedMinutes > expectedInterval) {
        alerts.push({
          ...base,
          type: "OVERDUE",
          severity: "WARNING",
          message: `Esperado a cada ${expectedInterval} min — última execução há ${Math.round(
            elapsedMinutes,
          )} min`,
        });
      }
    }
  }

  return alerts;
}
