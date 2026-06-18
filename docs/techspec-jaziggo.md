# Template de Especificação Técnica

## Resumo Executivo

A solução será implementada como uma aplicação web full-stack, voltada para uso administrativo interno do cemitério, utilizando uma arquitetura baseada em Next.js, TypeScript, banco de dados relacional PostgreSQL e Prisma ORM. A aplicação concentrará em um único sistema os módulos de autenticação, controle de acesso por perfil, cadastro de falecidos, gestão de sepulturas e jazigos, cadastro de responsáveis, busca/localização e relatórios administrativos. A escolha por uma arquitetura web centralizada permite acesso por navegadores modernos, facilita a manutenção do sistema e garante maior consistência entre os dados cadastrados.

A estratégia de implementação será baseada em módulos funcionais independentes, porém integrados por meio de um modelo relacional que preserve os vínculos entre falecidos, responsáveis, sepulturas e jazigos. O sistema terá autenticação obrigatória e autorização por perfil, diferenciando administradores e funcionários, sem disponibilizar consulta pública direta para familiares ou visitantes. As operações principais serão protegidas por validações de dados, regras de integridade, controle de status dos espaços e filtros de busca eficientes, priorizando a rapidez no atendimento e a segurança das informações sensíveis armazenadas.


## Arquitetura do Sistema

### Visão Geral dos Componentes

O sistema será organizado em componentes principais que representam as áreas funcionais do Jaziggo e suas responsabilidades dentro da aplicação. A arquitetura será composta por uma camada de interface web, uma camada de regras de negócio, uma camada de persistência de dados e módulos funcionais específicos para autenticação, usuários, falecidos, sepulturas/jazigos, responsáveis, busca/localização e relatórios.

#### Componentes principais

**Interface Web**

Responsável por apresentar as telas do sistema aos usuários autenticados, incluindo login, painel inicial, formulários de cadastro, listagens, filtros, telas de detalhes e relatórios. Essa camada será utilizada por administradores e funcionários do cemitério, sem acesso público direto para familiares ou visitantes.

**Autenticação e Controle de Acesso**

Responsável por validar o login dos usuários e controlar quais funcionalidades cada perfil pode acessar. O administrador terá acesso ao gerenciamento de usuários e relatórios administrativos, enquanto o funcionário terá acesso às operações de cadastro, consulta, atualização e localização necessárias para a rotina do cemitério.

**Módulo de Usuários**

Responsável pelo cadastro, edição, desativação e gerenciamento dos usuários internos do sistema. Esse componente se relaciona diretamente com o componente de autenticação e controle de acesso, pois cada usuário terá um perfil associado.

**Módulo de Falecidos**

Responsável pelo cadastro, edição, consulta e organização dos registros de pessoas falecidas. Esse componente armazenará dados como nome, documento quando disponível, datas relevantes, observações e vínculos com sepulturas, jazigos e responsáveis.

**Módulo de Sepulturas e Jazigos**

Responsável pelo cadastro e controle dos espaços físicos do cemitério, incluindo dados de localização, identificação e status. Esse componente permitirá controlar se um espaço está disponível, ocupado, reservado ou inativo, além de manter o vínculo com um ou mais falecidos, conforme as regras definidas.

**Módulo de Responsáveis**

Responsável pelo cadastro e gerenciamento das pessoas vinculadas administrativamente a falecidos, sepulturas ou jazigos. Esse componente armazenará informações como nome, telefone, e-mail, documento e endereço, quando aplicável.

**Módulo de Busca e Localização**

Responsável por permitir a pesquisa de falecidos e a localização da sepultura ou jazigo correspondente. Esse componente utilizará dados dos módulos de falecidos, responsáveis e sepulturas/jazigos para retornar resultados filtrados por nome, documento, datas, responsável ou localização.

**Módulo de Relatórios**

Responsável por gerar visualizações administrativas com base nos dados internos do sistema. Os relatórios poderão apresentar falecidos cadastrados, sepultamentos por período, ocupação dos espaços e distribuição de sepulturas ou jazigos por status.

**Banco de Dados Relacional**

Responsável por armazenar de forma centralizada e consistente todos os dados do sistema, incluindo usuários, perfis, falecidos, responsáveis, sepulturas, jazigos, vínculos e informações utilizadas nos relatórios. O modelo relacional será essencial para preservar a integridade entre os registros.

#### Relacionamentos principais entre componentes

A Interface Web se comunica com os módulos funcionais da aplicação para executar operações de cadastro, edição, consulta, busca e geração de relatórios. Antes de acessar qualquer funcionalidade interna, o usuário passa pelo componente de Autenticação e Controle de Acesso, que valida sua identidade e permissões.

O Módulo de Falecidos se relaciona diretamente com o Módulo de Sepulturas e Jazigos, pois cada falecido pode estar vinculado a um local de sepultamento. Também se relaciona com o Módulo de Responsáveis, permitindo associar uma pessoa responsável ao registro do falecido, da sepultura ou do jazigo.

O Módulo de Busca e Localização consulta informações combinadas dos módulos de Falecidos, Sepulturas/Jazigos e Responsáveis para encontrar registros compatíveis e exibir a localização correspondente. Já o Módulo de Relatórios utiliza dados consolidados desses mesmos módulos para apresentar informações administrativas ao administrador.

#### Visão geral do fluxo de dados

O fluxo de dados começa quando um usuário autenticado acessa a aplicação pela Interface Web. Após o login, o sistema identifica o perfil do usuário e libera apenas as funcionalidades permitidas. Quando um funcionário cadastra ou atualiza um falecido, responsável, sepultura ou jazigo, os dados são validados pela aplicação e persistidos no banco de dados relacional.

Ao vincular um falecido a uma sepultura ou jazigo, o sistema registra esse relacionamento e atualiza o status do espaço conforme a regra de ocupação definida. Nas consultas de localização, o usuário informa critérios de busca, o sistema pesquisa os registros correspondentes no banco de dados e retorna os dados necessários para identificar o falecido e apresentar sua localização. Nos relatórios, o sistema aplica os filtros selecionados pelo administrador, consulta os dados armazenados e exibe os resultados diretamente na aplicação.


## Design de Implementação

### Interfaces Principais

As interfaces principais representam os contratos dos serviços internos da aplicação. Elas definem as operações centrais de cada módulo e ajudam a separar as regras de negócio da camada de interface web e da camada de persistência de dados.

```ts
interface AuthService {
  login(input: LoginInput): Promise<AuthSession>;
  logout(userId: string): Promise<void>;
  getCurrentUser(userId: string): Promise<User>;
  validatePermission(userId: string, permission: Permission): Promise<boolean>;
}
```

```ts
interface UserService {
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: string, input: UpdateUserInput): Promise<User>;
  deactivateUser(id: string): Promise<void>;
  listUsers(filters?: UserFilters): Promise<User[]>;
  getUserById(id: string): Promise<User>;
}
```

```ts
interface DeceasedService {
  createDeceased(input: CreateDeceasedInput): Promise<Deceased>;
  updateDeceased(id: string, input: UpdateDeceasedInput): Promise<Deceased>;
  getDeceasedById(id: string): Promise<DeceasedDetails>;
  searchDeceased(filters: DeceasedSearchFilters): Promise<Deceased[]>;
  checkPossibleDuplicates(input: CreateDeceasedInput): Promise<Deceased[]>;
}
```

```ts
interface BurialSpaceService {
  createSpace(input: CreateBurialSpaceInput): Promise<BurialSpace>;
  updateSpace(id: string, input: UpdateBurialSpaceInput): Promise<BurialSpace>;
  getSpaceById(id: string): Promise<BurialSpaceDetails>;
  listSpaces(filters?: BurialSpaceFilters): Promise<BurialSpace[]>;
  updateSpaceStatus(id: string, status: BurialSpaceStatus): Promise<BurialSpace>;
}
```

```ts
interface ResponsibleService {
  createResponsible(input: CreateResponsibleInput): Promise<Responsible>;
  updateResponsible(id: string, input: UpdateResponsibleInput): Promise<Responsible>;
  getResponsibleById(id: string): Promise<ResponsibleDetails>;
  searchResponsible(filters: ResponsibleSearchFilters): Promise<Responsible[]>;
  linkResponsible(input: LinkResponsibleInput): Promise<void>;
}
```

```ts
interface BurialLinkService {
  linkDeceasedToSpace(input: LinkDeceasedToSpaceInput): Promise<BurialLink>;
  unlinkDeceasedFromSpace(linkId: string): Promise<void>;
  getLinksBySpace(spaceId: string): Promise<BurialLink[]>;
  getLinksByDeceased(deceasedId: string): Promise<BurialLink[]>;
  validateSpaceAvailability(spaceId: string): Promise<boolean>;
}
```

```ts
interface LocationSearchService {
  searchByDeceased(filters: LocationSearchFilters): Promise<LocationSearchResult[]>;
  searchByResponsible(filters: ResponsibleLocationFilters): Promise<LocationSearchResult[]>;
  getLocationDetails(deceasedId: string): Promise<LocationDetails>;
}
```

```ts
interface ReportService {
  generateDeceasedReport(filters: DeceasedReportFilters): Promise<ReportResult>;
  generateBurialPeriodReport(filters: BurialPeriodReportFilters): Promise<ReportResult>;
  generateSpaceOccupationReport(filters: SpaceOccupationFilters): Promise<ReportResult>;
  generateSpaceStatusReport(filters: SpaceStatusReportFilters): Promise<ReportResult>;
}
```

```ts
interface AuditValidationService {
  validateRequiredFields(input: unknown, rules: ValidationRules): Promise<ValidationResult>;
  validateUserAccess(userId: string, resource: ResourceType): Promise<boolean>;
  validateEntityExists(entityType: EntityType, id: string): Promise<boolean>;
}
```

Essas interfaces serão implementadas por serviços internos da aplicação e utilizadas pelas rotas, páginas ou server actions do Next.js. Cada serviço será responsável por aplicar validações, regras de negócio e chamadas ao banco de dados por meio do Prisma ORM, mantendo a aplicação organizada por domínio funcional.


### Modelos de Dados

Os modelos de dados representam as principais entidades do domínio do Jaziggo e seus relacionamentos. Como o sistema será baseado em uma aplicação web com banco relacional, os dados serão estruturados para preservar a integridade dos vínculos entre usuários, falecidos, responsáveis, sepulturas e jazigos.

#### Entidades de Domínio Principais

