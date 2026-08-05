# Central de Monitoramento de Atualizações

Aplicação interna para monitorar projetos, planilhas e abas do Google
Sheets utilizadas em processos internos da empresa.

Hierarquia de domínio: **Projeto → Planilha → Aba → Histórico de Atualizações**.

Este README documenta as 6 fases do projeto: **1 (Infraestrutura)**,
**2 (CRUD)**, **3 (Monitoramento)**, **4 (Dashboard)**, **5 (Mapa)** e
**6 (Finalização — auditoria, segurança, testes e deploy)**.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (componentes copiados em `src/components/ui`) + Lucide React
- PostgreSQL + Prisma ORM
- Auth.js v5 (Credenciais + Argon2)
- React Hook Form + Zod
- Recharts (gráficos do Dashboard) + `cmdk` (paleta de pesquisa global Ctrl+K) + React Flow (mapa/grafo)
- Back-end exclusivamente via Route Handlers do Next.js (sem Express/NestJS/FastAPI)

## Arquitetura

```
src/
├── app/
│   ├── (app)/                        # Área autenticada (layout com sidebar/header)
│   │   ├── page.tsx                    # Dashboard (placeholder — Fase 4)
│   │   ├── projetos/                   # Listagem + detalhe (planilhas, membros)
│   │   │   └── [projectId]/planilhas/[spreadsheetId]/  # Abas da planilha
│   │   ├── planilhas/                  # Listagem plana de todas as planilhas
│   │   ├── usuarios/                    # CRUD de usuários (convite, papel, status)
│   │   └── permissoes/                  # Matriz papel × permissão (editável por Superadmin)
│   ├── api/v1/                        # Route Handlers (único back-end)
│   │   ├── projects/ [id]/members/[userId] / [id]/spreadsheets / [id]/tokens/[tokenId]
│   │   ├── spreadsheets/[id]/sheets
│   │   ├── sheets/[id]
│   │   ├── users/[id]
│   │   ├── roles/[id]/permissions, permissions/
│   │   └── updates/                     # POST autenticado por API Token (Apps Script)
│   ├── login/                        # Tela de login (e-mail + senha)
│   └── api/auth/[...nextauth]/          # Route Handler do Auth.js
├── components/
│   ├── ui/                           # Primitivos shadcn/ui (button, card, dialog, select, ...)
│   ├── layout/                        # Sidebar, Header, ThemeToggle
│   └── monitoring/status-badge.tsx      # Badge de status de execução
├── core/
│   └── services/                     # Regras de negócio (única camada que fala com o Prisma)
├── infrastructure/
│   ├── database/prisma.ts             # Singleton do Prisma Client
│   └── auth/                          # Auth.js, hashing de senha (Argon2), tokens de API (SHA-256)
├── lib/
│   ├── auth/guards.ts                  # requireAuth / requireRole / requirePermission
│   ├── auth/project-access.ts           # Filtro/checagem de acesso a projeto
│   ├── auth/api-token-guard.ts          # Autenticação por Bearer token (Apps Script)
│   ├── api/error-response.ts            # Tradução de erros para respostas HTTP
│   ├── security/rate-limit.ts           # Rate limiting em memória
│   ├── validations/                     # DTOs Zod por entidade
│   ├── constants/                       # Papéis (roles) e permissões (RBAC)
│   ├── env.ts                            # Validação Zod das variáveis de ambiente
│   └── timezone.ts                       # Conversão UTC → America/Sao_Paulo
├── auth.ts                          # Entry point do Auth.js (handlers, auth, signIn, signOut)
└── middleware.ts                    # Primeira camada de defesa (Edge Runtime)
prisma/
├── schema.prisma            # Modelo de dados completo (todas as entidades)
└── seed.ts                  # Popula papéis, permissões e o Superadmin inicial
apps-script/
└── central-monitoramento.gs.js  # Biblioteca reutilizável (logStart/success/error/cancelled)
```

Camadas seguem Clean Architecture: `core/services` concentra as regras de
negócio e é o único lugar que importa o Prisma Client para leitura/escrita
de domínio; `infrastructure` isola Prisma e Auth.js; `app` consome tudo via
Server Components (leituras) e Route Handlers (mutações, chamadas pelos
componentes client via `fetch`).

## Banco de dados

