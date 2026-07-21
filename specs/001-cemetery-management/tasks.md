# Tasks: Gestão Administrativa de Cemitérios do Jaziggo

**Input**: Design documents from `specs/001-cemetery-management/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Scope rule**: Toda implementação ocorre na aplicação Next.js existente em `jaziggo/`. Nenhuma task
autoriza criar outra aplicação.

**Task fields**: cada item declara fase, arquivos, dependências, critério de conclusão e possibilidade
de paralelização. `[P]` aparece somente quando `Paralelo: sim`. Tasks com o mesmo schema, migration,
serviço ou contrato permanecem sequenciais.

## Phase 1: Setup e validação do ambiente

**Purpose**: Preparar a aplicação existente e os comandos de desenvolvimento sem criar outro projeto.

- [X] T001 Fase 1 — Validar Node.js >=20.9, npm, Next.js 16.2.9 e a árvore existente sem executar scaffold | Arquivos: `jaziggo/package.json`, `jaziggo/package-lock.json`, `jaziggo/app/` | Dependências: nenhuma | Conclusão: versões e aplicação existente confirmadas, sem `create-next-app` | Paralelo: não
- [X] T002 Fase 1 — Adicionar dependências de runtime para Prisma, Auth.js, Argon2id, Zod, `server-only` e métricas Prometheus | Arquivos: `jaziggo/package.json`, `jaziggo/package-lock.json` | Dependências: T001 | Conclusão: dependências compatíveis ficam fixadas no lockfile sem alterar páginas | Paralelo: não
- [X] T003 Fase 1 — Adicionar dependências de desenvolvimento para Vitest, Testing Library, Playwright e validação OpenAPI | Arquivos: `jaziggo/package.json`, `jaziggo/package-lock.json` | Dependências: T002 | Conclusão: ferramentas ficam fixadas no lockfile | Paralelo: não
- [X] T004 Fase 1 — Criar scripts npm de geração/migration/seed, typecheck, testes unitários, integração e E2E | Arquivos: `jaziggo/package.json` | Dependências: T003 | Conclusão: scripts definidos sem incluir ainda `test:contract`, reservado à Fase 15 | Paralelo: não
- [X] T005 [P] Fase 1 — Documentar variáveis de banco, autenticação, administrador inicial e métricas sem valores secretos | Arquivos: `jaziggo/.env.example` | Dependências: T002 | Conclusão: todas as variáveis do quickstart estão descritas e nenhum segredo real foi incluído | Paralelo: sim
- [X] T006 [P] Fase 1 — Configurar Vitest com aliases TypeScript e ambientes Node/jsdom | Arquivos: `jaziggo/vitest.config.mts`, `jaziggo/tests/setup.ts` | Dependências: T003 | Conclusão: Vitest descobre testes vazios sem erro | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` antes
- [X] T007 [P] Fase 1 — Configurar Playwright para iniciar a aplicação e usar ambiente de teste isolado | Arquivos: `jaziggo/playwright.config.ts` | Dependências: T003 | Conclusão: configuração lista projeto Chromium e não aponta para produção | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md` antes

**Checkpoint**: Ambiente e ferramentas definidos na aplicação existente.

---

## Phase 2: Prisma, banco de dados e migrations

**Purpose**: Implementar o modelo relacional e as proteções de integridade que bloqueiam todas as histórias.

- [X] T008 Fase 2 — Configurar generator, datasource e enums `UserRole`, `UserStatus`, `BurialSpaceType`, `BurialSpaceStatus`, `LinkStatus` e `ResponsibleLinkType` | Arquivos: `jaziggo/prisma/schema.prisma` | Dependências: T002 | Conclusão: schema valida com apenas `ADMIN` e `EMPLOYEE` | Paralelo: não
- [X] T009 Fase 2 — Adicionar modelo `User` com e-mail único, hash, role, status e timestamps | Arquivos: `jaziggo/prisma/schema.prisma` | Dependências: T008 | Conclusão: campos, índice e default `ACTIVE` correspondem ao data model | Paralelo: não
- [X] T010 Fase 2 — Adicionar modelo `Deceased` com `internalCode`, nomes normalizados, documento opcional e indicadores históricos | Arquivos: `jaziggo/prisma/schema.prisma` | Dependências: T009 | Conclusão: código interno é único e campos de busca possuem índices | Paralelo: não
- [X] T011 Fase 2 — Adicionar modelo `BurialSpace` preservando o campo técnico `row` e incluindo `capacity`, `locationKey` e status | Arquivos: `jaziggo/prisma/schema.prisma` | Dependências: T010 | Conclusão: unicidade por tipo/identificador/localização e índices de consulta estão declarados | Paralelo: não
- [X] T012 Fase 2 — Adicionar modelos `Responsible` e `ResponsibleLink` com alvo exclusivo e ciclo ativo/encerrado | Arquivos: `jaziggo/prisma/schema.prisma` | Dependências: T011 | Conclusão: relações e índices permitem vínculos a falecido ou espaço, nunca ambos | Paralelo: não
- [X] T013 Fase 2 — Adicionar modelo `BurialLink` com status, `endedAt`, `endReason` e relações restritivas | Arquivos: `jaziggo/prisma/schema.prisma` | Dependências: T012 | Conclusão: vínculos ativos e encerrados são persistidos sem cascade delete | Paralelo: não
- [X] T014 Fase 2 — Gerar migration inicial e complementar SQL com checks de capacidade, localização, datas e encerramento | Arquivos: `jaziggo/prisma/migrations/*/migration.sql` | Dependências: T013 | Conclusão: sepultura exige capacidade 1, jazigo >=1 e constraints rejeitam estados inválidos de uma linha | Paralelo: não
- [X] T015 Fase 2 — Criar seed idempotente do administrador inicial com hash seguro e validação de variáveis | Arquivos: `jaziggo/prisma/seed.ts` | Dependências: T014 | Conclusão: seed cria/atualiza somente um `ADMIN` inicial e nunca imprime senha ou hash | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/authentication.md` antes
- [X] T016 Fase 2 — Criar proteção que rejeita banco de teste igual a desenvolvimento/produção antes de reset | Arquivos: `jaziggo/tests/helpers/assert-test-database.ts` | Dependências: T014 | Conclusão: helper aborta URLs iguais e aceita banco isolado | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/testing/index.md` antes
- [X] T017 Fase 2 — Aplicar migration em banco limpo, executar seed e validar rollback/reset somente no banco de teste | Arquivos: `jaziggo/prisma/schema.prisma`, `jaziggo/prisma/migrations/*/migration.sql`, `jaziggo/prisma/seed.ts` | Dependências: T015, T016 | Conclusão: migrate, generate, seed e reset de teste terminam sem divergência | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação

**Checkpoint**: Banco e integridade estrutural prontos; nenhuma história começa antes de T017.

---

## Phase 3: Tipos, validações e utilitários compartilhados

**Purpose**: Criar contratos internos seguros e reutilizáveis antes dos módulos funcionais.

- [X] T018 [P] Fase 3 — Definir tipos de paginação, envelope uniforme de sucesso/erro e códigos HTTP de domínio | Arquivos: `jaziggo/types/api.ts` | Dependências: T017 | Conclusão: todo sucesso contém `success`, `data` e `requestId`; todo erro contém `success`, `error` e `requestId` | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` antes
- [X] T019 [P] Fase 3 — Definir tipos de usuários, sessão e matriz `ADMIN`/`EMPLOYEE` sem `ATTENDANT` | Arquivos: `jaziggo/types/auth.ts`, `jaziggo/types/user.ts` | Dependências: T017 | Conclusão: tipos não aceitam terceiro perfil | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/authentication.md` antes
- [X] T020 [P] Fase 3 — Definir tipos de falecidos, registros incompletos e DTOs mascarados | Arquivos: `jaziggo/types/deceased.ts` | Dependências: T017 | Conclusão: DTO público não possui campo de documento completo | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T021 [P] Fase 3 — Definir tipos de espaços, capacidade, localização e estados | Arquivos: `jaziggo/types/burial-space.ts` | Dependências: T017 | Conclusão: tipo mantém `row` e estados oficiais | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T022 [P] Fase 3 — Definir tipos de responsáveis e vínculos administrativos | Arquivos: `jaziggo/types/responsible.ts` | Dependências: T017 | Conclusão: tipos distinguem vínculo a falecido de vínculo a espaço | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T023 [P] Fase 3 — Definir tipos de vínculos de sepultamento ativos/encerrados | Arquivos: `jaziggo/types/burial-link.ts` | Dependências: T017 | Conclusão: encerramento exige data e motivo no tipo de comando | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T024 [P] Fase 3 — Implementar normalização de nome, documento, telefone e chave de localização | Arquivos: `jaziggo/lib/validation/normalize.ts` | Dependências: T017 | Conclusão: funções são determinísticas e não registram entradas | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T025 Fase 3 — Implementar mascaramento que revela somente quatro caracteres finais e mascara totalmente valores curtos | Arquivos: `jaziggo/lib/privacy/mask-document.ts` | Dependências: T024 | Conclusão: nenhum retorno revela documento completo | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T026 [P] Fase 3 — Criar schemas Zod compartilhados de paginação, UUID, strings e datas | Arquivos: `jaziggo/lib/validation/common.ts` | Dependências: T018, T024 | Conclusão: query params comuns são normalizados com limites seguros e sem regras específicas de domínio | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T027 [P] Fase 3 — Criar schema Zod de falecido com trim e regra de data conhecida ou `datesUnknown=true` | Arquivos: `jaziggo/lib/validation/deceased.ts` | Dependências: T020, T024 | Conclusão: data informada dispensa `datesUnknown`; ausência de ambas exige `datesUnknown=true`; strings vazias após trim falham | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T028 [P] Fase 3 — Criar schemas Zod distintos de criação e edição de espaço com trim, capacidade e localização | Arquivos: `jaziggo/lib/validation/burial-space.ts` | Dependências: T021, T024 | Conclusão: criação rejeita `OCCUPIED`, sepultura força 1, jazigo exige capacidade e `row` é aceito | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T029 [P] Fase 3 — Criar schema Zod de responsável com trim, nome e ao menos um identificador/contato | Arquivos: `jaziggo/lib/validation/responsible.ts` | Dependências: T022, T024 | Conclusão: strings vazias após trim e nome isolado falham; combinações válidas passam | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T030 [P] Fase 3 — Criar schemas Zod de vínculo, busca GET não sensível, busca POST por documento, paginação e relatórios | Arquivos: `jaziggo/lib/validation/burial-link.ts`, `jaziggo/lib/validation/search.ts`, `jaziggo/lib/validation/report.ts`, `jaziggo/lib/validation/pagination.ts` | Dependências: T018, T023 | Conclusão: documento completo só é aceito em body POST e valores obrigatórios vazios após trim falham | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T031 Fase 3 — Criar cliente Prisma server-only e helper de transação serializável com retry limitado | Arquivos: `jaziggo/lib/db/prisma.ts`, `jaziggo/lib/db/transaction.ts` | Dependências: T017 | Conclusão: conexão é reutilizada e retry ocorre somente em conflito serializável | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/authentication.md` sobre módulos server-only antes

