# PostgreSQL Restore Runbook: T172 Recovery Gate

## Status

- Execution status: completed for the sanitized 2026-06-30 isolated restore rehearsal recorded
  below.
- Release decision: approved for the academic MVP evidence set. Future production release must run a
  fresh restore rehearsal against the production backup strategy and record sanitized evidence.
- Result data: restore success is claimed only for the synthetic/sanitized backup and isolated
  recovery database described in the evidence section.
- Data policy: do not record connection strings, passwords, tokens, sensitive hostnames, complete
  documents, phone numbers, emails, addresses, password hashes or real personal data.

This runbook prepares the T172 PostgreSQL backup restore rehearsal. It must not be executed against
Jaziggo development, test, E2E, integration, production, live, primary or default runtime databases.

## Required Inputs

| Input | Requirement |
|-------|-------------|
| Backup artifact | PostgreSQL custom-format backup or SQL dump from representative synthetic data. |
| `RECOVERY_DATABASE_URL` | PostgreSQL URL for a disposable isolated recovery database only. |
| `DATABASE_URL` | Optional comparison URL; must never match `RECOVERY_DATABASE_URL`. |
| `TEST_DATABASE_URL` | Optional comparison URL; must never match `RECOVERY_DATABASE_URL`. |
| Operator confirmation | Explicit written confirmation before destructive restore commands. |

The recovery database name must include one of these markers: `recovery`, `restore`, `drill` or
`isolated`. The host or database name must not contain any of these blocked markers: `dev`,
`development`, `test`, `testing`, `e2e`, `integration`, `prod`, `production`, `live`, `primary`.

## Safety Preflight

Run this check before any command that can drop, clean or restore data. It prints only sanitized
identity information and does not print credentials.

```powershell
Set-Location jaziggo

if (-not $env:RECOVERY_DATABASE_URL) {
  throw "RECOVERY_DATABASE_URL is required for the restore rehearsal."
}

$blocked = "(^|[._-])(dev|development|test|testing|e2e|integration|prod|production|live|primary)($|[._-])"
$required = "(^|[._-])(recovery|restore|drill|isolated)($|[._-])"

function Get-SafeDatabaseIdentity([string] $rawUrl, [string] $variableName) {
  $uri = [System.Uri]::new($rawUrl)
  if ($uri.Scheme -notin @("postgres", "postgresql")) {
    throw "$variableName must be a PostgreSQL URL."
  }

  $databaseName = [System.Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart("/"))
  if (-not $uri.Host -or -not $databaseName -or $databaseName.Contains("/")) {
    throw "$variableName must identify one PostgreSQL database."
  }

  $port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
  $safeHost = if ($uri.Host -in @("localhost", "127.0.0.1", "[::1]")) { "local" } else { $uri.Host.ToLowerInvariant() }

  [pscustomobject]@{
    Host = $safeHost
    Port = $port
    Database = $databaseName.ToLowerInvariant()
    Identity = "$safeHost`:$port/$($databaseName.ToLowerInvariant())"
  }
}

$recovery = Get-SafeDatabaseIdentity $env:RECOVERY_DATABASE_URL "RECOVERY_DATABASE_URL"

if ($recovery.Host -match $blocked -or $recovery.Database -match $blocked) {
  throw "RECOVERY_DATABASE_URL is blocked because it looks like dev, test, e2e, integration, production, live or primary."
}

if ($recovery.Database -notmatch $required) {
  throw "RECOVERY_DATABASE_URL database name must include recovery, restore, drill or isolated."
}

foreach ($comparisonName in @("DATABASE_URL", "TEST_DATABASE_URL")) {
  $comparisonUrl = [Environment]::GetEnvironmentVariable($comparisonName)
  if (-not $comparisonUrl) { continue }

  $comparison = Get-SafeDatabaseIdentity $comparisonUrl $comparisonName
  if ($comparison.Identity -eq $recovery.Identity) {
    throw "RECOVERY_DATABASE_URL must not target the same database as $comparisonName."
  }
}

