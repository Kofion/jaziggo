\# Checkpoint Codex — Jaziggo



\## Estado geral



Projeto: Jaziggo

Tipo: sistema web interno para gestão de cemitério

Stack: Next.js + TypeScript + PostgreSQL + Prisma

App principal: `jaziggo/`

Spec principal: `specs/001-cemetery-management/`



O projeto está sendo implementado com GitHub Spec Kit/Codex, task por task, a partir de `specs/001-cemetery-management/tasks.md`.



Sempre seguir o `tasks.md` como fonte de verdade.



\## Regra de trabalho



\* Implementar uma task por vez.

\* Antes de cada task, ler `AGENTS.md`, `jaziggo/AGENTS.md`, `tasks.md`, `spec.md`, `data-model.md`, `openapi.yaml`, `quickstart.md` e os arquivos relacionados ao módulo.

\* Não implementar a próxima task.

\* Não alterar a descrição das tasks.

\* Se houver conflito entre prompt e `tasks.md`, seguir `tasks.md`.

\* Ao final de cada task, reportar escopo real, arquivos alterados, validações, task concluída e próxima task não iniciada.

\* Fazer commit após cada task concluída.



\## Regras críticas do domínio



\* Sistema administrativo interno.

\* Perfis existentes: `ADMIN` e `EMPLOYEE`.

\* Não criar perfil `ATTENDANT`.

\* “Atendente” é uma função operacional do `EMPLOYEE`, não um perfil separado.

\* Familiares, visitantes e responsáveis não acessam diretamente o sistema.

\* Funcionários/admins fazem buscas e operações pelo sistema.

\* Responsável não é usuário do sistema.

\* Responsável não tem login, senha, sessão ou acesso direto.

\* Documento/CPF completo não deve ser retornado em DTOs públicos.

\* Usar documento mascarado em respostas.

\* Não logar documentos completos, senhas, hashes, tokens, `AUTH\_SECRET`, `DATABASE\_URL` ou segredos.

\* Preservar histórico administrativo.

\* Não deletar fisicamente registros históricos/administrativos, salvo se uma task exigir explicitamente.

\* Vínculo de responsável deve apontar para falecido OU espaço, nunca ambos.

\* Vínculo encerrado deve preservar histórico com `ENDED`, `endedAt` e motivo quando aplicável.

\* Ocupação de espaço não deve ser feita manualmente com status `OCCUPIED`; ocupação vem de vínculo ativo.

\* `SEPULTURA` tem capacidade 1.

\* `JAZIGO` tem capacidade configurável.

\* Campo técnico `row` deve ser preservado.



\## Banco e ambiente



Banco usado: PostgreSQL via Neon.



Bancos criados:



\* `jaziggo\_dev`

\* `jaziggo\_test`



Nunca imprimir ou pedir para colar:



\* conteúdo do `.env`

\* URLs Neon

\* `AUTH\_SECRET`

\* senhas

\* tokens

\* hashes



`.env` real está ignorado pelo Git.

`.env.example` deve conter apenas placeholders.



\## Progresso até agora



Tasks concluídas: T001 até T067.



Última task concluída: T067.

Próxima task a implementar: T068.

T068 ainda não foi iniciada.



\## Resumo por blocos



\### Setup inicial



Concluído:



\* validação da estrutura do app Next.js em `jaziggo/`

\* dependências runtime instaladas

\* dependências de teste/dev instaladas

\* scripts npm adicionados

\* `.env.example` e `.gitignore` configurados

\* Vitest configurado

\* Playwright configurado

\* Prisma configurado

\* modelos Prisma criados

\* migration inicial criada e depois aplicada em dev/test

\* seed inicial com admin

\* helper de segurança para banco de teste



\### Tipos e validações



Concluído:



\* tipos compartilhados de API, auth, user, deceased, burial-space, responsible e burial-link

\* normalização de nome, documento, telefone e localização

\* mascaramento/privacidade

\* schemas Zod comuns

\* validações de deceased, burial-space, responsible, burial-link, search, report e pagination



\### Auth e usuários



Concluído:



\* Prisma singleton/server-only

\* helper de transação serializable

\* config Auth.js credentials

\* helper Argon2id

\* sessão/DAL

\* permissões/RBAC

\* proxy para rotas protegidas

\* endpoints:



&#x20; \* `POST /api/v1/auth/login`

&#x20; \* `POST /api/v1/auth/logout`

&#x20; \* `GET /api/v1/auth/me`

\* página de login:



&#x20; \* `jaziggo/app/(auth)/login/page.tsx`

&#x20; \* formulário provavelmente em `jaziggo/components/forms/login-form.tsx`

\* logger/auditoria de auth

\* DTO de usuário

\* UserService:



&#x20; \* criar/listar

&#x20; \* atualizar

&#x20; \* desativar logicamente

&#x20; \* detalhe por UUID

\* endpoints de usuário:



&#x20; \* `GET /api/v1/users`

&#x20; \* `POST /api/v1/users`

&#x20; \* `GET /api/v1/users/\[id]`

