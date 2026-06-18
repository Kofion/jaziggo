# Implementation Plan: Gestão Administrativa de Cemitérios do Jaziggo

**Branch**: `N/A (workspace sem branch Git ativa)` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-cemetery-management/spec.md`

## Summary

Evoluir a aplicação Next.js existente em `JAZIGGO/jaziggo/` para entregar os módulos internos de
autenticação e usuários, falecidos, sepulturas/jazigos, responsáveis, vínculos, busca/localização e
relatórios. A solução usa uma única aplicação full-stack com TypeScript, API REST interna, serviços
de domínio, PostgreSQL e Prisma ORM. Autenticação e autorização são verificadas no servidor, dados
pessoais saem por DTOs mínimos, documentos aparecem mascarados em resultados e alterações de
ocupação são transacionais para preservar capacidade, status e histórico.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js >= 20.9.0 (requisito do Next.js instalado)

**Primary Dependencies**: Next.js 16.2.9 App Router, React 19.2.4, Prisma ORM, Auth.js com provedor de
credenciais, biblioteca de hash Argon2id, Zod, cliente de métricas compatível com Prometheus

**Storage**: PostgreSQL; Prisma schema e migrations; bancos separados para desenvolvimento, teste e
produção

**Testing**: Vitest e React Testing Library para unidades/componentes síncronos; banco PostgreSQL
isolado para integração; Playwright para fluxos E2E e componentes assíncronos do App Router;
validação do contrato OpenAPI

**Target Platform**: Aplicação web responsiva para navegadores modernos; runtime Node.js em host
Linux compatível com Next.js; HTTPS obrigatório em produção

**Project Type**: Aplicação web full-stack monolítica modular na aplicação existente `jaziggo/`

**Performance Goals**: 95% das buscas de localização em até 3 segundos; 95% dos relatórios em até
10 segundos; cadastro e vínculo sem perda de integridade sob concorrência; listagens paginadas

**Constraints**: Somente `ADMIN` e `EMPLOYEE`; atendente usa `EMPLOYEE`; nenhuma consulta pública;
documentos mascarados nos resultados; sepultura com capacidade 1; jazigo com capacidade obrigatória;
vínculos encerrados são históricos; sem integrações externas obrigatórias; relatórios somente na
aplicação; logs sem dados pessoais; consultar `jaziggo/node_modules/next/dist/docs/` antes de código
Next.js

**Scale/Scope**: Um cemitério na versão inicial; baseline de validação de 100 usuários internos,
100.000 falecidos, 25.000 espaços, 100.000 vínculos históricos e 50 sessões concorrentes; paginação
padrão de 25 e máximo de 100 registros por página

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Pre-design | Post-design | Evidence |
|------|------------|-------------|----------|
| Existing application only | PASS | PASS | Todos os caminhos de implementação ficam sob `jaziggo/`; nenhum scaffold ou segunda aplicação é proposto. |
| Internal administrative scope | PASS | PASS | Contratos não expõem busca pública; familiares, visitantes e responsáveis não recebem sessão. |
| Authentication and roles | PASS | PASS | Login é a única operação administrativa sem sessão; matriz limita perfis a `ADMIN` e `EMPLOYEE`. |
| Privacy and data integrity | PASS | PASS | DTOs mascaram documentos, logs usam IDs, constraints e transações protegem vínculos e capacidade. |
| Required stack | PASS | PASS | Next.js, TypeScript, PostgreSQL e Prisma são obrigatórios em todos os artefatos. |
| No mandatory external integrations | PASS | PASS | Autenticação e dados são internos; métricas são locais e Prometheus/Grafana são opcionais. |
| Reports inside application | PASS | PASS | Contratos de relatório retornam visualizações internas e não incluem exportação. |
| Tests proportional to risk | PASS | PASS | Plano cobre RBAC, privacidade, concorrência, histórico, busca, relatórios e fluxos E2E. |
| Next.js local guidance | PASS | PASS | Pesquisa usa docs locais 16.2.9; tasks devem exigir nova consulta antes de alterar código. |

**Gate result**: PASS antes da pesquisa e PASS após o design. Não há exceções ou violações a
justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-cemetery-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md                 # criado somente por /speckit-tasks
```

### Source Code (repository root)