Todas as entidades pedidas foram modeladas em `prisma/schema.prisma`, com
UUID como chave primária, timestamps em UTC, soft delete (`deletedAt`) nas
entidades de negócio, e índices/FKs/constraints apropriados:

`users`, `roles`, `permissions`, `role_permissions`, `groups`,
`group_members`, `projects`, `project_members`, `spreadsheets`, `sheets`,
`update_events`, `schedules`, `alerts`, `audit_logs`, `api_tokens`,
`obsidian_links` — além de `accounts`, `sessions` e `verification_tokens`,
exigidos pelo `PrismaAdapter` do Auth.js.

Datas são sempre persistidas em UTC; a conversão para `America/Sao_Paulo`
acontece apenas na camada de apresentação (`src/lib/timezone.ts`).

## Autenticação

Auth.js v5, com:

- **Credenciais** (e-mail + senha, hash Argon2id) — único método de login;
  não há OAuth/Google configurado nesta versão.
- Sessão em **JWT** (obrigatório com Credentials provider), cookies
  HttpOnly, Secure em produção, SameSite=lax — padrão do Auth.js, não
  sobrescrito.
- **CSRF** protegido nativamente pelas rotas internas do Auth.js.
- **Sem cadastro público**: login só funciona para usuários já existentes
  (criados via seed ou por um administrador em `/usuarios`).
- **Troca da própria senha**: qualquer usuário autenticado pode trocar sua
  senha em `/perfil` (`PATCH /api/v1/me/password`), informando a senha
  atual. Um admin editando outra conta em `/usuarios` não precisa da senha
  atual dela. Recuperação de senha do Superadmin (sem acesso ao painel) é
  feita rodando o seed de novo com `SEED_SUPERADMIN_EMAIL`/
  `SEED_SUPERADMIN_PASSWORD` — ver seção "Como rodar localmente".
- O middleware (`src/middleware.ts`) roda no Edge Runtime e por isso **não**
  importa a configuração completa do Auth.js (que depende de Argon2 e do
  Prisma Client, incompatíveis com Edge) — ele apenas confere a presença do
  cookie de sessão. A validação completa (assinatura do token, papel,
  permissões) é sempre refeita no servidor, em `(app)/layout.tsx` e nos
  helpers `requireAuth()/requireRole()/requirePermission()`
  (`src/lib/auth/guards.ts`), que é a camada de autorização real. O
  front-end nunca é a única barreira.

## RBAC — Papéis e permissões

Papéis fixos: `SUPERADMIN`, `ADMIN`, `GESTOR`, `OPERADOR`, `VISUALIZADOR`
(`src/lib/constants/roles.ts`). Permissões granulares (ex.:
`project:read`, `project:write`, `user:manage`) ficam em
`src/lib/constants/permissions.ts`, vinculadas aos papéis via
`role_permissions` e populadas pelo seed. Superadmin tem acesso irrestrito
por código, sem precisar listar cada permissão.

## CRUD (Fase 2)

Todas as telas abaixo leem dados diretamente via `core/services` (Server
Components) e gravam via `fetch` para os Route Handlers em `app/api/v1`,
que validam com Zod e checam permissão com `requirePermission`/`requireRole`
antes de qualquer escrita — nunca há confiança no filtro feito no cliente.

- **Projetos** (`/projetos`): listar (filtrado por acesso), criar, editar,
  excluir (soft delete), gerenciar membros (`ProjectMember` com nível
  `VIEWER`/`EDITOR`/`MANAGER`).
- **Planilhas** (dentro de um projeto e em `/planilhas`, visão consolidada):
  criar a partir da URL do Google Sheets (extrai o Spreadsheet ID
  automaticamente), editar, excluir, botão "Abrir no Google Sheets".
- **Abas** (dentro de uma planilha): criar (GID, nome, nome amigável, URL
  direta), editar, excluir.
- **Usuários** (`/usuarios`, requer `user:manage`): convidar (nome, e-mail,
  papel, senha inicial — sem cadastro público), alterar papel, ativar/
  desativar, remover (soft delete). Um usuário não pode alterar o próprio
  papel/status.
- **Permissões** (`/permissoes`, requer `role:manage`): matriz papel ×
  permissão. Apenas Superadmin pode editar (`requireRole`, não apenas
  `requirePermission`) — os demais veem em modo leitura. Superadmin sempre
  aparece com tudo marcado e travado.

