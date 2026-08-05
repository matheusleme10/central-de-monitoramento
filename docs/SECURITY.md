# Segurança — Central de Monitoramento de Atualizações

Checklist da especificação original, com o que está implementado e onde.
Revisado na Fase 6 (Finalização); mantenha este documento atualizado ao
adicionar novas rotas ou integrações.

## Autenticação e senhas

- **Argon2id** para hash de senha (`src/infrastructure/auth/password.ts`).
  Nunca comparação de texto puro, nunca senha em log.
- **Sem cadastro público** — usuários só são criados por um administrador
  (`user:manage`) ou pelo seed inicial.
- **Rate limiting no login** — 5 tentativas por minuto por combinação
  IP + e-mail (`src/infrastructure/auth/auth.config.ts`, usando
  `src/lib/security/rate-limit.ts`). A resposta não diferencia "usuário não
  existe" de "senha incorreta", evitando enumeração de contas.
- **Sessão JWT** (exigência do Credentials provider no Auth.js), cookies
  `HttpOnly`, `Secure` em produção, `SameSite=lax` — padrão do Auth.js, não
  sobrescrito.

## CSRF

Protegido nativamente pelas rotas internas do Auth.js
(`/api/auth/csrf` + cookie de duplo envio). Rotas de mutação em
`/api/v1/*` são autenticadas por sessão (cookie `HttpOnly`) ou por API
Token (`Authorization: Bearer`) — nunca aceitam apenas parâmetros de URL
para autorizar uma escrita.

## XSS

- React escapa toda interpolação por padrão; **nenhum uso de
  `dangerouslySetInnerHTML`** em todo o código-fonte (verificado nesta
  fase).
- Header `Content-Security-Policy` (`next.config.ts`) bloqueia carregamento
  de scripts/estilos/imagens de origens não listadas. Observação: usa
  `'unsafe-inline'` em `script-src` porque o Next.js App Router injeta
  scripts inline de hidratação sem nonce nesta configuração — evolução
  natural seria gerar um nonce por requisição via middleware.

## SQL Injection

100% das consultas passam pelo Prisma Client com parâmetros tipados
(`prisma.model.findMany({ where: ... })`); **nenhuma consulta usa
`$queryRawUnsafe`/`$executeRawUnsafe`** (verificado nesta fase — únicas
ocorrências de SQL "raw" seriam essas, e não há nenhuma).

## Validação e sanitização

- **Zod** em toda entrada de rota (`src/lib/validations/*.schema.ts`) —
  Route Handlers nunca confiam em `request.json()` sem `schema.parse()`.
- Campos de texto livre (descrição, mensagem de erro do Apps Script) são
  armazenados como texto puro e escapados na renderização pelo React —
  nunca interpretados como HTML/Markdown executável.

## Autorização (RBAC)

- Toda leitura/escrita em `/api/v1/*` passa por `requirePermission()` ou
  `requireRole()` (`src/lib/auth/guards.ts`) — **nunca** apenas por
  middleware ou checagem no cliente.
- Acesso a projeto é revalidado no servidor a cada rota
  (`assertProjectAccess`/`buildProjectFilter`,
  `src/lib/auth/project-access.ts`) — Superadmin/Admin veem tudo; os
  demais, apenas onde são `ProjectMember`.
- O middleware (`src/middleware.ts`) roda no Edge Runtime e por isso
  **não** decodifica a sessão (evitaria trazer Argon2/Prisma para o Edge)
  — apenas confere a presença do cookie de sessão como primeira barreira.
  A autorização real acontece sempre no servidor Node.js.

## Tokens e segredos

- Tokens de API (`api_tokens`): gerados uma única vez, armazenados como
  **hash SHA-256** (nunca texto puro); listagem mostra apenas
  `token_preview` (últimos 4 caracteres).
- Segredos de ambiente (`AUTH_SECRET`, `DATABASE_URL`) apenas via
  variáveis de ambiente (`src/lib/env.ts`
  valida com Zod na inicialização); `.env.example` nunca contém valores
  reais.
- Logs de auditoria (`audit_logs`) nunca incluem senha, token em texto
  puro ou hash — apenas metadados não sensíveis (ver
  `src/core/services/audit-log.service.ts` e os comentários nas rotas que
  o chamam).

## Rate limiting

- Login por credenciais: 5/min por IP+e-mail.
- `POST /api/v1/updates` (ingestão do Apps Script): 120/min por token.
- Implementação em memória (`src/lib/security/rate-limit.ts`), válida para
  uma única instância. Em deploy multi-instância, trocar por um backend
  compartilhado (Redis/Upstash) — a assinatura da função foi mantida
  mínima de propósito para essa troca não exigir mudanças nos chamadores.

## Headers de segurança

Aplicados a todas as respostas (`next.config.ts`):
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`X-DNS-Prefetch-Control: off`, `Permissions-Policy`,
`Strict-Transport-Security` e `Content-Security-Policy`.

## Auditoria

Ver seção "Auditoria" do README principal e
`src/core/services/audit-log.service.ts`. Todas as mutações relevantes
(projetos, planilhas, abas, usuários, permissões, tokens de API, links
Obsidian) gravam em `audit_logs`, incluindo IP do requisitante. A gravação
nunca bloqueia a operação principal em caso de falha.

## Pendências conhecidas (fora do escopo deste projeto de exemplo)

- Rate limiting compartilhado entre instâncias (requer Redis/Upstash).
- CSP com nonce por requisição (requer geração de nonce no middleware).
- 2FA / MFA não implementado.
- Rotação automática de `AUTH_SECRET` e tokens de API não implementada.