```ts id="g9sxk2"
type UserRole = "ADMIN" | "EMPLOYEE";

type UserStatus = "ACTIVE" | "INACTIVE";

interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

```ts id="bqx219"
interface Deceased {
  id: string;
  fullName: string;
  document?: string;
  birthDate?: Date;
  deathDate?: Date;
  burialDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

```ts id="mql0ko"
type BurialSpaceType = "SEPULTURA" | "JAZIGO";

type BurialSpaceStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "INACTIVE";

interface BurialSpace {
  id: string;
  type: BurialSpaceType;
  identifier: string;
  sector?: string;
  block?: string;
  street?: string;
  row?: string;
  number?: string;
  complement?: string;
  status: BurialSpaceStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

```ts id="71sahj"
interface Responsible {
  id: string;
  fullName: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

```ts id="u2ro95"
interface BurialLink {
  id: string;
  deceasedId: string;
  burialSpaceId: string;
  responsibleId?: string;
  burialDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

```ts id="yhf46f"
type ResponsibleLinkType = "DECEASED" | "BURIAL_SPACE";

interface ResponsibleLink {
  id: string;
  responsibleId: string;
  deceasedId?: string;
  burialSpaceId?: string;
  linkType: ResponsibleLinkType;
  createdAt: Date;
}
```

#### Tipos de Requisição e Resposta

```ts id="wgjdwn"
interface CreateDeceasedInput {
  fullName: string;
  document?: string;
  birthDate?: Date;
  deathDate?: Date;
  burialDate?: Date;
  notes?: string;
  burialSpaceId?: string;
  responsibleId?: string;
}
```

```ts id="7t13s9"
interface CreateBurialSpaceInput {
  type: BurialSpaceType;
  identifier: string;
  sector?: string;
  block?: string;
  street?: string;
  row?: string;
  number?: string;
  complement?: string;
  status: BurialSpaceStatus;
}
```

```ts id="n6l99s"
interface CreateResponsibleInput {
  fullName: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
}
```

```ts id="v9ivbq"
interface LocationSearchFilters {
  deceasedName?: string;
  deceasedDocument?: string;
  responsibleName?: string;
  responsibleDocument?: string;
  deathDate?: Date;
  burialDate?: Date;
  sector?: string;
  burialSpaceIdentifier?: string;
}
```

```ts id="5nfit0"
interface LocationSearchResult {
  deceasedId: string;
  deceasedName: string;
  deathDate?: Date;
  burialDate?: Date;
  responsibleName?: string;
  burialSpaceId: string;
  burialSpaceType: BurialSpaceType;
  locationDescription: string;
  status: BurialSpaceStatus;
}
```

```ts id="3p20u4"
interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: BurialSpaceStatus;
  sector?: string;
  type?: BurialSpaceType;
}
```

```ts id="x5axjl"
interface ReportResult<T = unknown> {
  title: string;
  generatedAt: Date;
  filters: ReportFilters;
  totalRecords: number;
  data: T[];
}
```

#### Esquema de Banco de Dados

O banco de dados será relacional, utilizando PostgreSQL com Prisma ORM. A estrutura abaixo representa uma versão inicial do schema, suficiente para cobrir os módulos principais do sistema.

```prisma id="f8pe7m"
enum UserRole {
  ADMIN
  EMPLOYEE
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

model User {
  id           String     @id @default(uuid())
  name         String
  email        String     @unique
  passwordHash String
  role         UserRole
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
```

```prisma id="duj6sn"
model Deceased {
  id          String       @id @default(uuid())
  fullName    String
  document    String?
  birthDate   DateTime?
  deathDate   DateTime?
  burialDate  DateTime?
  notes       String?
  burialLinks BurialLink[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([fullName])
  @@index([document])
  @@index([deathDate])
  @@index([burialDate])
}
```

```prisma id="3mgl6z"
enum BurialSpaceType {
  SEPULTURA
  JAZIGO
}

enum BurialSpaceStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
  INACTIVE
}

model BurialSpace {
  id          String            @id @default(uuid())
  type        BurialSpaceType
  identifier  String
  sector      String?
  block       String?
  street      String?
  row         String?
  number      String?
  complement  String?
  status      BurialSpaceStatus @default(AVAILABLE)
  burialLinks BurialLink[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([identifier])
  @@index([sector])
  @@index([status])
}
```

```prisma id="2qyr7x"
model Responsible {
  id          String            @id @default(uuid())
  fullName    String
  document    String?
  phone       String?
  email       String?
  address     String?
  burialLinks BurialLink[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([fullName])
  @@index([document])
  @@index([phone])
}
```

```prisma id="8u6ix1"
model BurialLink {
  id             String       @id @default(uuid())
  deceasedId     String
  burialSpaceId  String
  responsibleId  String?
  burialDate     DateTime?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  deceased       Deceased     @relation(fields: [deceasedId], references: [id])
  burialSpace    BurialSpace  @relation(fields: [burialSpaceId], references: [id])
  responsible    Responsible? @relation(fields: [responsibleId], references: [id])

  @@index([deceasedId])
  @@index([burialSpaceId])
  @@index([responsibleId])
}
```

#### Observações sobre o Modelo

O campo `document` será opcional para falecidos, pois registros antigos podem não possuir CPF ou documento cadastrado. Para responsáveis, o documento também será opcional inicialmente, mas deverá ser utilizado sempre que disponível para diferenciar pessoas com nomes iguais ou semelhantes.

A entidade `BurialLink` representa o vínculo entre um falecido e uma sepultura ou jazigo. Essa separação permite preservar histórico de uso dos espaços e facilita futuras regras para jazigos familiares ou múltiplos sepultamentos no mesmo local.

O status de uma sepultura ou jazigo será controlado pelo campo `status` em `BurialSpace`. Quando um falecido for vinculado a um espaço, a aplicação deverá atualizar esse status conforme a regra de ocupação definida.

Os índices nos campos `fullName`, `document`, `status`, `sector`, `deathDate` e `burialDate` serão utilizados para melhorar o desempenho das buscas, filtros e relatórios administrativos.


### Endpoints de API

A API será organizada em endpoints REST internos da aplicação, utilizando o prefixo `/api/v1`. Todos os endpoints administrativos deverão exigir autenticação, exceto o endpoint de login. As permissões serão verificadas de acordo com o perfil do usuário autenticado, diferenciando administradores e funcionários.

As respostas seguirão, preferencialmente, um formato padronizado:

```ts
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};
```

---

#### Autenticação

| Método | Caminho               | Descrição                                | Requisição/Resposta          |
| ------ | --------------------- | ---------------------------------------- | ---------------------------- |
| `POST` | `/api/v1/auth/login`  | Realiza login do usuário no sistema.     | `LoginInput` → `AuthSession` |
| `POST` | `/api/v1/auth/logout` | Encerra a sessão do usuário autenticado. | `void` → `void`              |
| `GET`  | `/api/v1/auth/me`     | Retorna os dados do usuário autenticado. | `void` → `User`              |

Exemplo de requisição para login:

```ts
type LoginInput = {
  email: string;
  password: string;
};
```

Exemplo de resposta:

```ts
type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "EMPLOYEE";
  };
};
```

---

#### Usuários

| Método  | Caminho                        | Descrição                                               | Requisição/Resposta        |
| ------- | ------------------------------ | ------------------------------------------------------- | -------------------------- |
| `GET`   | `/api/v1/users`                | Lista usuários cadastrados, com filtros opcionais.      | `UserFilters` → `User[]`   |
| `GET`   | `/api/v1/users/:id`            | Retorna detalhes de um usuário específico.              | `id` → `User`              |
| `POST`  | `/api/v1/users`                | Cadastra um novo usuário. Apenas administradores.       | `CreateUserInput` → `User` |
| `PUT`   | `/api/v1/users/:id`            | Atualiza dados de um usuário. Apenas administradores.   | `UpdateUserInput` → `User` |
| `PATCH` | `/api/v1/users/:id/deactivate` | Desativa um usuário cadastrado. Apenas administradores. | `id` → `void`              |

Exemplo de criação de usuário:

```ts
type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "EMPLOYEE";
};
```

---

#### Falecidos

| Método | Caminho                             | Descrição                                                  | Requisição/Resposta                    |
| ------ | ----------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `GET`  | `/api/v1/deceased`                  | Lista ou pesquisa falecidos com filtros.                   | `DeceasedSearchFilters` → `Deceased[]` |
| `GET`  | `/api/v1/deceased/:id`              | Retorna detalhes de um falecido.                           | `id` → `DeceasedDetails`               |
| `POST` | `/api/v1/deceased`                  | Cadastra um novo falecido.                                 | `CreateDeceasedInput` → `Deceased`     |
| `PUT`  | `/api/v1/deceased/:id`              | Atualiza dados de um falecido.                             | `UpdateDeceasedInput` → `Deceased`     |
| `POST` | `/api/v1/deceased/check-duplicates` | Verifica possíveis registros duplicados antes do cadastro. | `CreateDeceasedInput` → `Deceased[]`   |

Exemplo de criação de falecido:

```ts
type CreateDeceasedInput = {
  fullName: string;
  document?: string;
  birthDate?: string;
  deathDate?: string;
  burialDate?: string;
  notes?: string;
  burialSpaceId?: string;
  responsibleId?: string;
};
```

---

#### Sepulturas e Jazigos

| Método  | Caminho                              | Descrição                                             | Requisição/Resposta                            |
| ------- | ------------------------------------ | ----------------------------------------------------- | ---------------------------------------------- |
| `GET`   | `/api/v1/burial-spaces`              | Lista sepulturas e jazigos com filtros opcionais.     | `BurialSpaceFilters` → `BurialSpace[]`         |
| `GET`   | `/api/v1/burial-spaces/:id`          | Retorna detalhes de uma sepultura ou jazigo.          | `id` → `BurialSpaceDetails`                    |
| `POST`  | `/api/v1/burial-spaces`              | Cadastra uma nova sepultura ou jazigo.                | `CreateBurialSpaceInput` → `BurialSpace`       |
| `PUT`   | `/api/v1/burial-spaces/:id`          | Atualiza dados de uma sepultura ou jazigo.            | `UpdateBurialSpaceInput` → `BurialSpace`       |
| `PATCH` | `/api/v1/burial-spaces/:id/status`   | Atualiza o status de uma sepultura ou jazigo.         | `UpdateBurialSpaceStatusInput` → `BurialSpace` |
| `GET`   | `/api/v1/burial-spaces/:id/deceased` | Lista falecidos vinculados a uma sepultura ou jazigo. | `id` → `Deceased[]`                            |

Exemplo de criação de sepultura ou jazigo:

```ts
type CreateBurialSpaceInput = {
  type: "SEPULTURA" | "JAZIGO";
  identifier: string;
  sector?: string;
  block?: string;
  street?: string;
  row?: string;
  number?: string;
  complement?: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "INACTIVE";
};
```

---

#### Responsáveis

| Método | Caminho                     | Descrição                                                  | Requisição/Resposta                          |
| ------ | --------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `GET`  | `/api/v1/responsibles`      | Lista ou pesquisa responsáveis cadastrados.                | `ResponsibleSearchFilters` → `Responsible[]` |
| `GET`  | `/api/v1/responsibles/:id`  | Retorna detalhes de um responsável.                        | `id` → `ResponsibleDetails`                  |
| `POST` | `/api/v1/responsibles`      | Cadastra um novo responsável.                              | `CreateResponsibleInput` → `Responsible`     |
| `PUT`  | `/api/v1/responsibles/:id`  | Atualiza dados de um responsável.                          | `UpdateResponsibleInput` → `Responsible`     |
| `POST` | `/api/v1/responsibles/link` | Vincula um responsável a um falecido, sepultura ou jazigo. | `LinkResponsibleInput` → `void`              |

Exemplo de criação de responsável:

```ts
type CreateResponsibleInput = {
  fullName: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
};
```

---

#### Vínculos de Sepultamento

| Método   | Caminho                                        | Descrição                                                      | Requisição/Resposta                       |
| -------- | ---------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `POST`   | `/api/v1/burial-links`                         | Vincula um falecido a uma sepultura ou jazigo.                 | `LinkDeceasedToSpaceInput` → `BurialLink` |
| `DELETE` | `/api/v1/burial-links/:id`                     | Remove ou desativa um vínculo de sepultamento.                 | `id` → `void`                             |
| `GET`    | `/api/v1/burial-links/by-space/:spaceId`       | Lista vínculos de uma sepultura ou jazigo.                     | `spaceId` → `BurialLink[]`                |
| `GET`    | `/api/v1/burial-links/by-deceased/:deceasedId` | Lista vínculos de um falecido.                                 | `deceasedId` → `BurialLink[]`             |
| `GET`    | `/api/v1/burial-links/validate-space/:spaceId` | Verifica se uma sepultura ou jazigo pode receber novo vínculo. | `spaceId` → `SpaceAvailabilityResult`     |

Exemplo de vínculo:

```ts
type LinkDeceasedToSpaceInput = {
  deceasedId: string;
  burialSpaceId: string;
  responsibleId?: string;
  burialDate?: string;
};
```

---

#### Busca e Localização

| Método | Caminho                               | Descrição                                                  | Requisição/Resposta                                |
| ------ | ------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| `GET`  | `/api/v1/location-search`             | Pesquisa falecidos e retorna dados de localização.         | `LocationSearchFilters` → `LocationSearchResult[]` |
| `GET`  | `/api/v1/location-search/:deceasedId` | Retorna detalhes de localização de um falecido específico. | `deceasedId` → `LocationDetails`                   |

Exemplo de filtros de busca:

```ts
type LocationSearchFilters = {
  deceasedName?: string;
  deceasedDocument?: string;
  responsibleName?: string;
  responsibleDocument?: string;
  deathDate?: string;
  burialDate?: string;
  sector?: string;
  burialSpaceIdentifier?: string;
};
```

Exemplo de resposta:

```ts
type LocationSearchResult = {
  deceasedId: string;
  deceasedName: string;
  deathDate?: string;
  burialDate?: string;
  responsibleName?: string;
  burialSpaceId: string;
  burialSpaceType: "SEPULTURA" | "JAZIGO";
  locationDescription: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "INACTIVE";
};
```

---

#### Relatórios Administrativos

| Método | Caminho                             | Descrição                                           | Requisição/Resposta              |
| ------ | ----------------------------------- | --------------------------------------------------- | -------------------------------- |
| `GET`  | `/api/v1/reports/deceased`          | Gera relatório de falecidos cadastrados.            | `ReportFilters` → `ReportResult` |
| `GET`  | `/api/v1/reports/burials-by-period` | Gera relatório de sepultamentos por período.        | `ReportFilters` → `ReportResult` |
| `GET`  | `/api/v1/reports/space-occupation`  | Gera relatório de ocupação de sepulturas e jazigos. | `ReportFilters` → `ReportResult` |
| `GET`  | `/api/v1/reports/space-status`      | Gera relatório de espaços por status.               | `ReportFilters` → `ReportResult` |

Exemplo de filtros de relatório:

```ts
type ReportFilters = {
  startDate?: string;
  endDate?: string;
  status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "INACTIVE";
  sector?: string;
  type?: "SEPULTURA" | "JAZIGO";
};
```

Exemplo de resposta de relatório:

```ts
type ReportResult<T = unknown> = {
  title: string;
  generatedAt: string;
  filters: ReportFilters;
  totalRecords: number;
  data: T[];
};
```

---

#### Observações Gerais

Todos os endpoints, exceto `/api/v1/auth/login`, deverão exigir usuário autenticado.

Endpoints de gerenciamento de usuários e relatórios administrativos deverão ser restritos ao perfil `ADMIN`.

Endpoints operacionais de cadastro, consulta, edição, busca e localização poderão ser acessados por usuários `ADMIN` e `EMPLOYEE`, respeitando as permissões definidas.

As operações de criação e atualização deverão validar campos obrigatórios, formatos de dados, existência de entidades relacionadas e regras de vínculo entre falecidos, responsáveis, sepulturas e jazigos.

As respostas de erro deverão utilizar mensagens claras para facilitar a correção pelo usuário, especialmente em casos de campos obrigatórios, registros duplicados, ausência de resultados ou tentativa de vínculo inválido.


## Pontos de Integração

Para o escopo atual do Jaziggo, não há integrações externas obrigatórias previstas. O sistema será implementado como uma aplicação web independente, utilizando apenas seus próprios módulos internos e banco de dados para autenticação, cadastro, consulta, localização e geração de relatórios administrativos.

A aplicação não dependerá de APIs externas, sistemas municipais, cartórios, órgãos públicos, plataformas financeiras, serviços de notificação, mapas, geolocalização ou sistemas de terceiros. Todos os dados utilizados nas funcionalidades principais serão cadastrados e mantidos internamente pelo próprio sistema.

### Serviços ou APIs Externos

Não se aplica ao escopo atual.

O sistema não realizará integração com:

* Cartórios;
* Prefeituras;
* Sistemas municipais;
* Sistemas funerários;
* Serviços financeiros;
* Serviços de envio de e-mail, SMS ou WhatsApp;
* APIs de mapas ou geolocalização;
* Bases públicas ou governamentais de validação de documentos.

### Requisitos de Autenticação

Como não há integrações externas nesta etapa, não haverá necessidade de autenticação com serviços de terceiros, chaves de API, tokens externos, OAuth externo ou credenciais de sistemas integrados.

A autenticação prevista será apenas interna, voltada aos usuários administrativos do Jaziggo. O acesso ao sistema será restrito a administradores e funcionários cadastrados, com controle de permissões baseado no perfil do usuário.

### Abordagem de Tratamento de Erros

Como não haverá dependência de serviços externos, o tratamento de erros será concentrado nas operações internas da aplicação, como validação de dados, autenticação, autorização, acesso ao banco de dados e regras de negócio.

Os principais cenários de erro previstos são:

* Credenciais inválidas no login;
* Usuário sem permissão para acessar determinada funcionalidade;
* Campos obrigatórios não preenchidos;
* Tentativa de cadastro de registros duplicados;
* Tentativa de vínculo com falecido, responsável, sepultura ou jazigo inexistente;
* Tentativa de vincular falecido a um espaço indisponível ou ocupado, quando a regra de ocupação não permitir;
* Ausência de resultados em buscas ou relatórios;
* Falhas internas de persistência ou consulta no banco de dados.

Caso integrações externas sejam adicionadas em versões futuras, cada integração deverá ser especificada em uma nova etapa técnica, incluindo serviço utilizado, método de autenticação, formato de requisição e resposta, limites de uso, tratamento de falhas, política de retentativas e mensagens de erro exibidas ao usuário.


## Abordagem de Testes

### Testes Unitários

Os testes unitários terão como objetivo validar isoladamente as regras de negócio, validações e comportamentos principais dos serviços internos da aplicação. Como o Jaziggo será organizado em módulos funcionais, cada serviço deverá possuir testes próprios para garantir que suas operações funcionem corretamente antes da integração com a interface web e o banco de dados.

#### Componentes principais a testar

**AuthService**

Responsável por autenticação e controle de sessão.

Cenários a testar:

* Login com credenciais válidas;
* Login com e-mail inexistente;
* Login com senha incorreta;
* Retorno correto dos dados do usuário autenticado;
* Validação de permissões por perfil;
* Bloqueio de acesso para usuário inativo.

**UserService**

Responsável pelo gerenciamento de usuários internos.

Cenários a testar:

* Cadastro de usuário com dados válidos;
* Impedimento de cadastro com e-mail duplicado;
* Atualização de dados de usuário;
* Desativação de usuário;
* Listagem de usuários com filtros;
* Restrição de operações administrativas apenas para perfil `ADMIN`.

**DeceasedService**

Responsável pelo cadastro e consulta de falecidos.

Cenários a testar:

* Cadastro de falecido com campos obrigatórios válidos;
* Cadastro de falecido sem CPF/documento, quando não disponível;
* Validação de campos obrigatórios;
* Edição de dados de falecido;
* Busca por nome completo ou parcial;
* Busca por datas de falecimento ou sepultamento;
* Identificação de possíveis registros duplicados;
* Retorno de mensagem adequada quando nenhum registro for encontrado.

**BurialSpaceService**

Responsável pelo cadastro e controle de sepulturas e jazigos.

Cenários a testar:

* Cadastro de sepultura ou jazigo com dados válidos;
* Atualização de localização ou identificação do espaço;
* Alteração de status para `AVAILABLE`, `OCCUPIED`, `RESERVED` ou `INACTIVE`;
* Consulta de espaços por status, setor ou identificação;
* Impedimento de vínculo indevido em espaço ocupado, quando a regra de ocupação não permitir;
* Retorno dos falecidos vinculados a uma sepultura ou jazigo.

**ResponsibleService**

Responsável pelo cadastro e vínculo de responsáveis.

Cenários a testar:

* Cadastro de responsável com dados válidos;
* Cadastro de responsável sem campos opcionais;
* Busca por nome, documento ou telefone;
* Atualização de dados do responsável;
* Impedimento de vínculo com falecido, sepultura ou jazigo inexistente;
* Retorno dos registros vinculados ao responsável.

**BurialLinkService**

Responsável pelos vínculos entre falecidos, responsáveis e sepulturas/jazigos.

Cenários a testar:

* Criação de vínculo válido entre falecido e sepultura ou jazigo;
* Criação de vínculo com responsável associado;
* Validação de existência do falecido antes do vínculo;
* Validação de existência da sepultura ou jazigo antes do vínculo;
* Validação de disponibilidade do espaço;
* Atualização automática do status do espaço após o vínculo;
* Preservação do histórico ao remover ou desativar vínculo.

**LocationSearchService**

Responsável pela busca e localização de sepulturas.

Cenários a testar:

* Busca por nome do falecido;
* Busca por CPF/documento do falecido, quando disponível;
* Busca por nome do responsável;
* Busca por CPF/documento do responsável;
* Busca por setor, identificação ou localização;
* Retorno de múltiplos registros com nomes semelhantes;
* Exibição de dados complementares para diferenciar falecidos;
* Retorno de estado vazio quando nenhum resultado for encontrado;
* Montagem correta da descrição de localização.

**ReportService**

Responsável pelos relatórios administrativos.

Cenários a testar:

* Geração de relatório de falecidos cadastrados;
* Geração de relatório de sepultamentos por período;
* Geração de relatório de ocupação dos espaços;
* Geração de relatório de espaços por status;
* Aplicação correta de filtros por período, status, setor ou tipo;
* Retorno de relatório vazio quando não houver dados;
* Cálculo correto do total de registros retornados.

#### Requisitos de mock

Como o escopo atual do sistema não possui integrações externas obrigatórias, não será necessário criar mocks para APIs externas, serviços de notificação, sistemas municipais, cartórios, mapas, geolocalização ou plataformas de terceiros.

Os mocks serão utilizados apenas para isolar dependências internas durante os testes unitários, especialmente:

* Repositórios de banco de dados;
* Cliente Prisma;
* Serviço de autenticação;
* Funções de hash e comparação de senha;
* Serviços internos chamados por outros serviços;
* Dados de sessão e usuário autenticado.

Essa abordagem permitirá testar as regras de negócio sem depender de banco de dados real ou de execução completa da aplicação.

#### Cenários de teste críticos

Os cenários críticos são aqueles ligados à integridade dos dados, segurança de acesso e confiabilidade da busca de localização.

Devem receber prioridade nos testes unitários:

* Usuário sem permissão tentando acessar funcionalidade restrita;
* Administrador cadastrando, editando ou desativando usuários;
* Funcionário cadastrando falecido com dados obrigatórios válidos;
* Sistema aceitando falecido sem CPF/documento quando o dado não estiver disponível;
* Sistema identificando possíveis duplicidades no cadastro de falecidos;
* Sistema impedindo vínculo com sepultura ou jazigo ocupado, quando a regra não permitir;
* Sistema impedindo vínculo com entidades inexistentes;
* Sistema atualizando corretamente o status da sepultura ou jazigo após vínculo;
* Busca retornando resultados por nome do falecido, documento, responsável e localização;
* Busca exibindo dados suficientes para diferenciar registros com nomes iguais ou semelhantes;
* Relatórios aplicando filtros corretamente;
* Sistema retornando mensagens claras em casos de ausência de dados, erro de validação ou operação não permitida.

Os testes unitários deverão ser executados durante o desenvolvimento de cada módulo e antes da integração entre as camadas da aplicação, garantindo que as regras principais estejam corretas antes dos testes de integração e testes de ponta a ponta.


### Testes de Integração

Os testes de integração terão como objetivo validar se os principais componentes do Jaziggo funcionam corretamente quando executados em conjunto. Diferente dos testes unitários, que verificam regras isoladas, os testes de integração deverão confirmar o fluxo completo entre serviços internos, camada de API, validações de negócio e banco de dados.

Esses testes deverão utilizar um banco de dados de teste separado do ambiente de desenvolvimento e produção, com dados controlados e previsíveis. Sempre que possível, os dados criados durante os testes deverão ser removidos ou recriados a cada execução para garantir consistência nos resultados.

### Componentes a testar juntos

**Autenticação + Controle de Acesso + Usuários**

Validar se o usuário consegue realizar login, se a sessão é criada corretamente e se as permissões são aplicadas conforme o perfil cadastrado.

Cenários principais:

* Login de administrador com credenciais válidas;
* Login de funcionário com credenciais válidas;
* Bloqueio de login para usuário inativo;
* Bloqueio de acesso de funcionário a rotas exclusivas de administrador;
* Permissão de administrador para cadastrar, editar e desativar usuários;
* Retorno correto dos dados do usuário autenticado.

**Falecidos + Sepulturas/Jazigos + Vínculos de Sepultamento**

Validar se o cadastro de falecido pode ser integrado ao vínculo com uma sepultura ou jazigo, mantendo a integridade dos dados.

Cenários principais:

* Cadastro de falecido sem vínculo inicial com sepultura ou jazigo;
* Cadastro de falecido com vínculo direto a uma sepultura disponível;
* Criação de vínculo entre falecido e sepultura existente;
* Atualização automática do status da sepultura ou jazigo após o vínculo;
* Impedimento de vínculo com sepultura ou jazigo inexistente;
* Impedimento de vínculo com espaço ocupado, quando a regra de ocupação não permitir;
* Consulta de falecidos vinculados a uma sepultura ou jazigo.

**Falecidos + Responsáveis + Vínculos Administrativos**

Validar se responsáveis podem ser cadastrados e associados corretamente a falecidos, sepulturas ou jazigos.

Cenários principais:

* Cadastro de responsável com dados válidos;
* Vinculação de responsável a um falecido existente;
* Vinculação de responsável a uma sepultura ou jazigo existente;
* Impedimento de vínculo com registros inexistentes;
* Consulta dos registros vinculados a um responsável;
* Atualização dos dados do responsável sem quebrar os vínculos existentes.

**Busca e Localização + Falecidos + Responsáveis + Sepulturas/Jazigos**

Validar se a busca de localização consegue consultar corretamente dados distribuídos entre diferentes entidades do sistema.

Cenários principais:

* Busca por nome completo do falecido;
* Busca por nome parcial do falecido;
* Busca por CPF/documento do falecido, quando disponível;
* Busca por nome do responsável;
* Busca por CPF/documento do responsável;
* Busca por setor, quadra, rua, bloco, número ou identificador da sepultura;
* Retorno de múltiplos registros com nomes iguais ou semelhantes;
* Exibição de informações complementares para diferenciar registros;
* Retorno de mensagem adequada quando nenhum resultado for encontrado.

**Relatórios + Banco de Dados + Filtros**

Validar se os relatórios administrativos são gerados corretamente com base nos dados cadastrados no sistema.

Cenários principais:

* Geração de relatório de falecidos cadastrados;
* Geração de relatório de sepultamentos por período;
* Geração de relatório de ocupação de sepulturas e jazigos;
* Geração de relatório de espaços disponíveis, ocupados, reservados e inativos;
* Aplicação de filtros por período, status, setor e tipo de espaço;
* Retorno de relatório vazio quando não houver dados para os filtros selecionados;
* Conferência do total de registros retornados.

**API + Serviços Internos + Banco de Dados**

Validar se os endpoints da API acionam corretamente os serviços internos e persistem ou consultam os dados esperados no banco.

Cenários principais:

* Requisições `POST` criando registros corretamente;
* Requisições `GET` retornando dados cadastrados;
* Requisições `PUT` atualizando registros existentes;
* Requisições `PATCH` alterando status de usuários ou sepulturas/jazigos;
* Requisições `DELETE` ou desativação lógica preservando histórico quando necessário;
* Respostas padronizadas em casos de sucesso e erro;
* Retorno correto de mensagens para validações e regras de negócio.

### Requisitos de dados de teste

Os testes de integração deverão utilizar uma base de dados controlada, contendo registros suficientes para simular os principais fluxos do sistema.

Dados mínimos necessários:

* Um usuário administrador ativo;
* Um usuário funcionário ativo;
* Um usuário funcionário inativo;
* Sepulturas e jazigos com status `AVAILABLE`, `OCCUPIED`, `RESERVED` e `INACTIVE`;
* Falecidos com dados completos;
* Falecidos sem CPF/documento, representando registros antigos ou incompletos;
* Falecidos com nomes iguais ou semelhantes;
* Responsáveis com dados completos;
* Responsáveis com nomes iguais ou semelhantes;
* Vínculos válidos entre falecidos, responsáveis e sepulturas/jazigos;
* Registros distribuídos em diferentes setores, quadras, ruas, blocos e números;
* Sepultamentos em datas diferentes para validar filtros por período.

### Estratégia de execução

Os testes de integração deverão ser executados em ambiente separado, utilizando variáveis de ambiente específicas para testes. A base de teste deverá ser recriada ou limpa antes de cada conjunto de testes, evitando interferência entre execuções.

Sempre que possível, os testes deverão seguir a ordem natural dos fluxos do sistema:

1. Criar usuário ou autenticar usuário existente;
2. Criar sepultura ou jazigo;
3. Criar responsável;
4. Criar falecido;
5. Criar vínculo entre falecido, responsável e sepultura/jazigo;
6. Executar busca de localização;
7. Gerar relatório com os dados cadastrados;
8. Validar os retornos da API e o estado final do banco de dados.

Essa abordagem garante que os principais fluxos do Jaziggo sejam validados de ponta a ponta dentro da camada de integração, reduzindo riscos de inconsistência entre módulos e aumentando a confiabilidade da aplicação.


## Sequenciamento de Desenvolvimento

### Ordem de Construção

A implementação do Jaziggo deverá seguir uma ordem incremental, começando pela base técnica da aplicação e avançando gradualmente para os módulos funcionais. Essa abordagem reduz riscos, facilita testes durante o desenvolvimento e garante que os componentes mais dependentes sejam construídos sobre uma estrutura já validada.

#### 1. Configuração inicial do projeto e infraestrutura base

O primeiro passo será criar a estrutura inicial da aplicação web, configurar o ambiente de desenvolvimento e definir as tecnologias principais.

Atividades principais:

* Criar o projeto com Next.js e TypeScript;
* Configurar estrutura de pastas da aplicação;
* Configurar o Prisma ORM;
* Configurar conexão com o banco PostgreSQL;
* Definir variáveis de ambiente;
* Criar padrões iniciais de resposta da API;
* Configurar ferramentas de validação, formatação e testes.

Esse componente deve ser construído primeiro porque todos os demais módulos dependerão da estrutura base da aplicação, da conexão com o banco de dados e dos padrões definidos para desenvolvimento.

#### 2. Modelagem do banco de dados e migrações iniciais

Após a configuração do projeto, deverá ser implementado o schema inicial do banco de dados.

Atividades principais:

* Criar modelos de usuário, falecido, responsável, sepultura/jazigo e vínculos;
* Definir enums de perfil, status de usuário, tipo de espaço e status de sepultura/jazigo;
* Criar relacionamentos entre as entidades;
* Criar índices para campos usados em busca e filtros;
* Executar as primeiras migrações;
* Criar dados iniciais de teste, como usuário administrador.

Essa etapa depende da configuração do Prisma e do banco de dados. Ela é necessária antes da implementação dos serviços, pois os módulos funcionais precisarão persistir e consultar dados reais.

#### 3. Autenticação e controle de acesso

O próximo componente será o módulo de autenticação e autorização por perfil.

Atividades principais:

* Implementar login e logout;
* Implementar controle de sessão;
* Criar validação de usuário autenticado;
* Criar regras de permissão para `ADMIN` e `EMPLOYEE`;
* Proteger rotas e endpoints internos;
* Bloquear usuários inativos.

Esse módulo deve ser implementado antes das funcionalidades administrativas porque o PRD define que o sistema será restrito a usuários cadastrados e autorizados. Dessa forma, as próximas telas e endpoints já poderão ser construídos com controle de acesso aplicado.

#### 4. Módulo de usuários

Com a autenticação pronta, o módulo de usuários deverá ser implementado para permitir que administradores gerenciem o acesso ao sistema.

Atividades principais:

* Cadastro de usuários;
* Edição de usuários;
* Desativação de usuários;
* Listagem e busca de usuários;
* Definição de perfil de acesso;
* Validação de e-mail único;
* Restrição do módulo apenas para administradores.

Esse módulo depende da autenticação e do controle de acesso, pois apenas administradores poderão cadastrar, editar ou desativar usuários.

#### 5. Módulo de sepulturas e jazigos

Depois da base de usuários, deve ser implementado o módulo de sepulturas e jazigos, pois ele será necessário para vincular falecidos aos locais de sepultamento.

Atividades principais:

* Cadastro de sepulturas e jazigos;
* Edição de dados de localização;
* Definição de tipo do espaço, como sepultura ou jazigo;
* Definição de status, como disponível, ocupado, reservado ou inativo;
* Listagem com filtros por status, setor, identificação e tipo;
* Consulta de detalhes do espaço.

Esse módulo deve vir antes do cadastro completo de falecidos com vínculo, pois o local de sepultamento precisa existir no sistema para que o vínculo seja criado corretamente.

#### 6. Módulo de responsáveis

Em seguida, deve ser implementado o módulo de responsáveis, que permitirá registrar pessoas associadas administrativamente a falecidos, sepulturas ou jazigos.

Atividades principais:

* Cadastro de responsáveis;
* Edição de responsáveis;
* Busca por nome, documento ou telefone;
* Consulta de detalhes do responsável;
* Preparação para vínculos com falecidos e espaços.

Esse módulo pode ser construído após sepulturas/jazigos ou em paralelo, pois será usado posteriormente nos vínculos administrativos e na busca por localização.

#### 7. Módulo de falecidos

Após a criação dos módulos de sepulturas/jazigos e responsáveis, deverá ser implementado o módulo de falecidos.

Atividades principais:

* Cadastro de falecidos;
* Edição de falecidos;
* Consulta por nome, documento, datas e localização;
* Validação de campos obrigatórios;
* Permissão para CPF/documento opcional;
* Verificação de possíveis registros duplicados;
* Preparação para vínculo com sepultura, jazigo e responsável.

Esse módulo depende parcialmente dos módulos de sepulturas/jazigos e responsáveis, já que o cadastro do falecido poderá incluir vínculos com essas entidades.

#### 8. Módulo de vínculos de sepultamento

Com falecidos, responsáveis e sepulturas/jazigos implementados, deverá ser construído o módulo responsável pelos vínculos entre essas entidades.

Atividades principais:

* Vincular falecido a sepultura ou jazigo;
* Vincular responsável ao falecido ou ao espaço;
* Validar existência das entidades relacionadas;
* Validar disponibilidade da sepultura ou jazigo;
* Atualizar status do espaço após vínculo;
* Impedir vínculo indevido quando a regra de ocupação não permitir;
* Preservar histórico de vínculos.

Esse módulo depende diretamente dos módulos de falecidos, responsáveis e sepulturas/jazigos. Ele é essencial para garantir a integridade dos dados e permitir que a busca de localização funcione corretamente.

#### 9. Módulo de busca e localização

Após os vínculos estarem funcionando, deverá ser implementado o módulo de busca e localização, uma das funcionalidades mais importantes para o atendimento no cemitério.

Atividades principais:

* Buscar falecidos por nome completo ou parcial;
* Buscar por CPF/documento do falecido, quando disponível;
* Buscar por nome ou documento do responsável;
* Buscar por localização, setor ou identificação da sepultura/jazigo;
* Exibir múltiplos resultados com dados complementares;
* Montar descrição clara e padronizada da localização;
* Exibir mensagem quando nenhum resultado for encontrado.

Esse módulo depende dos dados integrados de falecidos, responsáveis, sepulturas/jazigos e vínculos. Por isso, deve ser implementado somente após essas entidades principais estarem funcionando.

#### 10. Módulo de relatórios administrativos

Com os cadastros, vínculos e buscas implementados, deverá ser desenvolvido o módulo de relatórios.

Atividades principais:

* Relatório de falecidos cadastrados;
* Relatório de sepultamentos por período;
* Relatório de ocupação dos espaços;
* Relatório de espaços por status;
* Filtros por período, status, setor e tipo;
* Exibição de mensagem quando não houver dados.

Esse módulo depende da existência de dados cadastrados e vinculados no sistema. Por isso, deve ser implementado após os módulos operacionais principais.

#### 11. Integração entre interface, serviços e API

Após os módulos principais estarem implementados individualmente, deverá ser feita a integração completa entre interface web, endpoints de API, serviços internos e banco de dados.

Atividades principais:

* Conectar formulários aos endpoints;
* Exibir listagens e detalhes com dados reais;
* Implementar estados de carregamento;
* Implementar mensagens de sucesso e erro;
* Validar permissões na interface e na API;
* Padronizar navegação entre módulos;
* Ajustar responsividade das telas.

Essa etapa garante que as funcionalidades desenvolvidas estejam acessíveis ao usuário final de forma organizada e consistente.

#### 12. Testes, validação e ajustes finais

A última etapa será dedicada à execução dos testes e ajustes necessários antes da entrega da versão inicial.

Atividades principais:

* Executar testes unitários dos serviços;
* Executar testes de integração entre API, serviços e banco de dados;
* Validar fluxos principais de uso;
* Testar permissões de administrador e funcionário;
* Testar busca e localização com registros semelhantes;
* Testar relatórios com e sem dados;
* Corrigir inconsistências encontradas;
* Revisar mensagens de erro, estados vazios e validações.

Essa etapa é necessária para confirmar que os módulos do Jaziggo funcionam corretamente em conjunto, preservam a integridade dos dados e atendem aos requisitos principais definidos no PRD.


### Dependências Técnicas

As dependências técnicas do Jaziggo estão relacionadas principalmente à infraestrutura necessária para executar a aplicação web, persistir os dados do sistema e garantir acesso seguro aos usuários administrativos. Não há dependências bloqueantes de serviços externos de negócio, como cartórios, prefeituras, sistemas municipais, plataformas financeiras, mapas ou serviços de notificação.

#### Infraestrutura requerida

**Ambiente de execução da aplicação**

A aplicação deverá possuir um ambiente capaz de executar uma aplicação web baseada em Next.js e TypeScript. Para desenvolvimento local, será necessário ter Node.js instalado, gerenciador de pacotes e acesso às variáveis de ambiente do projeto.

Dependências principais:

* Node.js;
* Gerenciador de pacotes, como npm, yarn ou pnpm;
* Next.js;
* TypeScript;
* Prisma ORM;
* Ambiente para execução local e produção da aplicação.

**Banco de dados relacional**

O sistema depende de um banco de dados relacional para armazenar usuários, falecidos, responsáveis, sepulturas, jazigos, vínculos e dados utilizados nos relatórios administrativos.

Dependências principais:

* PostgreSQL;
* Conexão configurada via variável de ambiente;
* Migrações do Prisma executadas corretamente;
* Banco de dados separado para desenvolvimento, testes e produção;
* Políticas de backup e recuperação em ambiente de produção.

**Autenticação e segurança**

O Jaziggo dependerá de um mecanismo de autenticação interno para controlar o acesso de administradores e funcionários. A implementação poderá utilizar Auth.js ou autenticação própria baseada em credenciais, desde que preserve segurança, controle de sessão e autorização por perfil.

Dependências principais:

* Armazenamento seguro de senhas com hash;
* Controle de sessão do usuário autenticado;
* Middleware ou lógica equivalente para proteção de rotas;
* Controle de permissões por perfil;
* Variáveis de ambiente para segredos de autenticação;
* Uso de HTTPS em ambiente de produção.

**Hospedagem da aplicação**

Em produção, a aplicação precisará ser hospedada em uma plataforma compatível com Next.js. Uma opção recomendada é o uso da Vercel, por sua compatibilidade com aplicações Next.js, mas a arquitetura não deve ficar rigidamente dependente de uma única plataforma.

Dependências principais:

* Plataforma de deploy compatível com Next.js;
* Configuração de variáveis de ambiente;
* Conexão segura com o banco de dados;
* Suporte a rotas de API ou server actions;
* Processo de build e deploy automatizado.

**Ambiente de testes**

Para execução confiável dos testes unitários e de integração, será necessário um ambiente de testes isolado.

Dependências principais:

* Banco de dados de teste separado;
* Scripts para criação, limpeza ou reset da base de testes;
* Ferramenta de testes para TypeScript;
* Dados controlados para validar cadastros, vínculos, buscas e relatórios.

#### Disponibilidade de serviço externo

No escopo atual, o Jaziggo não depende de serviços externos de negócio para funcionar. O sistema não exige integração com cartórios, prefeituras, órgãos públicos, sistemas financeiros, serviços de e-mail, SMS, WhatsApp, mapas ou geolocalização.

As únicas dependências externas possíveis estão relacionadas à infraestrutura de hospedagem e banco de dados em produção, caso sejam utilizados serviços gerenciados.

Exemplos:

* Vercel para hospedagem da aplicação;
* Neon, Supabase ou Prisma Postgres para banco de dados PostgreSQL gerenciado;
* Provedor de domínio e certificado HTTPS, quando aplicável.

Caso algum desses serviços fique indisponível em produção, o funcionamento da aplicação poderá ser afetado. Por isso, a implantação deverá considerar boas práticas como monitoramento básico, backup do banco de dados, separação de ambientes e documentação das variáveis necessárias para recuperação ou migração do sistema.

#### Dependências bloqueantes

As dependências consideradas bloqueantes para iniciar ou executar o sistema são:

* Definição e configuração do banco de dados PostgreSQL;
* Configuração correta das variáveis de ambiente;
* Execução das migrações do Prisma;
* Existência de pelo menos um usuário administrador inicial;
* Implementação do mecanismo de autenticação;
* Configuração do ambiente de deploy em produção;
* Uso de HTTPS em produção para proteger a comunicação;
* Definição das regras de ocupação de sepulturas e jazigos antes da implementação final dos vínculos.

Sem essas dependências, o sistema poderá não iniciar corretamente, não persistir dados, não controlar acesso de usuários ou não garantir integridade nos vínculos entre falecidos, responsáveis e sepulturas/jazigos.


## Monitoramento e Observabilidade

A abordagem de monitoramento e observabilidade do Jaziggo deverá permitir acompanhar a saúde da aplicação, identificar falhas, medir desempenho das operações principais e facilitar a investigação de problemas em ambiente de produção. Como o sistema será uma aplicação web administrativa, o foco inicial será monitorar disponibilidade, erros, tempo de resposta, autenticação, operações críticas de cadastro, busca/localização e geração de relatórios.

Para a versão inicial, o monitoramento poderá ser implementado de forma simples, utilizando logs estruturados da aplicação e métricas básicas expostas em formato compatível com Prometheus. Caso exista uma infraestrutura de Grafana disponível, essas métricas poderão ser conectadas a dashboards para acompanhamento visual.

### Métricas a expor

As métricas deverão ser expostas em formato compatível com Prometheus, preferencialmente por meio de um endpoint interno protegido ou restrito ao ambiente de infraestrutura, como:

```http
GET /api/metrics
```

Esse endpoint não deverá ser acessível publicamente por usuários comuns da aplicação.

Métricas recomendadas:

```txt
# Total de requisições HTTP recebidas
jaziggo_http_requests_total{method="GET",route="/api/v1/deceased",status="200"}

# Duração das requisições HTTP
jaziggo_http_request_duration_seconds{method="GET",route="/api/v1/location-search"}

# Total de erros internos da aplicação
jaziggo_application_errors_total{module="deceased",operation="create"}

# Total de tentativas de login
jaziggo_auth_login_attempts_total{status="success"}
jaziggo_auth_login_attempts_total{status="failed"}

# Total de acessos negados por permissão
jaziggo_auth_access_denied_total{role="EMPLOYEE",resource="users"}

# Total de cadastros de falecidos
jaziggo_deceased_created_total

# Total de cadastros de sepulturas ou jazigos
jaziggo_burial_spaces_created_total{type="SEPULTURA"}
jaziggo_burial_spaces_created_total{type="JAZIGO"}

# Total de buscas de localização realizadas
jaziggo_location_search_total{result="found"}
jaziggo_location_search_total{result="empty"}

# Duração das buscas de localização
jaziggo_location_search_duration_seconds

# Total de relatórios gerados
jaziggo_reports_generated_total{type="burials_by_period"}

# Duração da geração de relatórios
jaziggo_report_generation_duration_seconds{type="space_occupation"}

# Status da conexão com o banco de dados
jaziggo_database_connection_status

# Duração das consultas ao banco de dados
jaziggo_database_query_duration_seconds{operation="select",entity="deceased"}
```

As métricas mais importantes para acompanhamento inicial serão:

* Quantidade de requisições por endpoint;
* Tempo médio de resposta da aplicação;
* Taxa de erros HTTP 4xx e 5xx;
* Quantidade de logins bem-sucedidos e falhos;
* Tentativas de acesso negado;
* Tempo de resposta da busca de localização;
* Quantidade de buscas sem resultado;
* Tempo de geração de relatórios;
* Disponibilidade da conexão com o banco de dados.

### Logs principais e níveis de log

Os logs deverão ser estruturados, preferencialmente em formato JSON, para facilitar pesquisa, filtragem e futura integração com ferramentas de observabilidade.

Formato recomendado de log:

```json
{
  "timestamp": "2026-06-18T10:30:00.000Z",
  "level": "info",
  "module": "location-search",
  "operation": "search",
  "userId": "user-id",
  "requestId": "request-id",
  "message": "Busca de localização executada com sucesso",
  "metadata": {
    "resultCount": 3,
    "durationMs": 120
  }
}
```

Níveis de log recomendados:

**debug**

Usado apenas em ambiente de desenvolvimento ou investigação específica.

Exemplos:

* Parâmetros internos de filtros;
* Tempo detalhado de execução de funções;
* Dados técnicos de fluxo da aplicação.

**info**

Usado para registrar eventos normais e relevantes da aplicação.

Exemplos:

* Login realizado com sucesso;
* Cadastro de falecido realizado;
* Cadastro de sepultura ou jazigo realizado;
* Vínculo de falecido com sepultura criado;
* Busca de localização executada;
* Relatório administrativo gerado.

**warn**

Usado para situações inesperadas, mas que não impedem totalmente o funcionamento do sistema.

Exemplos:

* Tentativa de login com credenciais inválidas;
* Usuário sem permissão tentando acessar recurso restrito;
* Tentativa de cadastro com possível duplicidade;
* Busca de localização sem resultados;
* Tentativa de vínculo com espaço indisponível;
* Relatório gerado sem dados para os filtros informados.

**error**

Usado para falhas que impedem a conclusão de uma operação.

Exemplos:

* Erro ao salvar registro no banco de dados;
* Falha ao criar vínculo entre entidades;
* Erro ao atualizar status de sepultura ou jazigo;
* Falha ao gerar relatório;
* Erro inesperado em endpoint da API;
* Falha na validação de sessão ou autenticação.

### Cuidados com dados sensíveis nos logs

Os logs não deverão registrar dados pessoais sensíveis de forma desnecessária. Informações como CPF/documento, telefone, e-mail, endereço e senha nunca deverão aparecer em texto aberto nos logs.

Também deverão ser evitados logs contendo:

* Senhas ou hashes de senha;
* Tokens de sessão;
* CPF/documento completo;
* Endereço completo de responsáveis;
* Dados pessoais completos de responsáveis;
* Dados excessivos de falecidos ou vínculos.

Quando necessário para investigação, os logs deverão utilizar identificadores internos, como `userId`, `deceasedId`, `responsibleId` e `burialSpaceId`.

### Integração com dashboards Grafana existentes

Caso exista uma infraestrutura Grafana disponível, o Jaziggo poderá ser integrado por meio das métricas expostas em formato Prometheus.

Dashboards recomendados:

**Dashboard de saúde da aplicação**

Indicadores:

* Status da aplicação;
* Total de requisições por minuto;
* Tempo médio de resposta;
* Taxa de erros 4xx e 5xx;
* Status da conexão com o banco de dados.

**Dashboard de autenticação e segurança**

Indicadores:

* Total de logins bem-sucedidos;
* Total de tentativas de login falhas;
* Tentativas de acesso negado;
* Usuários inativos tentando acessar o sistema;
* Endpoints com maior volume de acessos negados.

**Dashboard operacional**

Indicadores:

* Total de falecidos cadastrados;
* Total de sepulturas e jazigos cadastrados;
* Total de vínculos criados;
* Total de buscas de localização realizadas;
* Percentual de buscas sem resultado;
* Tempo médio da busca de localização.

**Dashboard de relatórios**

Indicadores:

* Total de relatórios gerados;
* Tempo médio de geração por tipo de relatório;
* Relatórios sem dados;
* Filtros mais utilizados, quando aplicável.

### Alertas recomendados

Caso a infraestrutura permita configuração de alertas, os seguintes eventos deverão ser monitorados:

* Aumento anormal de erros 5xx;
* Indisponibilidade da conexão com o banco de dados;
* Tempo de resposta elevado nos endpoints principais;
* Tempo elevado na busca de localização;
* Muitas tentativas de login falhas em curto período;
* Falhas recorrentes na criação de vínculos;
* Falhas recorrentes na geração de relatórios.

### Abordagem inicial

Para a primeira versão do Jaziggo, a prioridade será garantir logs estruturados e métricas básicas de saúde da aplicação. A integração completa com Prometheus e Grafana poderá ser implementada de forma incremental, conforme a necessidade do ambiente de produção e a infraestrutura disponível.

A observabilidade deverá ser tratada como apoio à operação do sistema, sem adicionar complexidade excessiva ao escopo inicial. O objetivo principal será permitir identificação rápida de falhas, acompanhamento do desempenho e maior confiabilidade nas funcionalidades críticas, especialmente autenticação, cadastro, vínculos, busca/localização e relatórios.


## Considerações Técnicas

### Decisões Principais

Esta seção registra as principais decisões técnicas adotadas para o desenvolvimento do Jaziggo, incluindo justificativas, trade-offs considerados e alternativas rejeitadas. As decisões foram tomadas com base no escopo do PRD, que define o sistema como uma aplicação web administrativa, com autenticação, controle de acesso, cadastro de falecidos, gestão de sepulturas/jazigos, responsáveis, busca/localização e relatórios internos.

#### 1. Aplicação web em vez de aplicativo mobile nativo

A solução será desenvolvida como uma aplicação web acessível por navegadores modernos.

**Justificativa:**

O PRD define que o Jaziggo será utilizado principalmente por administradores, funcionários e atendentes do cemitério. Esses usuários tendem a operar o sistema em computadores, notebooks ou tablets no ambiente administrativo. Uma aplicação web permite acesso centralizado, menor complexidade de instalação e manutenção mais simples.

**Trade-offs considerados:**

* Uma aplicação web pode ter menos recursos nativos do dispositivo em comparação com um aplicativo mobile;
* A experiência em celulares pode ser mais limitada do que em um app dedicado;
* Em contrapartida, o desenvolvimento e a manutenção são mais simples e rápidos.

**Alternativas rejeitadas:**

* **Aplicativo mobile nativo:** rejeitado por estar fora do escopo inicial e aumentar a complexidade de desenvolvimento;
* **Aplicação desktop:** rejeitada por dificultar implantação, atualização e acesso em diferentes dispositivos.

#### 2. Next.js com TypeScript como base da aplicação

A aplicação será construída com Next.js e TypeScript, permitindo o desenvolvimento full-stack em uma única base de código.

**Justificativa:**

O Next.js permite construir interface web, rotas, endpoints e lógica server-side no mesmo projeto. O TypeScript melhora a segurança do código, reduz erros em tempo de desenvolvimento e facilita a manutenção das entidades, serviços e contratos de API.

**Trade-offs considerados:**

* A equipe precisa manter organização clara entre interface, serviços e acesso a dados;
* O uso full-stack em um único projeto pode misturar responsabilidades caso não exista uma boa estrutura de pastas;
* Em contrapartida, reduz a necessidade de manter front-end e back-end em repositórios separados.

**Alternativas rejeitadas:**

* **React separado com API independente:** rejeitado para o escopo inicial por aumentar a quantidade de projetos, deploys e integrações;
* **Back-end separado em Java, Go ou Node/Express:** rejeitado por trazer complexidade adicional sem necessidade imediata;
* **Aplicação apenas client-side:** rejeitada por não atender adequadamente autenticação, segurança, regras de negócio e acesso seguro ao banco de dados.

#### 3. Banco de dados relacional PostgreSQL

O Jaziggo utilizará um banco de dados relacional, preferencialmente PostgreSQL.

**Justificativa:**

O domínio do sistema possui entidades fortemente relacionadas, como falecidos, responsáveis, sepulturas, jazigos, usuários e vínculos de sepultamento. Um banco relacional facilita a modelagem dessas relações, a aplicação de integridade referencial e a geração de relatórios administrativos.

**Trade-offs considerados:**

* Bancos relacionais exigem modelagem inicial mais cuidadosa;
* Mudanças estruturais podem exigir migrações;
* Em contrapartida, oferecem maior consistência para vínculos e consultas estruturadas.

**Alternativas rejeitadas:**

* **Banco NoSQL:** rejeitado porque o sistema depende fortemente de relacionamentos e integridade entre entidades;
* **Planilhas como armazenamento principal:** rejeitadas por não oferecerem controle adequado de acesso, integridade, segurança e escalabilidade;
* **Arquivos locais:** rejeitados por dificultarem consultas, concorrência, backup e manutenção.

#### 4. Prisma ORM para acesso ao banco de dados

O Prisma será utilizado como camada de acesso ao banco de dados.

**Justificativa:**

O Prisma facilita a definição do schema, execução de migrações, criação de consultas tipadas e integração com TypeScript. Isso reduz erros comuns de SQL manual e melhora a produtividade durante o desenvolvimento.

**Trade-offs considerados:**

* O uso de ORM pode limitar algumas otimizações avançadas de consulta;
* Consultas muito específicas podem exigir cuidado adicional ou uso de SQL bruto;
* Em contrapartida, o ganho em segurança de tipos, produtividade e manutenção é adequado para o escopo inicial.

**Alternativas rejeitadas:**

* **SQL manual em toda a aplicação:** rejeitado por aumentar risco de inconsistência, repetição de código e erros;
* **Outro ORM genérico:** rejeitado porque o Prisma possui boa integração com TypeScript e Next.js.

#### 5. Autenticação obrigatória e controle de acesso por perfil

Todas as funcionalidades administrativas exigirão autenticação. O sistema diferenciará, no mínimo, os perfis `ADMIN` e `EMPLOYEE`.

**Justificativa:**

O PRD define que o sistema lidará com dados administrativos e pessoais, incluindo responsáveis, contatos e documentos. Por isso, o acesso deve ser restrito a usuários cadastrados e autorizados.

**Trade-offs considerados:**

* A autenticação adiciona complexidade ao desenvolvimento inicial;
* Será necessário proteger rotas, endpoints e ações sensíveis;
* Em contrapartida, a segurança é indispensável para o tipo de dado tratado.

**Alternativas rejeitadas:**

* **Sistema sem login:** rejeitado por não atender aos requisitos de segurança e privacidade;
* **Acesso público para familiares e visitantes:** rejeitado porque o PRD define que familiares e visitantes não acessam diretamente o sistema;
* **Perfil único de usuário:** rejeitado porque administradores e funcionários possuem permissões diferentes.

#### 6. Busca e localização como funcionalidade prioritária

O módulo de busca e localização será tratado como uma funcionalidade crítica do sistema.

**Justificativa:**

Uma das principais necessidades do Jaziggo é permitir que funcionários localizem rapidamente sepulturas e jazigos durante o atendimento a familiares e visitantes. Por isso, a busca deverá aceitar diferentes critérios, como nome do falecido, documento quando disponível, nome do responsável, documento do responsável, datas e localização.

**Trade-offs considerados:**

* A busca com múltiplos filtros exige modelagem e índices adequados;
* Registros antigos podem ter dados incompletos, exigindo flexibilidade;
* Em contrapartida, uma busca eficiente melhora diretamente o valor do sistema para o cemitério.

**Alternativas rejeitadas:**

* **Busca apenas por nome do falecido:** rejeitada por não ser suficiente em casos de nomes iguais ou semelhantes;
* **Obrigatoriedade de CPF/documento do falecido:** rejeitada porque registros antigos podem não possuir essa informação;
* **Mapa interativo como solução inicial:** rejeitado por estar fora do escopo atual e aumentar a complexidade.

#### 7. Sem consulta pública direta para familiares e visitantes

O sistema não terá uma tela pública para familiares ou visitantes realizarem buscas diretamente.

**Justificativa:**

O PRD define que familiares e visitantes serão beneficiários indiretos. A consulta será feita pelo funcionário ou atendente do cemitério, que usará o sistema para localizar a sepultura ou jazigo e repassar a informação.

**Trade-offs considerados:**

* A ausência de consulta pública reduz a autonomia do visitante;
* Em contrapartida, diminui riscos de exposição indevida de dados pessoais e simplifica o controle de acesso;
* Também mantém o sistema focado no uso administrativo interno.

**Alternativas rejeitadas:**

* **Portal público de busca:** rejeitado por não fazer parte do escopo inicial e por exigir regras adicionais de privacidade;
* **Totem público de consulta:** rejeitado por demandar infraestrutura física e controles adicionais;
* **Consulta anônima pela internet:** rejeitada por risco de exposição de dados.

#### 8. Relatórios visualizados dentro da aplicação

Os relatórios administrativos serão exibidos diretamente no sistema.

**Justificativa:**

O escopo inicial prevê relatórios de falecidos cadastrados, sepultamentos por período e ocupação dos espaços. A visualização interna atende à necessidade inicial de acompanhamento administrativo sem exigir exportação em PDF, Excel ou CSV.

**Trade-offs considerados:**

* A ausência de exportação pode limitar usos administrativos externos;
* Em contrapartida, reduz complexidade de implementação;
* Exportações poderão ser adicionadas futuramente caso se tornem necessárias.

**Alternativas rejeitadas:**

* **Exportação obrigatória em PDF ou Excel na versão inicial:** rejeitada por estar fora do escopo atual;
* **Dashboard analítico avançado:** rejeitado por aumentar complexidade e não ser necessário para a primeira versão.

#### 9. Exclusão definitiva evitada em registros principais

A abordagem recomendada é evitar exclusão definitiva de registros importantes, priorizando desativação, atualização de status ou preservação histórica.

**Justificativa:**

Registros de falecidos, sepulturas, jazigos, responsáveis e vínculos possuem valor histórico e administrativo. Remover esses dados definitivamente pode comprometer relatórios, rastreabilidade e consultas futuras.

**Trade-offs considerados:**

* Manter registros antigos exige filtros adequados para separar ativos e inativos;
* A base de dados pode crescer com o tempo;
* Em contrapartida, preserva histórico e reduz risco de perda de informação importante.

**Alternativas rejeitadas:**

* **Exclusão física imediata:** rejeitada por risco de perda de histórico;
* **Remoção de vínculos sem registro:** rejeitada por prejudicar a integridade e a consulta futura.

#### 10. Sem integrações externas na versão inicial

O Jaziggo não dependerá de integrações externas obrigatórias.

**Justificativa:**

O PRD define que o sistema deverá funcionar de forma independente, sem integração com cartórios, prefeituras, sistemas municipais, serviços financeiros, notificações, mapas ou bases externas. Isso reduz riscos de implementação e torna a primeira versão mais controlada.

**Trade-offs considerados:**

* O sistema não validará dados automaticamente em bases externas;
* Não haverá notificações automáticas por e-mail, SMS ou WhatsApp;
* Em contrapartida, a aplicação será mais simples, previsível e menos dependente da disponibilidade de terceiros.

**Alternativas rejeitadas:**

* **Integração com cartórios ou órgãos públicos:** rejeitada por estar fora do escopo e exigir acordos, APIs e regras legais específicas;
* **Integração com mapas/geolocalização:** rejeitada porque o escopo inicial usa localização textual padronizada;
* **Notificações automáticas:** rejeitadas por não serem necessárias para a primeira versão.

#### 11. Observabilidade incremental

A observabilidade será implementada de forma incremental, começando por logs estruturados e métricas básicas.

**Justificativa:**

O sistema precisa permitir investigação de falhas, acompanhamento de erros e medição de desempenho, especialmente em autenticação, busca/localização, cadastros, vínculos e relatórios. No entanto, uma stack completa de observabilidade não deve bloquear a entrega inicial.

**Trade-offs considerados:**

* Uma observabilidade inicial mais simples pode oferecer menos detalhes;
* Em contrapartida, evita complexidade excessiva no início do projeto;
* A integração com Prometheus e Grafana poderá evoluir conforme a infraestrutura disponível.

**Alternativas rejeitadas:**

* **Não registrar logs estruturados:** rejeitado por dificultar investigação de problemas;
* **Implementar observabilidade complexa desde o início:** rejeitado por aumentar o esforço inicial além do necessário;
* **Registrar dados pessoais completos nos logs:** rejeitado por risco de privacidade e segurança.

#### 12. Implementação incremental por módulos

O desenvolvimento será realizado por módulos, seguindo a ordem: base técnica, banco de dados, autenticação, usuários, sepulturas/jazigos, responsáveis, falecidos, vínculos, busca/localização, relatórios, integração e testes.

**Justificativa:**

Essa ordem reduz dependências quebradas e permite validar cada parte antes de avançar para funcionalidades mais complexas. A busca e os relatórios dependem de dados integrados, portanto devem ser construídos após os módulos de cadastro e vínculo.

**Trade-offs considerados:**

* Algumas funcionalidades visíveis ao usuário final aparecerão apenas depois da base técnica;
* O desenvolvimento inicial pode parecer mais lento por priorizar estrutura e segurança;
* Em contrapartida, diminui retrabalho e melhora a consistência do sistema.

**Alternativas rejeitadas:**

* **Começar pela interface visual completa:** rejeitado porque a interface depende dos dados, regras e permissões;
* **Começar pelos relatórios:** rejeitado porque relatórios dependem dos cadastros e vínculos;
* **Construir todos os módulos ao mesmo tempo:** rejeitado por aumentar risco de inconsistência e dificultar testes.


### Riscos Conhecidos

Esta seção identifica os principais riscos técnicos do Jaziggo, incluindo desafios potenciais, estratégias de mitigação e áreas que ainda podem precisar de pesquisa ou validação antes da implementação final.

#### 1. Dados antigos, incompletos ou inconsistentes

**Risco:**

O sistema poderá receber registros antigos vindos de livros físicos, planilhas ou controles manuais. Esses registros podem não possuir CPF/documento, datas completas, localização padronizada ou dados de responsáveis.

**Impacto potencial:**

* Dificuldade para localizar falecidos;
* Resultados de busca imprecisos;
* Relatórios incompletos;
* Maior chance de registros duplicados;
* Dificuldade para diferenciar pessoas com nomes iguais ou semelhantes.

**Mitigação:**

* Permitir campos opcionais quando necessário, especialmente CPF/documento do falecido;
* Definir campos mínimos obrigatórios para cada entidade;
* Criar validações para evitar cadastros incompletos além do aceitável;
* Utilizar informações complementares para diferenciação, como datas, responsável e localização;
* Padronizar ao máximo os campos de localização, como setor, quadra, rua, bloco e número.

**Área que precisa de pesquisa ou decisão:**

* Definir quais campos serão obrigatórios no cadastro inicial;
* Definir como tratar registros históricos sem documentação completa;
* Definir padrão mínimo de localização aceito pelo cemitério.

#### 2. Duplicidade de registros

**Risco:**

O mesmo falecido, responsável, sepultura ou jazigo pode ser cadastrado mais de uma vez, especialmente quando houver variação de nomes, ausência de CPF/documento ou registros antigos incompletos.

**Impacto potencial:**

* Confusão na busca de localização;
* Relatórios com contagem incorreta;
* Vínculos administrativos duplicados;
* Dificuldade para manter histórico confiável.

**Mitigação:**

* Implementar verificação de possíveis duplicidades no cadastro de falecidos;
* Comparar nome, datas, documento quando disponível, responsável e localização;
* Exibir alerta antes de concluir um cadastro semelhante a outro já existente;
* Criar índices nos campos mais usados para identificação;
* Evitar bloqueio automático rígido quando os dados forem incompletos, preferindo alerta e decisão do usuário.

**Área que precisa de pesquisa ou decisão:**

* Definir critérios de similaridade para identificar possíveis duplicidades;
* Definir se duplicidades serão apenas alertadas ou bloqueadas em alguns casos;
* Definir quais informações serão exibidas ao funcionário para comparação.

#### 3. Regras de ocupação de sepulturas e jazigos

**Risco:**

A regra de ocupação pode variar conforme o tipo de espaço. Uma sepultura simples pode aceitar apenas um falecido ativo, enquanto um jazigo familiar pode aceitar múltiplos vínculos ao longo do tempo.

**Impacto potencial:**

* Vínculos indevidos entre falecidos e espaços;
* Status incorreto de sepulturas ou jazigos;
* Perda de confiabilidade no controle de ocupação;
* Problemas administrativos na localização e nos relatórios.

**Mitigação:**

* Separar o espaço físico da entidade de vínculo de sepultamento;
* Utilizar uma entidade específica para registrar vínculos entre falecido, responsável e espaço;
* Preservar histórico de uso do espaço;
* Implementar validação de disponibilidade antes de criar novo vínculo;
* Atualizar o status do espaço de acordo com a regra definida.

**Área que precisa de pesquisa ou decisão:**

* Definir se jazigos poderão ter múltiplos falecidos vinculados;
* Definir quando um espaço deve ser considerado ocupado, reservado, disponível ou inativo;
* Definir se haverá diferença de regra entre sepultura e jazigo.

#### 4. Busca de localização imprecisa

**Risco:**

A busca pode retornar muitos resultados semelhantes ou não encontrar registros esperados por causa de erros de digitação, nomes incompletos, documentos ausentes ou localização cadastrada de forma inconsistente.

**Impacto potencial:**

* Atendimento mais lento a familiares e visitantes;
* Seleção incorreta do registro pelo funcionário;
* Perda de confiança na aplicação;
* Necessidade de consulta paralela a registros físicos.

**Mitigação:**

* Permitir busca por múltiplos critérios;
* Suportar nome completo e parcial;
* Permitir filtros por documento, responsável, datas e localização;
* Exibir informações complementares nos resultados;
* Padronizar a montagem da descrição de localização;
* Criar índices nos campos mais utilizados em consultas.

**Área que precisa de pesquisa ou decisão:**

* Definir quais filtros devem aparecer primeiro na interface;
* Definir formato visual dos resultados de busca;
* Avaliar necessidade futura de busca aproximada por similaridade textual.

#### 5. Exposição indevida de dados pessoais

**Risco:**

O sistema armazenará dados pessoais de responsáveis, como documento, telefone, e-mail e endereço. Também poderá armazenar documentos de falecidos quando disponíveis.

**Impacto potencial:**

* Violação de privacidade;
* Exposição desnecessária de informações sensíveis;
* Risco de não conformidade com boas práticas relacionadas à LGPD;
* Perda de confiança no sistema.

**Mitigação:**

* Exigir autenticação para todas as funcionalidades administrativas;
* Aplicar controle de acesso por perfil;
* Evitar exibir dados pessoais completos quando não forem necessários;
* Não registrar dados sensíveis em logs;
* Utilizar HTTPS em produção;
* Armazenar senhas usando hash seguro;
* Limitar as informações exibidas nas buscas ao necessário para identificação correta.

**Área que precisa de pesquisa ou decisão:**

* Definir quais dados pessoais serão exibidos em listagens;
* Definir se documentos serão mascarados na interface;
* Definir política interna de retenção e atualização de dados.

#### 6. Permissões insuficientemente protegidas

**Risco:**

Apenas esconder botões na interface não garante segurança. Um usuário sem permissão poderia tentar acessar endpoints administrativos diretamente.

**Impacto potencial:**

* Funcionário acessando funções restritas de administrador;
* Alteração indevida de usuários;
* Acesso indevido a relatórios administrativos;
* Risco de comprometimento de dados.

**Mitigação:**

* Validar permissões tanto na interface quanto na API;
* Proteger endpoints com middleware ou validação de sessão;
* Restringir gerenciamento de usuários ao perfil `ADMIN`;
* Testar cenários de acesso negado;
* Registrar tentativas indevidas em logs de segurança.

**Área que precisa de pesquisa ou decisão:**

* Definir matriz final de permissões por perfil;
* Definir se haverá apenas `ADMIN` e `EMPLOYEE` ou outros perfis futuros;
* Definir quais relatórios poderão ser acessados por cada perfil.

#### 7. Crescimento da base de dados e queda de performance

**Risco:**

Com o tempo, o sistema poderá acumular muitos registros de falecidos, responsáveis, sepulturas, jazigos e vínculos históricos.

**Impacto potencial:**

* Buscas mais lentas;
* Relatórios demorados;
* Interface menos responsiva;
* Maior carga no banco de dados.

**Mitigação:**

* Criar índices nos campos mais usados em busca e filtros;
* Paginar listagens;
* Evitar carregar todos os registros de uma vez;
* Otimizar consultas de relatórios;
* Monitorar tempo de resposta dos endpoints principais;
* Avaliar cache apenas se houver necessidade real.

**Área que precisa de pesquisa ou decisão:**

* Estimar volume inicial e crescimento esperado de registros;
* Definir limites de paginação;
* Definir quais relatórios podem exigir otimização específica.

#### 8. Falhas na preservação de histórico

**Risco:**

Alterações ou remoções indevidas podem comprometer o histórico de uso de sepulturas, jazigos, vínculos e registros administrativos.

**Impacto potencial:**

* Perda de rastreabilidade;
* Relatórios históricos incorretos;
* Dificuldade para consultar registros antigos;
* Inconsistência entre falecido, responsável e local de sepultamento.

**Mitigação:**

* Evitar exclusão definitiva de registros principais;
* Utilizar desativação lógica quando aplicável;
* Preservar vínculos antigos com campo de status ou atividade;
* Registrar datas de criação e atualização;
* Garantir integridade referencial no banco de dados.

**Área que precisa de pesquisa ou decisão:**

* Definir quais entidades poderão ser excluídas;
* Definir quais entidades serão apenas desativadas;
* Definir se haverá histórico detalhado de alterações em versões futuras.

#### 9. Dependência da qualidade da localização cadastrada

**Risco:**

A funcionalidade de localização depende diretamente da qualidade dos dados cadastrados pelos usuários. Se setor, quadra, rua, bloco ou número forem informados de forma despadronizada, a busca e a orientação ao visitante serão prejudicadas.

**Impacto potencial:**

* Localização pouco clara;
* Resultados inconsistentes;
* Dificuldade para orientar familiares e visitantes;
* Maior necessidade de conhecimento informal dos funcionários.

**Mitigação:**

* Padronizar campos de localização;
* Utilizar campos separados em vez de apenas texto livre;
* Permitir descrição complementar apenas como apoio;
* Validar campos mínimos de localização;
* Exibir a localização de forma estruturada e clara na interface.

**Área que precisa de pesquisa ou decisão:**

* Definir padrão de localização usado pelo cemitério;
* Definir nomenclatura oficial para setor, quadra, rua, bloco e número;
* Avaliar se diferentes cemitérios usam estruturas físicas diferentes.

#### 10. Escopo aumentando durante o desenvolvimento

**Risco:**

Funcionalidades fora do escopo inicial, como mapa interativo, exportação de relatórios, notificações, módulo financeiro, documentos anexados ou consulta pública, podem ser solicitadas durante o desenvolvimento.

**Impacto potencial:**

* Atraso na entrega;
* Aumento da complexidade técnica;
* Mudanças no modelo de dados;
* Retrabalho em telas e regras de negócio.

**Mitigação:**

* Manter o escopo inicial alinhado ao PRD;
* Registrar funcionalidades futuras separadamente;
* Priorizar os módulos essenciais;
* Evitar implementar integrações e recursos avançados antes da base estar concluída;
* Avaliar novas demandas apenas após a versão inicial funcional.

**Área que precisa de pesquisa ou decisão:**

* Definir roadmap futuro após a primeira versão;
* Definir quais funcionalidades fora do escopo têm maior prioridade futura;
* Avaliar impacto técnico antes de aceitar mudanças de escopo.

### Conformidade com Padrões

Não foram identificadas regras específicas na pasta `.cursor/rules` no repositório atual. Como o projeto utiliza GitHub Spec Kit e Codex, a principal fonte de instruções para agentes será o arquivo `AGENTS.md`.

O arquivo `AGENTS.md` define que a implementação deve considerar a versão instalada do Next.js como fonte de verdade, consultando a documentação local em `node_modules/next/dist/docs/` antes de escrever código. Isso é necessário porque a versão do Next.js utilizada pode conter mudanças em APIs, convenções e estrutura de arquivos que diferem de versões anteriores.

Portanto, a implementação deverá seguir:

- As decisões técnicas documentadas neste Tech Spec;
- As regras e instruções presentes em `AGENTS.md`;
- A documentação local da versão instalada do Next.js;
- Os padrões do projeto definidos pela estrutura atual da aplicação;
- Boas práticas de TypeScript, Next.js, Prisma e PostgreSQL;
- As regras de autenticação, autorização, privacidade e integridade de dados definidas para o Jaziggo.

Caso a pasta `.cursor/rules` seja adicionada futuramente, suas regras deverão ser consideradas complementares às instruções já existentes em `AGENTS.md`.

### Arquivos relevantes

Os arquivos abaixo são relevantes para a implementação do Jaziggo, pois definem instruções para agentes, configuração do projeto, estrutura da aplicação Next.js, dependências, padrões técnicos e futuras áreas de implementação.

#### Arquivos de especificação e orientação

* `AGENTS.md`
  Arquivo de instruções para agentes como Codex. Define que a implementação deve consultar a documentação local da versão instalada do Next.js antes de escrever código.

* `CLAUDE.md`
  Arquivo de orientação para agentes de IA, caso seja utilizado no fluxo de desenvolvimento.

* `.specify/`
  Diretório utilizado pelo GitHub Spec Kit para armazenar configurações, templates, scripts e fluxos relacionados à especificação e implementação orientada por specs.

* `.specify/templates/`
  Diretório com templates usados pelo Spec Kit para criação de documentos como PRD, Tech Spec, tarefas e planos de implementação.

* `.specify/scripts/`
  Diretório com scripts auxiliares utilizados pelo fluxo do Spec Kit.

#### Arquivos principais da aplicação Next.js

* `jaziggo/package.json`
  Define dependências, scripts de execução, build, testes e ferramentas utilizadas pela aplicação.

* `jaziggo/package-lock.json`
  Registra as versões exatas das dependências instaladas.

* `jaziggo/next.config.ts`
  Arquivo de configuração do Next.js.

* `jaziggo/tsconfig.json`
  Configuração do TypeScript para o projeto.

* `jaziggo/eslint.config.mjs`
  Configuração de lint para padronização e verificação de qualidade do código.

* `jaziggo/postcss.config.mjs`
  Configuração relacionada ao processamento de CSS.

* `jaziggo/README.md`
  Documentação inicial da aplicação.

#### Diretórios de implementação

* `jaziggo/app/`
  Diretório principal da aplicação Next.js. Deverá conter páginas, layouts, rotas, telas administrativas e possíveis endpoints internos da aplicação.

* `jaziggo/public/`
  Diretório para arquivos públicos estáticos, como imagens, ícones e outros recursos acessíveis pela aplicação.

#### Arquivos e diretórios esperados durante a implementação

* `jaziggo/prisma/schema.prisma`
  Arquivo esperado para definição do schema do banco de dados com os modelos de usuários, falecidos, responsáveis, sepulturas, jazigos e vínculos.

* `jaziggo/prisma/migrations/`
  Diretório esperado para armazenar as migrações do banco de dados geradas pelo Prisma.

* `jaziggo/lib/`
  Diretório esperado para utilitários compartilhados, configuração do Prisma, autenticação, validações e funções auxiliares.

* `jaziggo/services/`
  Diretório esperado para serviços de domínio, como `AuthService`, `UserService`, `DeceasedService`, `BurialSpaceService`, `ResponsibleService`, `LocationSearchService` e `ReportService`.

* `jaziggo/types/`
  Diretório esperado para tipos TypeScript compartilhados, incluindo DTOs, filtros, respostas da API e entidades de domínio.

* `jaziggo/app/api/`
  Diretório esperado para endpoints da API, caso a implementação utilize Route Handlers do Next.js.

* `jaziggo/app/(admin)/`
  Diretório esperado para agrupar telas administrativas protegidas, como usuários, falecidos, sepulturas/jazigos, responsáveis, busca/localização e relatórios.

* `jaziggo/middleware.ts`
  Arquivo esperado para proteção de rotas e validação de autenticação, caso a estratégia de autenticação utilize middleware do Next.js.

* `jaziggo/.env.example`
  Arquivo esperado para documentar variáveis de ambiente necessárias, como conexão com banco de dados e segredo de autenticação.

#### Observação

No momento, não foi identificada uma pasta `.cursor/rules` no projeto. Portanto, as regras de implementação devem considerar principalmente o arquivo `AGENTS.md`, a documentação local do Next.js em `node_modules/next/dist/docs/`, as configurações existentes da aplicação e as decisões registradas neste Tech Spec.
