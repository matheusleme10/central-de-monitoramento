import "server-only";
import type { NextRequest } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getClientIp } from "@/lib/security/client-ip";

interface RecordAuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}

/**
 * Grava um registro de auditoria. Nunca lança exceção nem bloqueia a
 * operação principal — uma falha ao gravar o log de auditoria não pode
 * impedir a mutação real de acontecer. Nunca inclua segredos (senha,
 * token, hash) em `metadata`.
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        ipAddress: params.request ? getClientIp(params.request) : null,
      },
    });
  } catch (error) {
    console.error("Falha ao gravar audit log:", error);
  }
}

export async function listAuditLogs(options: { entityType?: string; take?: number } = {}) {
  return prisma.auditLog.findMany({
    where: options.entityType ? { entityType: options.entityType } : undefined,
    orderBy: { createdAt: "desc" },
    take: options.take ?? 100,
    include: { user: { select: { name: true, email: true } } },
  });
}