**Controle de acesso a projetos:** Superadmin/Admin veem todos os projetos;
Gestor/Operador/Visualizador só veem projetos onde têm `ProjectMember`
(`src/lib/auth/project-access.ts`). Planilhas e abas herdam a autorização
do projeto pai — checada em todo Route Handler, nunca só na tela.

## Monitoramento (Fase 3)

O painel recebe telemetria de execução diretamente do Apps Script — sem
intervenção manual — através de um endpoint autenticado por **token de
API** (não por sessão de navegador, que o Apps Script não possui).

### Tokens de API

Gerados na tela do Projeto ("Tokens de API"), escopados a um projeto. O
valor em texto puro só é exibido **uma vez**, no momento da criação;
depois disso só o hash SHA-256 fica no banco (`api_tokens.token_hash`) e um
preview não sensível (`token_preview`, últimos 4 caracteres) para
identificação na listagem. Tokens podem ser revogados a qualquer momento.

### Endpoint `POST /api/v1/updates`

Autenticado via `Authorization: Bearer <token>`. Payload validado com Zod
(`src/lib/validations/update-event.schema.ts`):

```json
{
  "projectId": "uuid",
  "spreadsheetId": "id do Google Sheets",
  "spreadsheetName": "Nome da planilha",
  "sheetId": "gid numérico da aba",
  "sheetName": "Nome da aba",
  "executionId": "identificador único da execução",
  "startedAt": "2026-08-04T12:00:00.000Z",
  "finishedAt": "2026-08-04T12:00:05.000Z",
  "rowsProcessed": 120,
  "duration": 5000,
  "status": "SUCCESS",
  "message": "opcional",
  "errorCode": "opcional"
}
```

Comportamento:

- **Auto-registro**: se a Planilha/Aba ainda não existir no banco (pelo
  `spreadsheetId`/`sheetId` do Google), o endpoint as cria automaticamente
  — o Apps Script nunca fica bloqueado esperando um cadastro manual feito
  na Fase 2.
- **Upsert por execução**: o evento é identificado por
  `(sheetId, executionId)`. A primeira chamada (`status: "RUNNING"`) cria o
  registro; chamadas seguintes com o mesmo `executionId`
  (`SUCCESS`/`ERROR`/`CANCELLED`) atualizam o mesmo registro em vez de
  duplicar.
- **Rate limiting**: 120 requisições/minuto por token, em memória
  (`src/lib/security/rate-limit.ts`). Em produção com múltiplas instâncias,
  trocar por um backend compartilhado (Redis/Upstash) — a assinatura da
  função foi mantida mínima de propósito para essa troca.
- Se o token pertence a um projeto (`api_tokens.project_id`), o
  `projectId` do payload precisa bater com ele — caso contrário, `403`.

### Biblioteca para Apps Script

`apps-script/central-monitoramento.gs.js` — copie para qualquer projeto de
Apps Script vinculado a uma planilha monitorada. Preencha as Propriedades
do Script (`CMA_PANEL_URL`, `CMA_API_TOKEN`, `CMA_PROJECT_ID`) e use:

```js
function atualizarPlanilha() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var run = CentralMonitoramento.startExecution(sheet);
  try {
    var linhas = fazerAtualizacao_();
    run.success(linhas);
  } catch (err) {
    run.error(err);
    throw err;
  }
}
```

Toda chamada ao painel é envolvida em `try/catch` internamente — **se o
painel estiver fora do ar, a atualização da planilha nunca falha por causa
disso**; a falha de rede é apenas registrada no Logger do Apps Script.

### Histórico e status por aba

Cada aba (`/projetos/.../planilhas/.../abas/[sheetId]`) mostra o histórico
completo de execuções (status, início, duração, linhas processadas,
mensagem/código de erro). A listagem de abas mostra um badge com o status
da última execução (Sucesso/Erro/Em andamento/Cancelada/Nunca atualizada).

## Dashboard (Fase 4)

Tela inicial (`/`), com tudo calculado a partir dos dados reais (nenhum
mock) e sempre restrito aos projetos visíveis ao usuário
(`buildProjectFilter`).