&#x20; \* `PUT /api/v1/users/\[id]`

&#x20; \* `PATCH /api/v1/users/\[id]/deactivate`

\* fixtures de usuários



\### Espaços cemiteriais



Concluído:



\* DTO de espaço com localização estruturada, `row` preservado e `activeLinkCount`

\* BurialSpaceService:



&#x20; \* criação com autorização operacional

&#x20; \* `locationKey`

&#x20; \* conflito de unicidade

&#x20; \* listagem paginada

&#x20; \* detalhe

&#x20; \* filtros

&#x20; \* contagem apenas de vínculos ativos

&#x20; \* transição confirmada de status

&#x20; \* validação transacional de vínculos ativos

&#x20; \* bloqueio de `OCCUPIED` manual

&#x20; \* atualização transacional de localização/capacidade

\* endpoints:



&#x20; \* `GET /api/v1/burial-spaces`

&#x20; \* `POST /api/v1/burial-spaces`

&#x20; \* `GET /api/v1/burial-spaces/\[id]`

&#x20; \* `PUT /api/v1/burial-spaces/\[id]`

&#x20; \* `PATCH /api/v1/burial-spaces/\[id]/status`

\* fixtures de `SEPULTURA` e `JAZIGO` cobrindo estados oficiais



\### Responsáveis



Concluído:



\* DTOs separados:



&#x20; \* lista: id, fullName, documento mascarado

&#x20; \* detalhe: contatos opcionais, vínculos, documento mascarado

\* ResponsibleService:



&#x20; \* criação validada

&#x20; \* atualização parcial

&#x20; \* listagem paginada por nome não sensível

&#x20; \* detalhe por ID

&#x20; \* seleção segura de campos

&#x20; \* DTO seguro

&#x20; \* criação e listagem de vínculo administrativo

&#x20; \* alvo exclusivo para falecido ou espaço

&#x20; \* rejeição de alvo inexistente

&#x20; \* rejeição de duplicidade sem gravação parcial

&#x20; \* consulta de vínculos históricos

&#x20; \* encerramento histórico de vínculo

\* endpoints:



&#x20; \* `GET /api/v1/responsibles`

&#x20; \* `POST /api/v1/responsibles`

&#x20; \* `POST /api/v1/responsibles/search-sensitive`

&#x20; \* `GET /api/v1/responsibles/\[id]`

&#x20; \* `PUT /api/v1/responsibles/\[id]`

&#x20; \* `POST /api/v1/responsibles/link`

&#x20; \* `POST/PATCH conforme task em /api/v1/responsible-links/\[id]/end`



\## Últimos commits esperados



Após T067, deve haver commit com mensagem parecida:



`Add responsible link end API handler`



Antes de continuar, confirmar:



```powershell

git status

```



Ideal:



```txt

nothing to commit, working tree clean

```



\## Como continuar



Próxima task: T068.



Prompt compacto recomendado para a próxima sessão:



```txt

Implemente somente a T068 de `specs/001-cemetery-management/tasks.md`.



Modo recomendado: high.



Leia `AGENTS.md`, `jaziggo/AGENTS.md`, a T068 no `tasks.md`, `spec.md`, `data-model.md`, `openapi.yaml`, `quickstart.md` e os arquivos relacionados ao módulo em `jaziggo/services/`, `jaziggo/app/api/v1/`, `jaziggo/lib/`, `jaziggo/types/` e `jaziggo/prisma/schema.prisma`.



Regras:

\- `tasks.md` é a fonte de verdade.

\- Implemente só T068; não implemente T069.

\- Se houver conflito entre prompt e `tasks.md`, siga o `tasks.md`.

\- Não altere schema, migrations, seed, banco, `.env` ou OpenAPI salvo exigência explícita.

\- Não exponha/logue segredos, senha, hash, token, DATABASE\_URL, AUTH\_SECRET, documento completo ou dados sensíveis.

\- Use apenas `ADMIN` e `EMPLOYEE`; não crie `ATTENDANT`.

\- Responsáveis, familiares e visitantes não têm acesso direto ao sistema.

\- Valide entrada no servidor, aplique autorização server-side e retorne DTO/envelopes seguros.

\- Preserve histórico; não delete fisicamente registros administrativos/históricos salvo exigência explícita.

\- Se envolver vínculo, preserve alvo exclusivo, status histórico e integridade transacional.



Valide com `npm run typecheck`, `npm run lint`, lint específico se útil e `git diff --check`.



Ao final, reporte escopo real, arquivos alterados, validações, T068 concluída e T069 não iniciada.

```



\## Comandos úteis



Rodar app:



```powershell

cd jaziggo

npm run dev

```



Abrir login:



```txt

http://localhost:3000/login

```



Verificar página de login:



```powershell

Test-Path -LiteralPath "jaziggo/app/(auth)/login/page.tsx"

```



Verificar estado Git:



```powershell

git status

```



Validações padrão:



```powershell

cd jaziggo

npm run typecheck

npm run lint

git diff --check

```