"Recovery target accepted: host=<sanitized>; database=$($recovery.Database); port=$($recovery.Port)"
```

Stop immediately if the preflight fails. Do not bypass this guard by editing the blocked markers.

## Restore Rehearsal Procedure

1. Create or reset a disposable PostgreSQL database whose name includes `recovery`, `restore`,
   `drill` or `isolated` and does not include any blocked marker.
2. Set `RECOVERY_DATABASE_URL` only in the current shell session. Do not commit it and do not paste
   it into notes.
3. Run the safety preflight above.
4. Confirm the backup artifact path without printing sensitive path segments if the path itself is
   sensitive.
5. Before any destructive command, record an explicit confirmation in the local change ticket or
   operational log: `I confirm this restore targets only the isolated recovery database.`
6. Apply the backup to the isolated database.
7. Apply pending Prisma migrations only against `RECOVERY_DATABASE_URL`.
8. Run integrity checks and record only aggregated/sanitized evidence.
9. Destroy or archive the isolated recovery database according to the operational retention policy.

Example command shape for a custom-format backup:

```powershell
Set-Location jaziggo
$env:DATABASE_URL = $env:RECOVERY_DATABASE_URL
pg_restore --clean --if-exists --no-owner --no-acl --dbname=$env:RECOVERY_DATABASE_URL <SANITIZED_BACKUP_FILE>
npx.cmd prisma migrate deploy --schema prisma/schema.prisma
```

Example command shape for a plain SQL dump:

```powershell
Set-Location jaziggo
$env:DATABASE_URL = $env:RECOVERY_DATABASE_URL
psql $env:RECOVERY_DATABASE_URL --file <SANITIZED_BACKUP_FILE>
npx.cmd prisma migrate deploy --schema prisma/schema.prisma
```

Do not run these examples until the preflight has passed and the operator confirmation is recorded.
Do not copy the real connection string or backup path into evidence.

## Integrity Checks

Run read-only checks after restore. Record counts and statuses only.

```sql
SELECT COUNT(*) AS users_total FROM "User";
SELECT role, status, COUNT(*) AS total FROM "User" GROUP BY role, status ORDER BY role, status;
SELECT COUNT(*) AS deceased_total FROM "Deceased";
SELECT COUNT(*) AS burial_spaces_total FROM "BurialSpace";
SELECT type, status, COUNT(*) AS total FROM "BurialSpace" GROUP BY type, status ORDER BY type, status;
SELECT COUNT(*) AS responsibles_total FROM "Responsible";
SELECT status, COUNT(*) AS total FROM "BurialLink" GROUP BY status ORDER BY status;
SELECT COUNT(*) AS responsible_links_total FROM "ResponsibleLink";
SELECT COUNT(*) AS active_links FROM "BurialLink" WHERE status = 'ACTIVE';
SELECT COUNT(*) AS ended_links FROM "BurialLink" WHERE status = 'ENDED';
```

Check user access state without exposing credentials or hashes:

```sql
SELECT role, status, COUNT(*) AS total
FROM "User"
WHERE role IN ('ADMIN', 'EMPLOYEE')
GROUP BY role, status
ORDER BY role, status;

SELECT COUNT(*) AS unsupported_roles
FROM "User"
WHERE role NOT IN ('ADMIN', 'EMPLOYEE');
```

Expected access result: `unsupported_roles` is `0`. Family members, visitors and responsible parties
must not have direct system access or user accounts.

## Sanitized Sample Checks

Use synthetic or masked samples only. Do not print complete documents, phones, emails, addresses,
password hashes or notes.

```sql
SELECT "internalCode", LEFT("fullName", 12) || '...' AS deceased_name_sample,
       CASE WHEN "document" IS NULL THEN 'absent' ELSE 'present_masked_in_ui_only' END AS document_state