**Checkpoint**: Tipos e validações compartilhados prontos sem exposição de documentos.

---

## Phase 4: Autenticação e controle de acesso

**Goal (US1)**: Permitir sessão interna segura e autorização server-side por `ADMIN` e `EMPLOYEE`.

**Independent Test**: Usuários ativos entram; inativos falham; `EMPLOYEE` recebe 403 em recurso de `ADMIN`; não existe acesso público.

- [X] T032 [US1] Fase 4 — Configurar Auth.js com provedor de credenciais, cookie HttpOnly/Secure/SameSite e callbacks mínimos | Arquivos: `jaziggo/lib/auth/config.ts` | Dependências: T026, T031 | Conclusão: sessão contém somente ID/role necessários e não cria cadastro público | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/authentication.md` antes
- [X] T033 [US1] Fase 4 — Implementar hash e verificação Argon2id isolando segredos | Arquivos: `jaziggo/lib/auth/password.ts` | Dependências: T032 | Conclusão: senha/hash nunca são retornados nem logados | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/authentication.md` antes
- [X] T034 [US1] Fase 4 — Implementar DAL server-only que resolve sessão e revalida usuário ativo no banco | Arquivos: `jaziggo/lib/auth/session.ts`, `jaziggo/lib/auth/dal.ts` | Dependências: T033 | Conclusão: desativação invalida a próxima operação protegida | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/authentication.md` antes
- [X] T035 [US1] Fase 4 — Implementar autorização central `requireRole` e matriz de permissões | Arquivos: `jaziggo/lib/auth/permissions.ts` | Dependências: T034 | Conclusão: usuários/relatórios exigem ADMIN e módulos operacionais aceitam ambos os perfis | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/02-guides/authentication.md` antes
- [X] T036 [US1] Fase 4 — Adicionar `proxy.ts` apenas para redirecionamento otimista, sem substituir checks server-side | Arquivos: `jaziggo/proxy.ts` | Dependências: T035 | Conclusão: áreas administrativas redirecionam anônimos e APIs continuam protegidas no handler | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` antes
- [X] T037 [P] [US1] Fase 4 — Implementar endpoint interno de login conforme contrato | Arquivos: `jaziggo/app/api/v1/auth/login/route.ts` | Dependências: T035 | Conclusão: credenciais válidas criam sessão e inválidas retornam 401 seguro | Paralelo: sim | Docs Next.js: consultar guias locais de autenticação, cookies e Route Handlers antes
- [X] T038 [P] [US1] Fase 4 — Implementar endpoint interno de logout conforme contrato | Arquivos: `jaziggo/app/api/v1/auth/logout/route.ts` | Dependências: T035 | Conclusão: cookie é invalidado e endpoint exige sessão | Paralelo: sim | Docs Next.js: consultar guias locais de autenticação, cookies e Route Handlers antes
- [X] T039 [P] [US1] Fase 4 — Implementar endpoint `me` com DTO mínimo | Arquivos: `jaziggo/app/api/v1/auth/me/route.ts` | Dependências: T035 | Conclusão: retorna ID/nome/e-mail/role/status sem hash | Paralelo: sim | Docs Next.js: consultar guias locais de autenticação e Route Handlers antes
- [X] T040 [US1] Fase 4 — Criar página de login acessível com erros genéricos e sem cadastro público | Arquivos: `jaziggo/app/(auth)/login/page.tsx`, `jaziggo/components/forms/login-form.tsx` | Dependências: T037 | Conclusão: login funciona por teclado e não revela se e-mail existe | Paralelo: não | Docs Next.js: consultar guias locais de autenticação, forms e Server/Client Components antes
- [X] T041 [US1] Fase 4 — Adicionar eventos estruturados de login, logout e acesso negado sem dados sensíveis | Arquivos: `jaziggo/lib/observability/logger.ts`, `jaziggo/lib/auth/audit.ts` | Dependências: T035 | Conclusão: logs usam userId/requestId e nunca e-mail, senha, token ou documento | Paralelo: não | Docs Next.js: consultar guia local de instrumentation antes

**Checkpoint**: US1 possui autenticação e RBAC verificáveis antes do gerenciamento de usuários.

---

## Phase 5: Usuários

**Goal (US1)**: Permitir que somente `ADMIN` liste, crie, edite e desative usuários internos.

**Independent Test**: ADMIN conclui CRUD lógico; EMPLOYEE recebe 403; usuário desativado perde acesso.

- [X] T042 [US1] Fase 5 — Implementar DTO de usuário excluindo hash e dados de sessão | Arquivos: `jaziggo/lib/dto/user.ts` | Dependências: T019, T025 | Conclusão: serialização contém somente campos permitidos | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T043 [US1] Fase 5 — Implementar criação e listagem paginada com e-mail único no `UserService` | Arquivos: `jaziggo/services/user-service.ts` | Dependências: T033, T035, T042 | Conclusão: somente ADMIN cria/lista e duplicidade retorna conflito | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T044 [US1] Fase 5 — Implementar atualização e desativação no `UserService` | Arquivos: `jaziggo/services/user-service.ts` | Dependências: T043 | Conclusão: perfil permanece restrito a ADMIN/EMPLOYEE e desativação preserva registro | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T045 [US1] Fase 5 — Implementar consulta de detalhe por ID no `UserService` | Arquivos: `jaziggo/services/user-service.ts` | Dependências: T044 | Conclusão: método retorna DTO permitido ou not-found sem hash, segredo ou sessão | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T046 [P] [US1] Fase 5 — Implementar handlers de coleção de usuários | Arquivos: `jaziggo/app/api/v1/users/route.ts` | Dependências: T044 | Conclusão: GET/POST seguem paginação, validação, DTO e RBAC do OpenAPI | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e autenticação antes
- [X] T047 [P] [US1] Fase 5 — Implementar handlers de detalhe e edição de usuário | Arquivos: `jaziggo/app/api/v1/users/[id]/route.ts` | Dependências: T045 | Conclusão: GET/PUT retornam envelopes 404/422/200 padronizados e exigem ADMIN | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e parâmetros dinâmicos antes
- [X] T048 [P] [US1] Fase 5 — Implementar handler de desativação de usuário | Arquivos: `jaziggo/app/api/v1/users/[id]/deactivate/route.ts` | Dependências: T044 | Conclusão: PATCH desativa, retorna envelope 200 e não apaga registro | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e autenticação antes
- [X] T049 [US1] Fase 5 — Criar fixtures mínimas de ADMIN, EMPLOYEE ativo e EMPLOYEE inativo | Arquivos: `jaziggo/tests/fixtures/users.ts` | Dependências: T044 | Conclusão: fixtures são determinísticas e não contêm segredo reutilizável fora de teste | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação

---

## Phase 6: Sepulturas e jazigos

**Goal (US3)**: Cadastrar, consultar e alterar espaços respeitando localização, capacidade e estado.

**Independent Test**: Sepultura força capacidade 1; jazigo exige capacidade; `row` persiste; espaço com vínculo ativo rejeita RESERVED/INACTIVE.

- [X] T050 [US3] Fase 6 — Implementar DTO de espaço com contagem ativa e localização padronizada | Arquivos: `jaziggo/lib/dto/burial-space.ts` | Dependências: T021, T024 | Conclusão: DTO mantém `row` e não expõe dados pessoais | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T051 [US3] Fase 6 — Implementar criação de espaço e cálculo de `locationKey` no `BurialSpaceService` | Arquivos: `jaziggo/services/burial-space-service.ts` | Dependências: T028, T031, T050 | Conclusão: criação aceita somente AVAILABLE/RESERVED/INACTIVE; `OCCUPIED` surge apenas de vínculo ativo | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T052 [US3] Fase 6 — Implementar listagem paginada e detalhe por status/tipo/setor/identificador | Arquivos: `jaziggo/services/burial-space-service.ts` | Dependências: T051 | Conclusão: filtros usam índices e retornam contagem ativa | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T053 [US3] Fase 6 — Implementar transição de status com confirmação e bloqueio para vínculos ativos | Arquivos: `jaziggo/services/burial-space-service.ts` | Dependências: T052 | Conclusão: RESERVED/INACTIVE/AVAILABLE falham quando contradizem vínculos; OCCUPIED não é definido sem vínculo | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T054 [P] [US3] Fase 6 — Implementar handlers de coleção de espaços | Arquivos: `jaziggo/app/api/v1/burial-spaces/route.ts` | Dependências: T053 | Conclusão: GET/POST cumprem filtros, DTO e erros do contrato | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T055 [P] [US3] Fase 6 — Implementar handlers de detalhe e edição de espaço | Arquivos: `jaziggo/app/api/v1/burial-spaces/[id]/route.ts` | Dependências: T053 | Conclusão: GET/PUT revalidam capacidade/localização e preservam histórico | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e parâmetros dinâmicos antes
- [X] T056 [P] [US3] Fase 6 — Implementar handler de alteração de status | Arquivos: `jaziggo/app/api/v1/burial-spaces/[id]/status/route.ts` | Dependências: T053 | Conclusão: PATCH exige confirmação e retorna 409 quando há vínculo ativo incompatível | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T057 [US3] Fase 6 — Criar fixtures de sepultura e jazigos em todos os estados/capacidades | Arquivos: `jaziggo/tests/fixtures/burial-spaces.ts` | Dependências: T053 | Conclusão: inclui sepultura capacidade 1 e jazigo capacidade 2 | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação

---

## Phase 7: Responsáveis

**Goal (US4)**: Cadastrar responsáveis e vinculá-los a registros existentes sem conceder acesso.

**Independent Test**: Nome mais contato/identificador cadastra; nome isolado falha; vínculo inexistente é rejeitado; documento sai mascarado.

- [X] T058 [US4] Fase 7 — Implementar DTOs separados de lista e detalhe de responsável | Arquivos: `jaziggo/lib/dto/responsible.ts` | Dependências: T025, T029 | Conclusão: lista omite telefone/e-mail/endereço; detalhe autenticado inclui dados administrativos necessários; documento permanece mascarado | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T059 [US4] Fase 7 — Implementar criação, atualização e busca paginada não sensível no `ResponsibleService` | Arquivos: `jaziggo/services/responsible-service.ts` | Dependências: T031, T058 | Conclusão: GET usa apenas filtros não sensíveis e lista retorna `ResponsibleListItem` | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T060 [US4] Fase 7 — Implementar consulta de detalhe por ID no `ResponsibleService` | Arquivos: `jaziggo/services/responsible-service.ts` | Dependências: T059 | Conclusão: método retorna `ResponsibleDetailResponse` autenticado com vínculos ativos/encerrados e documento mascarado | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T061 [US4] Fase 7 — Implementar criação e listagem de vínculo administrativo com alvo exclusivo | Arquivos: `jaziggo/services/responsible-service.ts` | Dependências: T060 | Conclusão: vínculo inexistente/duplicado falha sem gravação parcial e históricos são consultáveis | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T062 [US4] Fase 7 — Implementar encerramento histórico de `ResponsibleLink` sem delete físico | Arquivos: `jaziggo/services/responsible-service.ts` | Dependências: T061 | Conclusão: encerramento exige `endedAt` e `endReason`, preserva a linha e rejeita vínculo já encerrado | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T063 [P] [US4] Fase 7 — Implementar handlers de coleção de responsáveis com filtros não sensíveis | Arquivos: `jaziggo/app/api/v1/responsibles/route.ts` | Dependências: T062 | Conclusão: GET/POST seguem paginação, DTO de lista, máscara, validação e envelope uniforme | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T064 [P] [US4] Fase 7 — Implementar busca sensível de responsável por documento ou telefone via POST body | Arquivos: `jaziggo/app/api/v1/responsibles/search-sensitive/route.ts` | Dependências: T062 | Conclusão: documento/telefone completos não aparecem em URL, resposta de lista, logs, métricas ou erro | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T065 [P] [US4] Fase 7 — Implementar handlers de detalhe e edição de responsável | Arquivos: `jaziggo/app/api/v1/responsibles/[id]/route.ts` | Dependências: T060, T062 | Conclusão: GET retorna DTO de detalhe; PUT preserva vínculos; documento nunca retorna completo | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T066 [P] [US4] Fase 7 — Implementar handler de criação de vínculo de responsável | Arquivos: `jaziggo/app/api/v1/responsibles/link/route.ts` | Dependências: T062 | Conclusão: POST retorna envelope 201, 404 ou 409 conforme contrato | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T067 [P] [US4] Fase 7 — Implementar endpoint de encerramento histórico de `ResponsibleLink` | Arquivos: `jaziggo/app/api/v1/responsible-links/[id]/end/route.ts` | Dependências: T062 | Conclusão: PATCH exige data, motivo e confirmação; não existe método DELETE | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T068 [US4] Fase 7 — Criar fixtures de responsáveis e vínculos ativos/encerrados | Arquivos: `jaziggo/tests/fixtures/responsibles.ts` | Dependências: T062 | Conclusão: fixtures cobrem contatos opcionais, homônimos e ciclo histórico sem delete | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação

---

## Phase 8: Falecidos

**Goal (US2)**: Cadastrar e consultar falecidos atuais ou históricos, alertando duplicidade.

**Independent Test**: Registro com data passa; registro histórico exige `datesUnknown`; homônimo gera alerta; documento nunca sai completo.

- [X] T069 [US2] Fase 8 — Implementar gerador imutável e único de código interno | Arquivos: `jaziggo/lib/deceased/internal-code.ts` | Dependências: T031 | Conclusão: códigos não colidem nas fixtures e não dependem de documento | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T070 [US2] Fase 8 — Implementar DTO de falecido com indicador histórico e documento mascarado | Arquivos: `jaziggo/lib/dto/deceased.ts` | Dependências: T020, T025, T069 | Conclusão: lista/detalhe omitem documento completo e notas da listagem | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T071 [US2] Fase 8 — Implementar criação e atualização com regras de datas no `DeceasedService` | Arquivos: `jaziggo/services/deceased-service.ts` | Dependências: T027, T031, T070 | Conclusão: datas válidas ou desconhecidas persistem e inconsistências retornam 422 | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T072 [US2] Fase 8 — Implementar detecção não bloqueante de possíveis duplicidades | Arquivos: `jaziggo/services/deceased-service.ts` | Dependências: T071 | Conclusão: compara nome/datas/documento disponíveis e retorna candidatos mascarados | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T073 [US2] Fase 8 — Implementar busca paginada não sensível e filtro exato por documento no `DeceasedService` | Arquivos: `jaziggo/services/deceased-service.ts` | Dependências: T072 | Conclusão: filtros usam campos normalizados; documento exato é parâmetro interno e nunca é ecoado | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T074 [US2] Fase 8 — Implementar consulta de detalhe por ID no `DeceasedService` sem histórico de sepultamento | Arquivos: `jaziggo/services/deceased-service.ts` | Dependências: T073 | Conclusão: método retorna dados principais mascarados; histórico será agregado somente após `BurialLinkService` | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T075 [P] [US2] Fase 8 — Implementar handlers de coleção de falecidos | Arquivos: `jaziggo/app/api/v1/deceased/route.ts` | Dependências: T073 | Conclusão: GET/POST cumprem DTO, paginação e validação | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T076 [P] [US2] Fase 8 — Implementar busca exata de falecido por documento via POST body | Arquivos: `jaziggo/app/api/v1/deceased/search-by-document/route.ts` | Dependências: T073 | Conclusão: documento completo não aparece em URL, resposta, logs, métricas ou erro | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T077 [P] [US2] Fase 8 — Implementar handlers de detalhe principal e edição de falecido | Arquivos: `jaziggo/app/api/v1/deceased/[id]/route.ts` | Dependências: T074 | Conclusão: GET/PUT retornam dados principais sem prometer histórico antes do `BurialLinkService` e sem documento completo | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T078 [P] [US2] Fase 8 — Implementar handler de verificação de duplicidade | Arquivos: `jaziggo/app/api/v1/deceased/check-duplicates/route.ts` | Dependências: T073 | Conclusão: candidatos mascarados retornam 200 sem criar registro | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T079 [US2] Fase 8 — Criar fixtures de registros completos, históricos, homônimos e datas limite | Arquivos: `jaziggo/tests/fixtures/deceased.ts` | Dependências: T073 | Conclusão: fixtures cobrem todos os ramos de RF008/RF014 | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação

---

## Phase 9: Vínculos de sepultamento e histórico

**Goal (US2/US3)**: Criar e encerrar vínculos atomicamente sem exceder capacidade ou perder histórico.

**Independent Test**: Corrida pela última vaga cria um vínculo; encerramento grava data/motivo e recalcula status; não existe delete físico.

- [X] T080 [US3] Fase 9 — Implementar leitura transacional de capacidade e vínculo ativo do falecido | Arquivos: `jaziggo/services/burial-link-service.ts` | Dependências: T031, T053, T073 | Conclusão: resultado distingue bloqueio por status/capacidade e impede mais de um vínculo ativo por falecido | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T081 [US3] Fase 9 — Implementar criação serializável de vínculo e atualização atômica para `OCCUPIED` | Arquivos: `jaziggo/services/burial-link-service.ts` | Dependências: T080 | Conclusão: vínculo e status confirmam juntos ou revertem juntos | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T082 [US3] Fase 9 — Implementar regra de sepultura com exatamente um falecido ativo | Arquivos: `jaziggo/services/burial-link-service.ts` | Dependências: T081 | Conclusão: segundo vínculo retorna 409 sem alteração | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T083 [US3] Fase 9 — Implementar regra de jazigo ocupado aceitar vínculos somente abaixo da capacidade | Arquivos: `jaziggo/services/burial-link-service.ts` | Dependências: T082 | Conclusão: até a capacidade passa e excedente retorna 409 | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T084 [US3] Fase 9 — Implementar encerramento histórico com `endedAt`, `endReason` e recálculo atômico | Arquivos: `jaziggo/services/burial-link-service.ts` | Dependências: T083 | Conclusão: vínculo vira ENDED, permanece consultável e espaço reflete vínculos restantes | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T085 [US3] Fase 9 — Implementar listagens de vínculos por espaço e falecido incluindo ativos/encerrados | Arquivos: `jaziggo/services/burial-link-service.ts` | Dependências: T084 | Conclusão: consultas preservam ordem histórica e status | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T086 [US3] Fase 9 — Implementar DTO de disponibilidade e vínculo sem dados pessoais excessivos | Arquivos: `jaziggo/lib/dto/burial-link.ts` | Dependências: T085 | Conclusão: DTO informa capacidade/contagem/reasonCode e histórico seguro | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T087 [US2] Fase 9 — Integrar histórico do `BurialLinkService` ao detalhe de falecido | Arquivos: `jaziggo/services/deceased-service.ts`, `jaziggo/app/api/v1/deceased/[id]/route.ts` | Dependências: T086, T074 | Conclusão: detalhe passa a incluir vínculos ativos/encerrados ordenados sem delete ou documento completo | Paralelo: não | Docs Next.js: consultar guias locais de Route Handlers e módulos server-only antes
- [X] T088 [US3] Fase 9 — Implementar consulta de falecidos ativos/históricos por espaço | Arquivos: `jaziggo/app/api/v1/burial-spaces/[id]/deceased/route.ts` | Dependências: T086 | Conclusão: filtro de status separa vínculo ativo de histórico usando o `BurialLinkService` | Paralelo: não | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T089 [P] [US3] Fase 9 — Implementar handlers de criação de vínculo e validação consultiva de espaço | Arquivos: `jaziggo/app/api/v1/burial-links/route.ts`, `jaziggo/app/api/v1/burial-links/validate-space/[spaceId]/route.ts` | Dependências: T086 | Conclusão: POST revalida transacionalmente e GET é apenas consultivo | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T090 [P] [US3] Fase 9 — Implementar handler de encerramento histórico sem método DELETE | Arquivos: `jaziggo/app/api/v1/burial-links/[id]/end/route.ts` | Dependências: T086 | Conclusão: PATCH exige confirmação/data/motivo e não existe rota de exclusão | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T091 [P] [US3] Fase 9 — Implementar handlers de histórico por espaço e falecido | Arquivos: `jaziggo/app/api/v1/burial-links/by-space/[spaceId]/route.ts`, `jaziggo/app/api/v1/burial-links/by-deceased/[deceasedId]/route.ts` | Dependências: T086 | Conclusão: endpoints retornam ativos e encerrados conforme contrato | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers antes
- [X] T092 [US3] Fase 9 — Criar fixtures de vínculos ativos, encerrados e jazigo no limite | Arquivos: `jaziggo/tests/fixtures/burial-links.ts` | Dependências: T086 | Conclusão: fixtures suportam concorrência, recálculo e histórico | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação

---

## Phase 10: Busca e localização

**Goal (US5)**: Permitir busca interna rápida e localização padronizada com privacidade.

**Independent Test**: EMPLOYEE encontra por nome/documento exato; homônimos são distinguíveis; resultados exibem só quatro caracteres finais; não há rota pública.

- [X] T093 [US5] Fase 10 — Implementar DTO de busca com código interno, indicador histórico e documentos mascarados | Arquivos: `jaziggo/lib/dto/location-search.ts` | Dependências: T025, T070, T086 | Conclusão: DTO coincide com `LocationSearchItem` e não contém contato excessivo | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T094 [US5] Fase 10 — Implementar montagem padronizada da localização preservando `row` | Arquivos: `jaziggo/lib/location/format-location.ts` | Dependências: T024, T050 | Conclusão: componentes ausentes não criam separadores vazios | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T095 [US5] Fase 10 — Implementar busca paginada por nome parcial, datas, responsável e localização | Arquivos: `jaziggo/services/location-search-service.ts` | Dependências: T059, T073, T086, T093, T094 | Conclusão: filtros combinados retornam somente registros compatíveis | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T096 [US5] Fase 10 — Implementar filtro exato por documento completo sem retorno ou log do valor | Arquivos: `jaziggo/services/location-search-service.ts` | Dependências: T095 | Conclusão: documento normalizado encontra registro e resposta mostra somente máscara | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T097 [US5] Fase 10 — Implementar detalhe de localização por falecido com mínimo de dados | Arquivos: `jaziggo/services/location-search-service.ts` | Dependências: T096 | Conclusão: retorna localização atual ou 404 sem expor dados extras | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T098 [P] [US5] Fase 10 — Implementar handler de busca de localização autenticada | Arquivos: `jaziggo/app/api/v1/location-search/route.ts` | Dependências: T097 | Conclusão: GET exige ADMIN/EMPLOYEE, pagina e mascara conforme contrato | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e autenticação antes
- [X] T099 [P] [US5] Fase 10 — Implementar busca de localização por documento completo via POST body | Arquivos: `jaziggo/app/api/v1/location-search/by-document/route.ts` | Dependências: T097 | Conclusão: documento nunca aparece em query string, URL, resposta, logs, métricas ou mensagens de erro | Paralelo: sim | Docs Next.js: consultar guias locais de Route Handlers e autenticação antes
- [X] T100 [P] [US5] Fase 10 — Implementar handler de detalhe de localização | Arquivos: `jaziggo/app/api/v1/location-search/[deceasedId]/route.ts` | Dependências: T097 | Conclusão: GET exige sessão e retorna DTO mínimo | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e parâmetros dinâmicos antes
- [X] T101 [US5] Fase 10 — Adicionar métricas e logs de busca com duração/resultado, sem filtros pessoais | Arquivos: `jaziggo/services/location-search-service.ts`, `jaziggo/lib/observability/metrics.ts` | Dependências: T098, T100 | Conclusão: sinais distinguem found/empty/error sem nome/documento | Paralelo: não | Docs Next.js: consultar guia local de instrumentation antes

---

## Phase 11: Relatórios administrativos

**Goal (US6)**: Exibir relatórios internos filtráveis somente para ADMIN.

**Independent Test**: ADMIN vê quatro relatórios e estado vazio; EMPLOYEE recebe 403; não há exportação.

- [X] T102 [US6] Fase 11 — Definir DTOs de relatório paginado com campos seguros por tipo | Arquivos: `jaziggo/lib/dto/report.ts`, `jaziggo/types/report.ts` | Dependências: T018, T025 | Conclusão: DTOs não incluem documento completo e suportam emptyMessage | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T103 [US6] Fase 11 — Implementar relatório de falecidos e sepultamentos por período | Arquivos: `jaziggo/services/report-service.ts` | Dependências: T035, T073, T102 | Conclusão: somente ADMIN recebe totais/filtros corretos | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T104 [US6] Fase 11 — Implementar relatórios de ocupação e espaços por status | Arquivos: `jaziggo/services/report-service.ts` | Dependências: T103 | Conclusão: contagens refletem vínculos ativos e estados atuais | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T105 [P] [US6] Fase 11 — Implementar handlers de relatórios de falecidos e período | Arquivos: `jaziggo/app/api/v1/reports/deceased/route.ts`, `jaziggo/app/api/v1/reports/burials-by-period/route.ts` | Dependências: T104 | Conclusão: endpoints exigem ADMIN, paginam e retornam estado vazio | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e autenticação antes
- [X] T106 [P] [US6] Fase 11 — Implementar handlers de relatórios de ocupação e status | Arquivos: `jaziggo/app/api/v1/reports/space-occupation/route.ts`, `jaziggo/app/api/v1/reports/space-status/route.ts` | Dependências: T104 | Conclusão: endpoints exigem ADMIN e aplicam filtros do contrato | Paralelo: sim | Docs Next.js: consultar guia local de Route Handlers e autenticação antes
- [X] T107 [US6] Fase 11 — Adicionar métricas e logs de relatórios sem conteúdo pessoal | Arquivos: `jaziggo/services/report-service.ts`, `jaziggo/lib/observability/metrics.ts` | Dependências: T105, T106 | Conclusão: duração/tipo/empty são observáveis sem filtros sensíveis | Paralelo: não | Docs Next.js: consultar guia local de instrumentation antes
- [X] T108 [US6] Fase 11 — Criar fixtures com períodos, estados e conjunto sem resultados | Arquivos: `jaziggo/tests/fixtures/reports.ts` | Dependências: T104 | Conclusão: fixtures permitem conferir totais determinísticos | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação

---

## Phase 12: UI administrativa e navegação

**Purpose**: Integrar páginas protegidas e componentes reutilizáveis aos serviços/endpoints concluídos.

- [X] T109 Fase 12 — Criar layout administrativo server-side que exige sessão ativa | Arquivos: `jaziggo/app/(admin)/layout.tsx` | Dependências: T035 | Conclusão: anônimo/inativo não renderiza conteúdo administrativo | Paralelo: não | Docs Next.js: consultar guias locais de layouts, autenticação e Server Components antes
- [X] T110 Fase 12 — Criar navegação por perfil sem item `ATTENDANT`, ocultando usuários/relatórios para EMPLOYEE | Arquivos: `jaziggo/components/admin/admin-nav.tsx` | Dependências: T109 | Conclusão: menu reflete matriz, sem substituir autorização server-side | Paralelo: não | Docs Next.js: consultar guias locais de Server/Client Components e links antes
- [X] T111 Fase 12 — Criar componentes compartilhados de feedback, paginação e confirmação acessível | Arquivos: `jaziggo/components/ui/empty-state.tsx`, `jaziggo/components/ui/error-message.tsx`, `jaziggo/components/ui/loading-state.tsx`, `jaziggo/components/ui/pagination.tsx`, `jaziggo/components/ui/confirm-dialog.tsx` | Dependências: T110 | Conclusão: componentes possuem rótulos, foco e mensagens textuais reutilizáveis antes das páginas consumidoras | Paralelo: não | Docs Next.js: consultar guias locais de acessibilidade e Client Components antes
- [X] T112 [P] [US1] Fase 12 — Criar listagem administrativa de usuários com paginação e estados | Arquivos: `jaziggo/app/(admin)/users/page.tsx`, `jaziggo/components/users/user-table.tsx` | Dependências: T046, T111 | Conclusão: somente ADMIN visualiza lista/loading/empty/error | Paralelo: sim | Docs Next.js: consultar guias locais de data fetching e Server Components antes
- [X] T113 [US1] Fase 12 — Criar formulários de criação, edição e confirmação de desativação de usuário | Arquivos: `jaziggo/components/users/user-form.tsx`, `jaziggo/components/users/deactivate-user-dialog.tsx` | Dependências: T047, T048, T112 | Conclusão: ações exibem sucesso/erro e só oferecem ADMIN/EMPLOYEE | Paralelo: não | Docs Next.js: consultar guias locais de forms e mutating data antes
- [X] T114 [P] [US3] Fase 12 — Criar listagem e detalhe de sepulturas/jazigos | Arquivos: `jaziggo/app/(admin)/burial-spaces/page.tsx`, `jaziggo/app/(admin)/burial-spaces/[id]/page.tsx`, `jaziggo/components/burial-spaces/burial-space-table.tsx` | Dependências: T054, T055, T111 | Conclusão: filtros/status/capacidade e histórico são apresentados | Paralelo: sim | Docs Next.js: consultar guias locais de data fetching e segmentos dinâmicos antes
- [X] T115 [US3] Fase 12 — Criar formulário de espaço mantendo payload `row` e rótulo visual “Quadra/Fila” | Arquivos: `jaziggo/components/burial-spaces/burial-space-form.tsx` | Dependências: T114 | Conclusão: campo envia `row`, exibe “Quadra/Fila” e valida localização/capacidade | Paralelo: não | Docs Next.js: consultar guias locais de forms e Client Components antes
- [X] T116 [US3] Fase 12 — Criar confirmação de mudança de status e mensagens de conflito por vínculo ativo | Arquivos: `jaziggo/components/burial-spaces/change-status-dialog.tsx` | Dependências: T056, T115 | Conclusão: RESERVED/INACTIVE explicam necessidade de encerrar vínculos antes | Paralelo: não | Docs Next.js: consultar guias locais de forms e mutating data antes
- [X] T117 [P] [US4] Fase 12 — Criar listagem e detalhe de responsáveis com documento mascarado | Arquivos: `jaziggo/app/(admin)/responsibles/page.tsx`, `jaziggo/app/(admin)/responsibles/[id]/page.tsx`, `jaziggo/components/responsibles/responsible-table.tsx` | Dependências: T063, T065, T111 | Conclusão: listagem omite contatos; detalhe autenticado mostra somente dados administrativos necessários; documento permanece mascarado | Paralelo: sim | Docs Next.js: consultar guias locais de data fetching e segmentos dinâmicos antes
- [X] T118 [US4] Fase 12 — Criar formulário e fluxo de vínculo de responsável | Arquivos: `jaziggo/components/responsibles/responsible-form.tsx`, `jaziggo/components/responsibles/responsible-link-form.tsx` | Dependências: T066, T117 | Conclusão: mínimo cadastral e alvos existentes são validados | Paralelo: não | Docs Next.js: consultar guias locais de forms e mutating data antes
- [X] T119 [P] [US2] Fase 12 — Criar listagem e detalhe de falecidos com indicador histórico | Arquivos: `jaziggo/app/(admin)/deceased/page.tsx`, `jaziggo/app/(admin)/deceased/[id]/page.tsx`, `jaziggo/components/deceased/deceased-table.tsx` | Dependências: T075, T087, T111 | Conclusão: código interno, datas, histórico e máscara diferenciam registros | Paralelo: sim | Docs Next.js: consultar guias locais de data fetching e segmentos dinâmicos antes
- [X] T120 [US2] Fase 12 — Criar formulário de falecido e revisão de possíveis duplicidades | Arquivos: `jaziggo/components/deceased/deceased-form.tsx`, `jaziggo/components/deceased/duplicate-review.tsx` | Dependências: T078, T119 | Conclusão: datas desconhecidas são explícitas e alerta não bloqueia homônimo legítimo | Paralelo: não | Docs Next.js: consultar guias locais de forms e mutating data antes
- [X] T121 [US3] Fase 12 — Criar formulário de vínculo e diálogo de encerramento histórico | Arquivos: `jaziggo/components/burial-links/create-link-form.tsx`, `jaziggo/components/burial-links/end-link-dialog.tsx` | Dependências: T089, T090, T114, T119 | Conclusão: capacidade é informada e encerramento exige data/motivo/confirmação | Paralelo: não | Docs Next.js: consultar guias locais de forms e mutating data antes
- [X] T122 [P] [US5] Fase 12 — Criar página e filtros de busca/localização interna | Arquivos: `jaziggo/app/(admin)/location-search/page.tsx`, `jaziggo/components/location/location-search-form.tsx` | Dependências: T098, T099, T111 | Conclusão: filtros não sensíveis usam GET; documento completo usa POST body e nunca é persistido/reexibido na URL | Paralelo: sim | Docs Next.js: consultar guias locais de forms, Route Handlers e data fetching antes
- [X] T123 [US5] Fase 12 — Criar resultados de localização com máscara, homônimos e estados vazio/loading/error | Arquivos: `jaziggo/components/location/location-results.tsx`, `jaziggo/components/location/location-detail.tsx` | Dependências: T100, T122 | Conclusão: orientação padronizada usa “Quadra/Fila” para `row` e só quatro caracteres finais | Paralelo: não | Docs Next.js: consultar guias locais de Server/Client Components antes
- [X] T124 [P] [US6] Fase 12 — Criar shell ADMIN da página de relatórios e controles compartilhados de filtro | Arquivos: `jaziggo/app/(admin)/reports/page.tsx`, `jaziggo/components/reports/report-filters.tsx` | Dependências: T105, T106, T111 | Conclusão: seleção de tipo/filtros funciona, EMPLOYEE não renderiza a página e não existe exportação | Paralelo: sim | Docs Next.js: consultar guias locais de data fetching, forms e autorização antes
- [X] T125 [P] [US6] Fase 12 — Criar visualizações de falecidos e sepultamentos por período | Arquivos: `jaziggo/components/reports/deceased-report-table.tsx`, `jaziggo/components/reports/burials-period-report-table.tsx` | Dependências: T124 | Conclusão: tabelas paginam, aplicam período e mostram estado vazio sem documento completo | Paralelo: sim | Docs Next.js: consultar guias locais de data fetching e Server/Client Components antes
- [X] T126 [P] [US6] Fase 12 — Criar visualizações de ocupação e espaços por status | Arquivos: `jaziggo/components/reports/space-occupation-report-table.tsx`, `jaziggo/components/reports/space-status-report-table.tsx` | Dependências: T124 | Conclusão: tabelas aplicam status/setor/tipo e mostram estado vazio com totais corretos | Paralelo: sim | Docs Next.js: consultar guias locais de data fetching e Server/Client Components antes

---

## Phase 13: Testes unitários

**Purpose**: Cobrir regras puras e serviços críticos em arquivos independentes.

- [X] T127 [P] [US1] Fase 13 — Testar hash, sessão, usuário inativo e matriz de permissões | Arquivos: `jaziggo/tests/unit/auth.test.ts` | Dependências: T041 | Conclusão: ADMIN/EMPLOYEE/inativo/anônimo cobertos sem terceiro perfil | Paralelo: sim | Docs Next.js: consultar guia local de testing antes
- [X] T128 [P] [US1] Fase 13 — Testar criação, e-mail duplicado, edição e desativação de usuário | Arquivos: `jaziggo/tests/unit/user-service.test.ts` | Dependências: T049 | Conclusão: todos os ramos do UserService passam | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T129 [P] Fase 13 — Testar normalização e máscara de documentos, inclusive valores curtos | Arquivos: `jaziggo/tests/unit/privacy-utils.test.ts` | Dependências: T025 | Conclusão: somente quatro finais aparecem e curtos ficam totalmente mascarados | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T130 [P] [US3] Fase 13 — Testar validação de espaço, capacidade e campo `row` | Arquivos: `jaziggo/tests/unit/burial-space-validation.test.ts` | Dependências: T028 | Conclusão: sepultura/jazigo/localização e “row” têm casos válidos/inválidos | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T131 [P] [US3] Fase 13 — Testar transições de status com vínculos ativos | Arquivos: `jaziggo/tests/unit/burial-space-service.test.ts` | Dependências: T057 | Conclusão: RESERVED/INACTIVE/AVAILABLE/OCCUPIED seguem invariantes | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T132 [P] [US4] Fase 13 — Testar mínimo cadastral, DTOs, busca e ciclo histórico de vínculo de responsável | Arquivos: `jaziggo/tests/unit/responsible-service.test.ts` | Dependências: T068, T062 | Conclusão: listas omitem contatos; detalhe os restringe; encerramento exige data/motivo e nunca faz delete | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T133 [P] [US2] Fase 13 — Testar datas, código interno, histórico e duplicidade de falecido | Arquivos: `jaziggo/tests/unit/deceased-service.test.ts` | Dependências: T079 | Conclusão: casos completos, históricos e homônimos passam | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T134 [P] [US3] Fase 13 — Testar capacidade, bloqueio por status e um único vínculo ativo por falecido | Arquivos: `jaziggo/tests/unit/burial-link-capacity.test.ts` | Dependências: T092 | Conclusão: limites, reasonCodes e rejeição do segundo vínculo ativo do falecido são cobertos | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T135 [P] [US3] Fase 13 — Testar encerramento histórico e recálculo do status | Arquivos: `jaziggo/tests/unit/burial-link-history.test.ts` | Dependências: T092 | Conclusão: data/motivo obrigatórios e nenhum delete físico | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T136 [P] [US5] Fase 13 — Testar busca exata por documento, máscara, homônimos e formatação | Arquivos: `jaziggo/tests/unit/location-search-service.test.ts` | Dependências: T101 | Conclusão: respostas e logs não contêm documento completo | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T137 [P] [US6] Fase 13 — Testar filtros, totais, estados e empty state dos relatórios | Arquivos: `jaziggo/tests/unit/report-service.test.ts` | Dependências: T108 | Conclusão: quatro relatórios cobertos e EMPLOYEE rejeitado | Paralelo: sim | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T138 Fase 13 — Executar suíte unitária e corrigir apenas falhas dentro do escopo | Arquivos: `jaziggo/tests/unit/`, `jaziggo/vitest.config.mts` | Dependências: T127-T137 | Conclusão: `npm run test:unit` passa sem testes ignorados críticos | Paralelo: não | Docs Next.js: consultar guia local de testing antes

---

## Phase 14: Testes de integração

**Purpose**: Validar API, serviços e PostgreSQL reais com isolamento e concorrência.

- [X] T139 Fase 14 — Criar ciclo de reset/migrate/seed exclusivo do banco de integração | Arquivos: `jaziggo/tests/integration/setup-database.ts`, `jaziggo/tests/integration/global-setup.ts` | Dependências: T016, T017 | Conclusão: cada execução começa determinística e nunca toca banco não teste | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T140 [P] [US1] Fase 14 — Testar login, logout, `me`, inatividade e acesso negado no banco real | Arquivos: `jaziggo/tests/integration/auth-api.test.ts` | Dependências: T139, T041 | Conclusão: respostas 200/401/403 usam envelopes uniformes conforme contrato | Paralelo: sim | Docs Next.js: consultar guias locais de testing, autenticação e Route Handlers antes
- [X] T141 [P] [US1] Fase 14 — Testar endpoints e persistência de usuários | Arquivos: `jaziggo/tests/integration/users-api.test.ts` | Dependências: T139, T049 | Conclusão: ADMIN opera e EMPLOYEE recebe 403 | Paralelo: sim | Docs Next.js: consultar guia local de testing antes
- [X] T142 [P] [US3] Fase 14 — Testar CRUD de espaços, `row`, capacidade e transições de status | Arquivos: `jaziggo/tests/integration/burial-spaces-api.test.ts` | Dependências: T139, T057 | Conclusão: constraints e respostas 409/422 são exercitadas | Paralelo: sim | Docs Next.js: consultar guia local de testing antes
- [X] T143 [P] [US4] Fase 14 — Testar responsáveis, POST por documento e encerramento histórico de vínculos | Arquivos: `jaziggo/tests/integration/responsibles-api.test.ts` | Dependências: T139, T068, T067 | Conclusão: lista omite contatos, documento não aparece na URL e vínculo encerrado permanece no PostgreSQL | Paralelo: sim | Docs Next.js: consultar guia local de testing antes
- [X] T144 [P] [US2] Fase 14 — Testar falecidos completos/históricos e alerta de duplicidade | Arquivos: `jaziggo/tests/integration/deceased-api.test.ts` | Dependências: T139, T079 | Conclusão: internalCode e regras de datas persistem corretamente | Paralelo: sim | Docs Next.js: consultar guia local de testing antes
- [X] T145 [US3] Fase 14 — Testar duas transações concorrentes pela última vaga do jazigo | Arquivos: `jaziggo/tests/integration/burial-link-concurrency.test.ts` | Dependências: T139, T092 | Conclusão: exatamente uma confirma e capacidade nunca é excedida | Paralelo: não | Docs Next.js: consultar guia local de testing antes
- [X] T146 [US3] Fase 14 — Testar encerramento histórico e recálculo com vínculos restantes/zero | Arquivos: `jaziggo/tests/integration/burial-link-history.test.ts` | Dependências: T145 | Conclusão: vínculo permanece e estados finais são consistentes | Paralelo: não | Docs Next.js: consultar guia local de testing antes
- [X] T147 [P] [US5] Fase 14 — Testar busca integrada, documento exato via POST, máscara e ausência de rota pública | Arquivos: `jaziggo/tests/integration/location-search-api.test.ts` | Dependências: T139, T101, T099 | Conclusão: documento completo não aparece em URL, resposta, logs, métricas ou erro | Paralelo: sim | Docs Next.js: consultar guia local de testing antes
- [X] T148 [P] [US6] Fase 14 — Testar relatórios contra fixtures e RBAC | Arquivos: `jaziggo/tests/integration/reports-api.test.ts` | Dependências: T139, T108 | Conclusão: totais/empty state batem com banco e EMPLOYEE recebe 403 | Paralelo: sim | Docs Next.js: consultar guia local de testing antes
- [X] T149 Fase 14 — Executar suíte de integração serializando testes que compartilham reset do banco | Arquivos: `jaziggo/vitest.config.mts`, `jaziggo/tests/integration/` | Dependências: T140-T148 | Conclusão: `npm run test:integration` passa repetidamente sem flakiness | Paralelo: não | Docs Next.js: consultar guia local de testing antes

---

## Phase 15: Validação do OpenAPI

**Purpose**: Tornar o contrato verificável e impedir divergência entre rotas e especificação.

- [X] T150 Fase 15 — Configurar regras do validador OpenAPI para o contrato interno | Arquivos: `jaziggo/.redocly.yaml` | Dependências: T003 | Conclusão: configuração aceita OpenAPI 3.1 e trata erros estruturais como falha | Paralelo: não
- [X] T151 Fase 15 — Criar script automatizado que valida `../specs/001-cemetery-management/contracts/openapi.yaml` a partir de `jaziggo/` | Arquivos: `jaziggo/scripts/validate-openapi.mjs` | Dependências: T150 | Conclusão: caminho relativo correto é usado e script falha para YAML/schema inválido | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T152 Fase 15 — Adicionar `validate:openapi` e integrar sua execução ao fluxo `npm run test:contract` | Arquivos: `jaziggo/package.json`, `jaziggo/package-lock.json` | Dependências: T151 | Conclusão: `test:contract` sempre executa validação estrutural antes dos testes de contrato | Paralelo: não
- [X] T153 Fase 15 — Implementar liveness mínimo com envelope uniforme e sem detalhes internos | Arquivos: `jaziggo/app/api/v1/operations/health/live/route.ts` | Dependências: T031, T018 | Conclusão: processo saudável retorna 200 com `success`, `data` e `requestId` sem dados de ambiente | Paralelo: não | Docs Next.js: consultar guias locais de Route Handlers e instrumentation antes
- [X] T154 Fase 15 — Implementar readiness protegido verificando PostgreSQL | Arquivos: `jaziggo/app/api/v1/operations/health/ready/route.ts` | Dependências: T153 | Conclusão: retorna envelope 200 pronto ou erro 503 padronizado sem credenciais/detalhes | Paralelo: não | Docs Next.js: consultar guias locais de Route Handlers e instrumentation antes
- [X] T155 Fase 15 — Implementar endpoint opcional/protegido de métricas sem labels pessoais | Arquivos: `jaziggo/app/api/v1/operations/metrics/route.ts`, `jaziggo/lib/observability/metrics.ts` | Dependências: T154, T101, T107 | Conclusão: endpoint segue envelope, pode ser desabilitado e não expõe filtros ou dados pessoais | Paralelo: não | Docs Next.js: consultar guias locais de Route Handlers e instrumentation antes
- [X] T156 Fase 15 — Criar teste de aderência de paths/métodos/roles/envelopes implementados ao OpenAPI | Arquivos: `jaziggo/tests/contract/openapi-contract.test.ts`, `specs/001-cemetery-management/contracts/openapi.yaml` | Dependências: T152-T155, T046-T048, T054-T056, T063-T067, T075-T078, T088-T091, T098-T100, T105-T106 | Conclusão: drift de rota, método, segurança, envelope ou schema falha a suíte | Paralelo: não | Docs Next.js: consultar guia local de Route Handlers e testing antes
- [X] T157 Fase 15 — Executar `npm run test:contract` e registrar contrato válido | Arquivos: `jaziggo/tests/contract/`, `specs/001-cemetery-management/contracts/openapi.yaml` | Dependências: T156 | Conclusão: YAML valida e todos os endpoints implementados aderem ao contrato | Paralelo: não

---

## Phase 16: Acessibilidade, mensagens, estados vazios e revisão final

**Purpose**: Fechar qualidade transversal, observabilidade, desempenho e conformidade.

- [X] T158 Fase 16 — Criar testes E2E de login, navegação por perfil e ausência de acesso público | Arquivos: `jaziggo/e2e/auth-navigation.spec.ts` | Dependências: T113, T124 | Conclusão: ADMIN/EMPLOYEE veem menus corretos e visitantes não acessam áreas | Paralelo: não | Docs Next.js: consultar guia local de Playwright antes
- [X] T159 [P] Fase 16 — Criar testes E2E de cadastro, localização, máscara e homônimos | Arquivos: `jaziggo/e2e/location-workflow.spec.ts` | Dependências: T120-T123, T158 | Conclusão: fluxo do atendente EMPLOYEE termina sem documento completo no DOM | Paralelo: sim | Docs Next.js: consultar guia local de Playwright antes
- [X] T160 [P] Fase 16 — Criar testes E2E de ocupação, bloqueio de status e encerramento histórico | Arquivos: `jaziggo/e2e/occupancy-workflow.spec.ts` | Dependências: T115, T116, T121, T158 | Conclusão: UI exige encerramento antes de RESERVED/INACTIVE e mantém histórico | Paralelo: sim | Docs Next.js: consultar guia local de Playwright antes
- [X] T161 [P] Fase 16 — Criar testes E2E dos quatro relatórios e estados vazios | Arquivos: `jaziggo/e2e/reports-workflow.spec.ts` | Dependências: T126, T158 | Conclusão: ADMIN visualiza internamente e EMPLOYEE não acessa | Paralelo: sim | Docs Next.js: consultar guia local de Playwright antes
- [X] T162 Fase 16 — Auditar teclado, foco, rótulos, contraste, cabeçalhos e mensagens não dependentes de cor | Arquivos: `jaziggo/e2e/accessibility.spec.ts`, `jaziggo/app/`, `jaziggo/components/` | Dependências: T111, T159-T161 | Conclusão: jornadas críticas passam pelos critérios CR-008 e SC-009 | Paralelo: não | Docs Next.js: consultar guias locais de acessibilidade e Playwright antes
- [X] T163 Fase 16 — Validar estados loading/empty/error/success e confirmações sensíveis em todos os módulos | Arquivos: `jaziggo/components/`, `jaziggo/e2e/feedback-states.spec.ts` | Dependências: T162 | Conclusão: nenhum fluxo crítico fica sem feedback textual testado | Paralelo: não | Docs Next.js: consultar guias locais de loading/error UI e Playwright antes
- [X] T164 Fase 16 — Criar seed/baseline isolado de 100 mil registros | Arquivos: `jaziggo/tests/performance/seed-baseline.ts` | Dependências: T149 | Conclusão: base reproduzível é criada apenas no banco de performance e registra sua distribuição | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [ ] T165 Fase 16 — Executar benchmark de busca sobre o baseline | Arquivos: `jaziggo/tests/performance/search-benchmark.test.ts` | Dependências: T164 | Conclusão: percentis são registrados e 95% das buscas concluem em até 3s; pendente de PERFORMANCE_DATABASE_URL isolado | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [ ] T166 Fase 16 — Executar benchmark dos quatro relatórios sobre o baseline | Arquivos: `jaziggo/tests/performance/report-benchmark.test.ts` | Dependências: T165 | Conclusão: percentis são registrados e relatórios concluem em até 10s; pendente de PERFORMANCE_DATABASE_URL isolado | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T167 Fase 16 — Analisar índices e query plans das consultas lentas | Arquivos: `jaziggo/tests/performance/query-plan-notes.md` | Dependências: T165, T166 | Conclusão: cenários e SQLs documentados; `EXPLAIN ANALYZE` real segue pendente até haver PERFORMANCE_DATABASE_URL isolado | Paralelo: não
- [X] T168 Fase 16 — Aplicar eventual ajuste de índice por migration quando justificado | Arquivos: `jaziggo/prisma/schema.prisma`, `jaziggo/prisma/migrations/*/migration.sql` | Dependências: T167 | Conclusão: migration mínima é criada somente se o query plan justificar; caso contrário a decisão de não alterar fica registrada | Paralelo: não
- [ ] T169 Fase 16 — Reexecutar benchmarks após análise/ajuste de índices | Arquivos: `jaziggo/tests/performance/search-benchmark.test.ts`, `jaziggo/tests/performance/report-benchmark.test.ts` | Dependências: T168 | Conclusão: metas de busca/relatórios e paginação máxima 100 são confirmadas ou bloqueiam aprovação; pendente de benchmark real | Paralelo: não | Docs Next.js: consultar `jaziggo/node_modules/next/dist/docs/` antes da implementação
- [X] T170 Fase 16 — Validar logs, métricas e health checks sem senhas, tokens, documentos ou contatos | Arquivos: `jaziggo/tests/integration/observability.test.ts`, `jaziggo/lib/observability/` | Dependências: T153-T155 | Conclusão: sinais operacionais passam e vazamento bloqueia release | Paralelo: não | Docs Next.js: consultar guia local de instrumentation antes
- [X] T171 Fase 16 — Registrar validação funcional de aceite do MVP para SC-002, SC-004 e SC-010 | Arquivos: `specs/001-cemetery-management/quickstart.md`, `jaziggo/tests/acceptance/human-validation.md` | Dependências: T159-T161 | Conclusão: aceite funcional documenta cenários ADMIN/EMPLOYEE, sem participantes reais, métricas inventadas ou dados pessoais, e registra validação empírica como trabalho futuro | Paralelo: não
- [X] T172 Fase 16 — Ensaiar restauração de backup PostgreSQL em ambiente isolado | Arquivos: `jaziggo/tests/recovery/restore-runbook.md`, `specs/001-cemetery-management/quickstart.md` | Dependências: T149 | Conclusão: backup é restaurado em banco isolado, integridade/amostras são verificadas e evidência sem segredos é registrada | Paralelo: não
- [ ] T173 Fase 16 — Reexecutar lint, typecheck, unit, integration, contract, E2E e build na aplicação existente | Arquivos: `jaziggo/package.json`, `jaziggo/` | Dependências: T138, T149, T157, T162-T163, T170, T169-T172 | Conclusão: todos os comandos e gates do quickstart passam sem criar nova aplicação; pendente após correção de `test:contract` e T169 | Paralelo: não | Docs Next.js: consultar documentação local relevante antes de corrigir qualquer falha
- [ ] T174 Fase 16 — Reexecutar Constitution Check e registrar validação final do quickstart | Arquivos: `specs/001-cemetery-management/quickstart.md`, `specs/001-cemetery-management/plan.md` | Dependências: T173 | Conclusão: gates continuam PASS, incluindo privacidade, recuperação e validação humana, sem integração externa obrigatória, exportação ou acesso público; pendente de T173 atualizado e evidência de performance | Paralelo: não

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1
  -> Phase 2
    -> Phase 3
      -> Phase 4
        -> Phase 5
        -> Phase 6 -> Phase 9
        -> Phase 7 -> Phase 10
        -> Phase 8 -> Phase 9 -> Phase 10
        -> Phase 11 (após dados operacionais)
          -> Phase 12
            -> Phase 13
            -> Phase 14
              -> Phase 15
                -> Phase 16
```

- Fases 1–4 são fundacionais e bloqueiam os módulos.
- Fases 5, 6, 7 e 8 podem ter execução intercalada após a Fase 4, respeitando IDs internos.
- Fase 9 depende das Fases 6 e 8 e usa responsáveis da Fase 7 quando aplicável.
- Fase 10 depende das Fases 7–9.
- Fase 11 depende dos dados das Fases 6, 8 e 9.
- Fases 13 e 14 dependem das implementações correspondentes; o reset compartilhado do banco torna
  T145/T146 e T149 sequenciais.
- Fase 15 é sequencial porque todas as tasks alteram ou validam o mesmo contrato/fluxo npm.
- Fase 16 fecha os gates e não autoriza trabalho posterior antes de T174.

### User Story Dependencies

| Story | Scope | Blocking dependencies | Independent completion signal |
|-------|-------|-----------------------|-------------------------------|
| US1 | Autenticação e usuários | Phases 1–4 | ADMIN gerencia usuários; EMPLOYEE/inativo são bloqueados. |
| US2 | Falecidos | Phases 1–4, 8 | Registro atual/histórico e duplicidade funcionam com máscara. |
| US3 | Espaços e ocupação | Phases 1–4, 6, 9 | Capacidade, estados e histórico permanecem consistentes. |
| US4 | Responsáveis | Phases 1–4, 7 | Cadastro mínimo e vínculos existentes funcionam sem acesso direto. |
| US5 | Busca/localização | US2, US3, US4 e Phase 9 | EMPLOYEE localiza com filtros e nenhum documento completo aparece. |
| US6 | Relatórios | US2, US3 e Phase 9 | ADMIN vê quatro relatórios corretos e EMPLOYEE recebe 403. |

## Parallel Opportunities

- Após T017, T018–T024 podem avançar em arquivos distintos; T025 depende de T024.
- Após T035, T037–T039 podem avançar em handlers distintos.
- Após cada serviço estabilizar, handlers marcados `[P]` do respectivo módulo podem avançar juntos.
- T112, T114, T117, T119, T122 e T124 usam módulos distintos após os componentes compartilhados T111.
- Testes unitários T127–T137 usam arquivos e unidades diferentes.
- Testes de integração marcados `[P]` podem ser escritos em paralelo, mas a execução final é
  serializada por T149 quando compartilham reset do banco.
- T159–T161 podem ser escritos em paralelo após o smoke E2E T158.

### Parallel Example: US3

```text
Após T053: executar T054, T055 e T056 em paralelo.
Após T086: executar T087 e T088 em sequência; depois T089, T090 e T091 podem avançar em paralelo.
Após T158: executar T159, T160 e T161 em paralelo.
```

### Parallel Example: Cross-story UI

```text
Após T111 e respectivos endpoints: T112, T114, T117, T119, T122 e T124.
Não paralelizar T115/T116 entre si nem tasks que alterem o mesmo formulário/serviço.
```

## Implementation Strategy

### MVP First

1. Concluir Fases 1–4.
2. Concluir Fase 5 para entregar US1: acesso interno e gestão segura de usuários.
3. Executar T127, T128, T140 e T141 para validar o incremento antes dos demais módulos.

### Incremental Delivery

1. US1: autenticação e usuários.
2. US3: espaços básicos, inicialmente sem vínculos.
3. US4: responsáveis.
4. US2: falecidos.
5. US3 completo: vínculos, capacidade e histórico.
6. US5: busca/localização.
7. US6: relatórios.
8. UI integrada, suites transversais, contrato e revisão final.

## Notes

- `[P]` significa arquivos diferentes e nenhuma dependência incompleta compartilhada.
- Toda task de código Next.js inclui consulta explícita à documentação local instalada.
- O contrato OpenAPI é fonte de verdade para paths, métodos, segurança e DTOs HTTP.
- Falhas de RBAC, privacidade, capacidade concorrente ou perda histórica bloqueiam conclusão.
- Nenhuma task inclui portal público, exportação, mapas, notificações ou integração externa obrigatória.