```text
JAZIGGO/
├── AGENTS.md
└── jaziggo/                 # aplicação Next.js existente; não recriar
    ├── app/
    │   ├── (auth)/login/
    │   ├── (admin)/
    │   │   ├── users/
    │   │   ├── deceased/
    │   │   ├── burial-spaces/
    │   │   ├── responsibles/
    │   │   ├── location-search/
    │   │   └── reports/
    │   └── api/
    │       └── v1/
    │           ├── auth/
    │           ├── users/
    │           ├── deceased/
    │           ├── burial-spaces/
    │           ├── responsibles/
    │           ├── burial-links/
    │           ├── location-search/
    │           ├── reports/
    │           └── operations/
    ├── components/
    │   ├── forms/
    │   ├── tables/
    │   └── ui/
    ├── lib/
    │   ├── auth/
    │   ├── db/
    │   ├── dto/
    │   ├── observability/
    │   ├── privacy/
    │   └── validation/
    ├── services/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    ├── tests/
    │   ├── unit/
    │   ├── integration/
    │   ├── contract/
    │   └── fixtures/
    └── e2e/
```

**Structure Decision**: Manter um monólito modular no App Router existente. Route Handlers em
`app/api/` adaptam HTTP para serviços de domínio; serviços aplicam regras e autorização; `lib/db/`
centraliza Prisma e transações; DTOs controlam exposição. A árvore representa caminhos planejados,
não código criado nesta etapa.

## Design Decisions

1. **Boundary HTTP**: API REST interna versionada em `/api/v1`, conforme o Tech Spec, com envelope de
   sucesso e erro contendo `success`, `data` ou `error` e `requestId`. GET aceita somente filtros não
   sensíveis; busca exata por documento completo ou telefone usa POST com body. OpenAPI é o contrato, e Server
   Components e formulários consomem a mesma camada de serviços sem duplicar regras.
2. **Authentication**: Auth.js com credenciais internas, sessão assinada em cookie `HttpOnly`,
   `Secure` em produção e `SameSite=Lax`. Senhas usam Argon2id. Cada operação protegida consulta o
   usuário ativo e aplica autorização no servidor; proteção de navegação é apenas uma defesa extra.
3. **Authorization matrix**: `ADMIN` acessa usuários, relatórios e operações; `EMPLOYEE` acessa
   operações, busca e localização. Atendente é somente descrição funcional de `EMPLOYEE`.
4. **Consistency**: Criação e encerramento de vínculos executam em transação serializável, com retry
   limitado para conflito, contagem de vínculos ativos e recálculo atômico do status do espaço.
5. **Privacy**: Documento completo é aceito para gravação e filtro exato somente por POST com body no
   servidor; telefone completo usado como filtro segue o mesmo transporte. DTOs de lista, busca e
   relatório omitem contatos e expõem apenas documento mascarado com quatro caracteres finais.
   Valores sensíveis completos nunca entram em URL, resposta de listagem, logs, métricas ou erros.
6. **Availability**: Endpoints leves de liveness e readiness, readiness verificando banco. Erros são
   estruturados e não vazam detalhes internos. Backup e restauração são responsabilidades do
   ambiente PostgreSQL e devem ser validados antes de produção.
7. **Observability**: Logs JSON com `requestId`, módulo, operação, IDs internos, duração e resultado;
   métricas mínimas de HTTP, autenticação, busca, relatórios, erros e banco. `/api/metrics` é protegido
   e pode ser desabilitado; Prometheus/Grafana não bloqueiam a primeira versão.

## Delivery Sequence

1. Preservar a aplicação existente e adicionar configuração de ambiente, dependências, lint e testes.
2. Modelar Prisma, migrations, constraints, índices e seed administrativo.
3. Implementar autenticação, sessão, DAL de autorização e matriz `ADMIN`/`EMPLOYEE`.
4. Entregar usuários, espaços, responsáveis e falecidos, nessa ordem de dependência.
5. Entregar vínculos transacionais, capacidade, encerramento histórico e recálculo de status.
6. Entregar busca/localização com paginação, filtros exatos e DTOs mascarados.
7. Entregar relatórios internos restritos a `ADMIN`.
8. Integrar telas, acessibilidade, mensagens e estados vazios.
9. Adicionar logs, health checks, métricas mínimas e validar recuperação operacional.
10. Executar testes unitários, integração, contrato, E2E, desempenho e revisão constitucional.