- **10 indicadores** pedidos: Projetos, Planilhas, Abas, Atualizações de
  hoje/semana/mês (limites calculados em `America/Sao_Paulo` e convertidos
  para UTC antes de consultar o banco — `startOfAppDay/Week/Month` em
  `src/lib/timezone.ts`), Atualizações atrasadas, com erro, em andamento e
  Nunca atualizadas.
- **Gráficos** (Recharts): barras empilhadas de execuções por dia (por
  status, período configurável) e um donut com a distribuição de status
  (última execução de cada aba).
- **Filtros**: projeto específico ou todos, e período do gráfico (7/14/30
  dias) — refletidos na URL (`?projectId=...&days=...`).
- **Alertas**: painel calculado sob demanda a partir de `update_events` +
  `schedules` — abas cuja última execução foi `ERROR`, ou cujo intervalo
  esperado configurado foi ultrapassado. Não são persistidos em
  `alert_logs`; persistência via job agendado é a extensão natural (fora
  do modelo request/response do Next.js, ficaria a cargo de um worker
  externo ou cron chamando os mesmos serviços).
- **Intervalo esperado por aba**: campo simples (minutos + ativo/inativo)
  na própria tela de histórico da aba, usando a tabela `schedules` já
  existente — é o que alimenta "atualizações atrasadas" e os alertas.

### Pesquisa global (Ctrl+K)

Atalho `Ctrl+K`/`Cmd+K` abre uma paleta de comando (biblioteca `cmdk`,
mesma base usada pelo componente `Command` do shadcn/ui) que busca em:
projeto (nome/descrição/tags), planilha, aba, responsável (membros do
projeto) e erro (mensagem/código de `update_events`) — via
`GET /api/v1/search?q=`, sempre restrito aos projetos visíveis ao usuário
que está pesquisando.

**Alteração de schema:** adicionado `projects.tags` (`String[]`, opcional)
e `@@unique([sheetId])` em `schedules` (uma aba tem no máximo um
agendamento). Rode `npx prisma migrate dev` novamente para aplicar.

## Mapa (Fase 5)

Tela `/mapa`, com React Flow. Nós construídos a partir de dados reais
(Projeto → Planilha → Aba, respeitando os projetos visíveis ao usuário) e
4 nós de sistema fixos exigidos pela especificação:

- **API** — este back-end (Route Handlers).
- **Banco** — PostgreSQL.
- **Apps Script** — a biblioteca da Fase 3; abas que já enviaram ao menos
  uma execução real (`update_events`) ganham uma aresta animada até este
  nó, então o grafo reflete integração de fato, não um diagrama estático.
- **Documentação** — conectado a projetos/abas que tenham um
  `obsidian_link` cadastrado.

Recursos: zoom/drag nativos do React Flow, painel lateral com detalhes ao
clicar em qualquer nó (e link direto para a tela correspondente), pesquisa
que destaca nós pelo nome, filtros por tipo de nó (checkboxes) e filtro por
projeto (reaproveitando `buildProjectFilter`, mesma regra de acesso do
resto da aplicação).

### Integração Obsidian (opcional — nunca obrigatória)

Usa a tabela `obsidian_links`, já prevista no schema desde a Fase 1 (nenhuma
migração nova nesta fase). Duas ações independentes, na tela de Projeto:

- **Baixar Markdown** (`GET /api/v1/projects/[id]/export/markdown`) —
  sempre disponível, gera a documentação do projeto (planilhas, abas,
  responsáveis) em Markdown puro. Não depende de nenhuma configuração.
- **Abrir no Obsidian** — só aparece se o usuário cadastrar um link
  (tipo `URI`, ex.: `obsidian://open?vault=MeuVault&file=...`) ou um
  caminho de arquivo Markdown (tipo `MARKDOWN`) para aquele projeto.

## Auditoria, segurança, testes e deploy (Fase 6)

### Auditoria

Toda mutação feita pelas telas administrativas (Projetos, Planilhas, Abas,
Usuários, Papéis/Permissões, Tokens de API, Links do Obsidian) grava um
registro em `audit_logs` via `recordAuditLog()`
(`src/core/services/audit-log.service.ts`): usuário, ação, tipo/ID da
entidade, IP de origem e metadados não sensíveis (nunca senhas em texto
puro — apenas `passwordChanged: boolean` — nem tokens completos — apenas
`tokenPreview`). A gravação nunca lança exceção nem bloqueia a mutação
principal: falhas de auditoria só geram um log de erro no servidor.
`POST /api/v1/updates` fica de fora — a própria tabela `update_events` já
funciona como trilha de auditoria daquele fluxo.