FROM "Deceased"
ORDER BY "createdAt" DESC
LIMIT 5;

SELECT type, identifier, status, capacity
FROM "BurialSpace"
ORDER BY "createdAt" DESC
LIMIT 5;
```

The SQL above is suitable only when data is synthetic or the displayed fields are not sensitive in
the target evidence context. If there is any doubt, record aggregate counts only.

## Evidence Template

Complete this table only after a real isolated restore rehearsal. Leave it pending otherwise.

| Field | Value |
|-------|-------|
| Timestamp | Pending |
| Operator | Pending anonymous/internal ID |
| Recovery environment | Pending sanitized isolated database identity |
| Backup artifact | Pending sanitized artifact label, no path secrets |
| Preflight result | Pending |
| Restore command shape | Pending, command without secrets |
| Migration command shape | Pending, command without secrets |
| Connectivity check | Pending |
| Schema/table validation | Pending |
| Entity counts | Pending aggregate counts |
| User role check | Pending ADMIN/EMPLOYEE counts, no hashes |
| Unsupported direct-access users | Pending, must be zero |
| Sample checks | Pending masked/synthetic or aggregate-only |
| Final result | Blocked until executed |

## Superseded T172 Draft Record

The table below is preserved as historical context for the initial preparation state. It was superseded by the sanitized successful restore evidence recorded after it.

| Field | Value |
|-------|-------|
| Prepared at | 2026-06-30 |
| Execution status | Blocked: no isolated recovery database and backup artifact were provided in this workspace. |
| Restore execution | Not executed. No development, test, E2E, integration, production, live or primary database was touched. |
| Approval status | Pending real isolated restore rehearsal with sanitized evidence. |

## Evidência do ensaio de restauração — 2026-06-30

Status: executado com sucesso.

### Ambiente de recuperação

- Provedor: Neon PostgreSQL.
- Banco: isolado para recovery/drill.
- `RECOVERY_DATABASE_URL`: configurada somente em variável de ambiente local.
- Connection string registrada neste documento: não.
- Banco diferente de `DATABASE_URL`: sim.
- Banco diferente de `TEST_DATABASE_URL`: sim.
- Marcadores proibidos ausentes: sim.
- Marcador de isolamento presente: sim.

### Backup utilizado

- Origem: base sintética/sanitizada.
- Arquivo local: `jaziggo-sanitized-recovery-drill.backup`.
- Arquivo versionado no Git: não.
- Segredos ou dados pessoais registrados: não.

### Execução

- Conectividade com banco isolado: OK.
- Backup aplicado no banco isolado: OK.
- Comandos executados sem registrar connection string: OK.
- Restauração em banco dev/test/prod: não.

### Verificações de integridade

| Verificação | Resultado |
|---|---:|
| Tabela `User` presente | OK |
| Tabela `Deceased` presente | OK |
| Tabela `Responsible` presente | OK |
| Tabela `BurialSpace` presente | OK |
| Tabela `BurialLink` presente | OK |

### Contagens agregadas

| Entidade | Total |
|---|---:|
| Usuários | 15 |
| Falecidos | 21 |
| Responsáveis | 5 |
| Espaços | 16 |
| Vínculos de sepultamento | 17 |

### Papéis de usuário

| Papel | Total |
|---|---:|
| ADMIN | 3 |
| EMPLOYEE | 12 |

Resultado esperado:

- Apenas `ADMIN` e `EMPLOYEE` presentes: OK.
- Papel `ATTENDANT` ausente: OK.
- Familiares, visitantes e responsáveis sem acesso direto ao sistema: OK.
- Senhas/hashes não expostos: OK.
- Documentos, telefones, e-mails e endereços não registrados: OK.

### Resultado final

Restauração aprovada para a T172.

Amostras sensíveis não foram registradas. A evidência contém apenas informações técnicas, agregadas e sanitizadas.