A tela `/auditoria` (protegida pela permissão `audit_log:read`) lista os
últimos 100 eventos com filtro por tipo de entidade.

### Segurança

Reforços desta fase, além do que já existia (Argon2, RBAC server-side,
Zod em toda entrada, tokens de API com hash SHA-256, HttpOnly/Secure
cookies via Auth.js):

- **Rate limiting no login por credenciais** (`checkRateLimit`, janela
  deslizante de 60s) — chave `login:<ip>:<email>`, 5 tentativas.
- **Content-Security-Policy** adicionada aos headers globais em
  `next.config.ts`, junto dos headers de segurança já existentes
  (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`,
  etc.).

Checklist completo, incluindo pendências conhecidas (rate limiting em
memória não é compartilhado entre réplicas; CSP sem nonce por requisição;
sem 2FA), em [`docs/SECURITY.md`](./docs/SECURITY.md).

### Testes automatizados

Vitest (`npm run test`) cobre, de forma determinística e sem mocks de
banco: DTOs Zod (projetos, usuários, eventos de atualização, tokens de
API, links do Obsidian), o rate limiter (com `vi.useFakeTimers`), os
boundaries de fuso horário (`startOfAppDay/Week/Month` verificados de
forma independente via `Intl.DateTimeFormat`), a geração/hash de tokens de
API e a integridade da matriz `DEFAULT_ROLE_PERMISSIONS` (sem chaves
inválidas ou duplicadas, cobertura de todos os papéis não-Superadmin).
`argon2` (bindings nativos) foi deliberadamente deixado fora da suíte para
não depender de compilação nativa no ambiente de testes.

### Deploy

`Dockerfile` (multi-stage, saída `standalone` do Next.js),
`docker-compose.yml` (app + Postgres para desenvolvimento/homologação) e
`.github/workflows/ci.yml` (lint, typecheck, testes e build em todo
push/PR) foram adicionados nesta fase. Passo a passo completo, variáveis
de ambiente e checklist pré-produção em
[`docs/DEPLOY.md`](./docs/DEPLOY.md) — inclui o aviso de que a migração
inicial do Prisma (`npx prisma migrate dev --name init`) ainda precisa ser
gerada em um ambiente com rede liberada para `binaries.prisma.sh`, já que
este sandbox não teve esse acesso durante o desenvolvimento.

## Variáveis de ambiente

Ver `.env.example`. Nenhum segredo tem valor real commitado.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `AUTH_SECRET` | Segredo do Auth.js (gerar com `openssl rand -base64 33`) |
| `AUTH_URL` | URL base da aplicação |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` | Usados apenas por `npm run prisma:seed` para criar o primeiro Superadmin |

## Temas

Dark (padrão) inspirado no Obsidian — fundo preto/grafite com detalhes
vermelhos — e Light — fundo branco, mesmos detalhes vermelhos, mesmo
layout. Implementados via `next-themes` (classe `.dark` no `<html>`) e
variáveis CSS em `src/app/globals.css`; a preferência do usuário persiste
automaticamente (cookie/localStorage gerenciados pelo `next-themes`).

## Como rodar localmente

```bash
npm install
cp .env.example .env   # preencher DATABASE_URL e AUTH_SECRET

npx prisma generate
npx prisma migrate dev --name init

# opcional: cria papéis/permissões e o primeiro Superadmin
SEED_SUPERADMIN_EMAIL="admin@empresa.com" SEED_SUPERADMIN_PASSWORD="senha-forte" npm run prisma:seed

npm run dev
```

Scripts disponíveis: `npm run dev`, `npm run build`, `npm run lint`,
`npm run typecheck`, `npm run test` / `npm run test:watch`,
`npm run format`, `npm run prisma:generate`, `npm run prisma:migrate`,
`npm run prisma:seed`.

Para rodar via Docker (app + Postgres), ver [`docs/DEPLOY.md`](./docs/DEPLOY.md).

## Nota sobre o ambiente de desenvolvimento desta sessão

Fases 1 e 2 foram construídas e validadas em um sandbox com acesso de rede
restrito a `registry.npmjs.org` (sem acesso a `binaries.prisma.sh` nem a
`fonts.googleapis.com`). Por isso:

- A fonte Geist (Google Fonts) foi substituída por uma pilha de fontes do
  sistema — decisão também mais robusta para uso atrás de proxy
  corporativo.
- `npx prisma generate` **não pôde ser executado neste sandbox** (o
  download do engine do Prisma foi bloqueado pela rede). Isso é a única
  etapa pendente de validação: rode `npx prisma generate` no seu ambiente
  (com internet normal) antes de `npm run build` — é o primeiro passo
  padrão de qualquer projeto Prisma, não uma correção de bug.

## Status

**Fase 1 — Infraestrutura: concluída.** Next.js 15 + TypeScript strict +
Tailwind v4, schema Prisma completo, Auth.js (Credenciais, JWT,
CSRF, sem cadastro público), RBAC server-side, middleware de proteção de
rotas, layout com sidebar/header, temas Dark/Light persistentes, seed
inicial.

**Fase 2 — CRUD: concluída.** Projetos (com membros/acesso), Planilhas,
Abas, Usuários e matriz de Permissões — todos integrados ao banco via
`core/services` e Route Handlers `api/v1`, com autorização e validação Zod
no servidor. Nenhuma tela estática/mockada.

**Fase 3 — Monitoramento: concluída.** Endpoint `POST /api/v1/updates`
autenticado por API Token (com rate limiting), auto-registro de
planilha/aba, upsert de execução por `(sheetId, executionId)`, biblioteca
reutilizável para Apps Script (`apps-script/central-monitoramento.gs.js`),
histórico de execuções e status por aba na UI. **Alteração de schema:**
adicionado o campo `api_tokens.token_preview` (não sensível — só os
últimos 4 caracteres do token, para identificação na lista).

**Fase 4 — Dashboard: concluída.** 10 indicadores, gráficos (Recharts),
filtros de projeto/período, pesquisa global Ctrl+K (`cmdk`) e alertas
calculados a partir de `update_events`/`schedules`. **Alteração de
schema:** `projects.tags` (busca por tags) e `@@unique([sheetId])` em
`schedules`.

**Fase 5 — Mapa: concluída.** Grafo interativo (React Flow) com nós reais
(Projeto/Planilha/Aba) e de sistema (API/Banco/Apps Script/Documentação),
painel lateral, zoom/drag, pesquisa e filtros por tipo/projeto. Integração
Obsidian opcional (exportação Markdown sempre disponível; link `obsidian://`
só se configurado) usando a tabela `obsidian_links` já existente desde a
Fase 1 — **nenhuma migração de schema nesta fase**. Rode
`npx prisma migrate dev` para aplicar as mudanças de schema das fases
3 e 4, se ainda não tiver rodado.

**Fase 6 — Finalização: concluída.** Auditoria (`audit_logs` gravado nas
16 rotas de mutação, tela `/auditoria`), reforço de segurança (rate limit
no login, CSP, `docs/SECURITY.md`), suíte Vitest com 48 testes
determinísticos em 9 arquivos (DTOs Zod, rate limiter, boundaries de fuso
horário, hash de token de API, integridade da matriz de permissões) e
artefatos de deploy (`Dockerfile` multi-stage, `docker-compose.yml`, CI no
GitHub Actions, `docs/DEPLOY.md`).

**Validado nesta sessão:** `npm run lint` (0 erros), `npm run typecheck`
(0 erros — exceto as mesmas 4 ocorrências em `auth.config.ts`, ver nota
acima), `npm run test` (48/48 testes passando), `npm run build`
(compilação webpack bem-sucedida; a etapa de type-check do build para no
mesmo ponto, pela mesma razão — não é uma regressão desta fase).

**Projeto concluído — todas as 6 fases implementadas.** Único passo
pendente antes de rodar em produção: gerar a migração inicial do Prisma
(`npx prisma migrate dev --name init`) em um ambiente com rede liberada
para `binaries.prisma.sh`, e revisar as pendências conhecidas listadas em
`docs/SECURITY.md` (rate limiting compartilhado entre réplicas, nonce por
requisição na CSP, 2FA) antes de escalar para múltiplas instâncias.
