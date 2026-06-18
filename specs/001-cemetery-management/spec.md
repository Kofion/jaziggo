# Feature Specification: Gestão Administrativa de Cemitérios do Jaziggo

**Feature Branch**: `001-cemetery-management`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Criar a especificação funcional oficial do Jaziggo com base no PRD,
preservando os módulos e os requisitos RF001 a RF042."

## Clarifications

### Session 2026-06-18

- Q: Quais são os campos mínimos obrigatórios para falecidos, sepulturas ou jazigos e responsáveis? → A: Falecido exige nome completo e uma data de falecimento ou sepultamento, com indicação de data desconhecida para registro histórico; espaço exige tipo, identificador, status e um componente de localização; responsável exige nome completo e um identificador ou contato.
- Q: Como funcionam a ocupação e a quantidade de falecidos ativos por tipo de espaço? → A: Sepultura admite um falecido ativo; jazigo exige capacidade máxima e admite múltiplos falecidos ativos até esse limite; disponível não possui vínculo ativo, ocupado possui ao menos um, e reservado ou inativo bloqueia novos vínculos.
- Q: O que acontece quando um vínculo de sepultamento é removido? → A: O vínculo é desativado, nunca excluído, e preserva data de encerramento e motivo; o estado do espaço é recalculado pelos vínculos ativos, preservando os estados reservado ou inativo.
- Q: Como diferenciar registros históricos incompletos e exibir documentos pessoais na busca? → A: Registros incompletos recebem código interno e indicação de dados históricos incompletos; resultados usam os dados disponíveis e exibem somente os quatro últimos caracteres de documentos, embora aceitem documento completo como filtro exato.
- Q: Atendente é um perfil de acesso separado? → A: Não. Atendente é uma função operacional exercida por usuário com perfil EMPLOYEE e possui as mesmas permissões de funcionário.
- Q: Quantos vínculos de sepultamento ativos um falecido pode possuir? → A: Um falecido pode manter vários vínculos históricos, mas no máximo um vínculo ativo no escopo inicial.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acessar e administrar usuários (Priority: P1)

Como administrador, quero autenticar usuários internos e gerenciar suas contas e perfis para que
somente pessoas autorizadas utilizem as funcionalidades adequadas à sua função.

**Why this priority**: O controle de acesso protege todos os dados e é pré-requisito para qualquer
operação administrativa ou operacional.

**Independent Test**: Pode ser testado criando usuários `ADMIN` e `EMPLOYEE`, autenticando cada um,
verificando as permissões e desativando uma conta sem utilizar os demais módulos.

**Acceptance Scenarios**:

1. **Given** um usuário ativo com credenciais válidas, **When** ele realiza login, **Then** o sistema
   libera somente as funcionalidades permitidas para seu perfil.
2. **Given** um usuário não autenticado, **When** ele tenta acessar qualquer área administrativa,
   **Then** o sistema impede o acesso e solicita autenticação.
3. **Given** um funcionário autenticado, **When** ele tenta acessar o gerenciamento de usuários ou
   relatórios administrativos, **Then** o sistema nega a operação.
4. **Given** um administrador autenticado, **When** ele cadastra, edita ou desativa um usuário,
   **Then** a alteração é validada, confirmada e passa a valer nos acessos seguintes.

---

### User Story 2 - Registrar falecidos e sepultamentos (Priority: P1)

Como funcionário ou administrador, quero cadastrar e atualizar falecidos e vinculá-los ao local de
sepultamento para manter registros centralizados, consistentes e consultáveis.

**Why this priority**: O registro do falecido e do sepultamento constitui o núcleo operacional do
Jaziggo e alimenta buscas, ocupação e relatórios.

**Independent Test**: Pode ser testado cadastrando um falecido, identificando uma possível
duplicidade, vinculando um espaço válido e consultando posteriormente o registro salvo.

**Acceptance Scenarios**:

1. **Given** os dados mínimos de um falecido e um espaço válido, **When** o funcionário confirma o
   cadastro, **Then** o sistema registra o falecido, o vínculo e as informações disponíveis.
2. **Given** um cadastro semelhante a outro existente, **When** o funcionário tenta salvá-lo,
   **Then** o sistema alerta sobre a possível duplicidade antes da confirmação.
3. **Given** um registro antigo com documento ou datas incompletas, **When** o funcionário informa os
   campos mínimos e identifica a ausência dos demais dados, **Then** o sistema permite preservar o
   registro histórico sem inventar informações.
4. **Given** um falecido já cadastrado, **When** um usuário autorizado corrige seus dados, **Then** o
   sistema valida e apresenta as informações atualizadas nas consultas posteriores.

---

### User Story 3 - Gerenciar sepulturas, jazigos e ocupação (Priority: P1)

Como funcionário ou administrador, quero cadastrar, atualizar e consultar espaços cemiteriais e
seus vínculos para conhecer a localização, a situação e o histórico de ocupação de cada espaço.

**Why this priority**: A gestão confiável dos espaços evita conflitos de sepultamento e permite
identificar locais disponíveis, ocupados, reservados ou inativos.

**Independent Test**: Pode ser testado cadastrando espaços, alterando seus estados, vinculando um
falecido conforme a regra de ocupação e tentando ultrapassar a ocupação permitida.

**Acceptance Scenarios**:

1. **Given** uma identificação e localização válidas, **When** o funcionário cadastra uma sepultura
   ou jazigo, **Then** o espaço fica disponível para consulta com o estado informado.
2. **Given** um espaço apto a receber um vínculo, **When** um falecido é vinculado, **Then** o sistema
   atualiza sua ocupação conforme a regra aplicável e preserva o vínculo no histórico.
3. **Given** um espaço cuja regra não admite outro sepultamento, **When** um usuário tenta criar novo
   vínculo, **Then** o sistema bloqueia a operação e explica o conflito.
4. **Given** filtros por identificação, localização ou estado, **When** o usuário consulta os
   espaços, **Then** o sistema lista apenas os registros compatíveis e seus falecidos vinculados.

---

### User Story 4 - Manter responsáveis e vínculos (Priority: P2)

Como funcionário ou administrador, quero registrar responsáveis e associá-los aos registros
pertinentes para manter contatos administrativos organizados e atualizados.

**Why this priority**: Responsáveis apoiam a operação administrativa, mas seus cadastros dependem da
existência dos registros principais aos quais serão vinculados.

**Independent Test**: Pode ser testado cadastrando um responsável, vinculando-o a registros
existentes, pesquisando-o e rejeitando um vínculo com registro inexistente.

**Acceptance Scenarios**:

1. **Given** os dados mínimos de um responsável, **When** o funcionário salva o cadastro, **Then** o
   sistema registra apenas os dados informados e protege os dados pessoais nas visualizações.
2. **Given** um responsável e registros existentes, **When** o funcionário cria os vínculos,
   **Then** todos os vínculos ficam visíveis no cadastro do responsável e nos registros associados.
3. **Given** um identificador de registro inexistente, **When** o usuário tenta vinculá-lo ao
   responsável, **Then** o sistema rejeita a operação sem criar vínculo parcial.

---

### User Story 5 - Localizar sepulturas durante atendimento (Priority: P1)

Como funcionário, inclusive quando exerço a função de atendente, quero buscar um falecido e
visualizar sua localização padronizada
para orientar familiares e visitantes com rapidez, precisão e exposição mínima de dados.

**Why this priority**: A localização durante o atendimento é um dos principais benefícios do
produto. Familiares e visitantes são beneficiários indiretos e não acessam o sistema.

**Independent Test**: Pode ser testado por um funcionário autenticado pesquisando nomes completos e
parciais, refinando resultados, diferenciando homônimos e comunicando a localização encontrada.

**Acceptance Scenarios**:

1. **Given** um familiar ou visitante solicitando orientação, **When** o funcionário busca pelo nome
   completo ou parcial do falecido, **Then** o sistema apresenta os registros compatíveis somente ao
   funcionário autenticado.
2. **Given** dois ou mais registros semelhantes, **When** os resultados são exibidos, **Then** o
   funcionário recebe informações complementares suficientes para diferenciá-los sem exposição
   desnecessária de dados pessoais.
3. **Given** o falecido correto selecionado, **When** o funcionário abre o resultado, **Then** o
   sistema apresenta a localização com os componentes cadastrados em ordem padronizada.
4. **Given** uma busca sem correspondências, **When** ela é concluída, **Then** o sistema informa
   claramente que nenhum registro foi encontrado.
5. **Given** um familiar ou visitante sem conta interna, **When** tenta acessar diretamente a busca,
   **Then** nenhum acesso público é disponibilizado.

---

### User Story 6 - Consultar relatórios administrativos (Priority: P2)

Como administrador, quero visualizar relatórios com filtros sobre cadastros, sepultamentos e
ocupação para acompanhar a operação do cemitério com base nos dados internos.

**Why this priority**: Os relatórios apoiam a gestão, mas dependem dos dados produzidos pelos módulos
operacionais.

**Independent Test**: Pode ser testado com dados previamente cadastrados, aplicando cada conjunto de
filtros e comparando os resultados exibidos com os registros de origem.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado e registros existentes, **When** ele escolhe um relatório e
   aplica filtros, **Then** o sistema exibe dentro da aplicação somente os dados correspondentes.
2. **Given** filtros sem registros correspondentes, **When** o relatório é consultado, **Then** o
   sistema exibe um estado vazio claro em vez de dados incorretos.
3. **Given** um funcionário autenticado, **When** ele tenta acessar relatórios administrativos,
   **Then** o sistema nega o acesso.

### Edge Cases

- Credenciais inválidas, conta desativada ou sessão ausente não concedem acesso e geram mensagem
  clara sem revelar detalhes internos.
- E-mail já associado a outro usuário não pode criar uma segunda conta conflitante.
- Campos obrigatórios ausentes ou valores inválidos impedem o salvamento e identificam os campos a
  corrigir.
- Registros antigos podem não possuir documento ou datas completas; a ausência deve ser explícita e
  não pode ser substituída por valores presumidos.
- Possíveis duplicidades de falecidos devem ser sinalizadas antes da confirmação sem eliminar a
  possibilidade legítima de homônimos.
- Espaços com a mesma identificação e localização não podem ser duplicados inadvertidamente.
- Um vínculo que ultrapasse a regra de ocupação do espaço deve ser rejeitado sem alterar o estado ou
  o histórico existente.
- Um jazigo ocupado mas abaixo de sua capacidade deve aceitar novo vínculo ativo; ao atingir a
  capacidade, qualquer novo vínculo deve ser rejeitado.
- Encerrar um vínculo deve exigir confirmação, data de encerramento e motivo; a operação não pode
  excluir o vínculo nem apagá-lo das consultas históricas.
- Alterar o estado de um espaço exige confirmação e não pode contradizer vínculos ativos.
- Vínculos com falecido, responsável ou espaço inexistente devem ser rejeitados integralmente.
- Um falecido que já possua vínculo de sepultamento ativo não pode receber outro até o encerramento
  histórico do vínculo atual.
- Encerrar vínculo administrativo de responsável deve exigir confirmação, data e motivo, preservando
  o registro para consulta histórica.
- Buscas por nome parcial podem retornar muitos resultados; filtros devem permitir refinamento.
- Homônimos devem ser diferenciados por código interno, indicador de dados históricos incompletos e
  dados complementares disponíveis; documentos pessoais devem exibir somente seus quatro últimos
  caracteres nos resultados.
- Uma localização pode ter componentes ausentes; a apresentação deve usar os componentes existentes
  sem produzir separadores vazios ou informação falsa.
- Listagens, buscas e relatórios sem dados devem apresentar estados vazios claros.
- Familiares, visitantes e responsáveis não possuem acesso direto, mesmo que seus dados constem no
  sistema.

## Requirements *(mandatory)*

### Functional Requirements

#### Usuários e controle de acesso

- **RF001**: O sistema DEVE permitir o login somente de usuários cadastrados e ativos, rejeitando
  credenciais inválidas com mensagem clara.
- **RF002**: O sistema DEVE permitir que somente um administrador cadastre novos usuários internos.
- **RF003**: O sistema DEVE permitir atribuir a cada usuário exatamente um perfil de acesso entre
  `ADMIN` e `EMPLOYEE`.
- **RF004**: O sistema DEVE restringir funcionalidades e dados conforme o perfil do usuário, inclusive
  quando uma operação restrita for solicitada fora da navegação normal.
- **RF005**: O sistema DEVE permitir que somente um administrador edite usuários cadastrados.
- **RF006**: O sistema DEVE permitir que somente um administrador desative usuários e DEVE impedir
  novos acessos de uma conta desativada.

#### Falecidos

- **RF007**: O sistema DEVE permitir que usuários autorizados cadastrem falecidos.
- **RF008**: O cadastro de falecido DEVE exigir nome completo e ao menos uma data entre falecimento
  e sepultamento. Para registro histórico sem nenhuma dessas datas, o usuário DEVE indicar
  explicitamente que a data é desconhecida. CPF ou outro documento, data de nascimento, a segunda
  data e observações permanecem opcionais. Cada registro DEVE receber um código interno único; um
  registro sem documento ou sem ambas as datas DEVE indicar dados históricos incompletos.
- **RF009**: O sistema DEVE permitir adicionar observações ao cadastro do falecido.
- **RF010**: O sistema DEVE permitir vincular um falecido a uma sepultura ou jazigo existente e apto
  segundo a regra de ocupação aplicável, desde que o falecido não possua outro vínculo ativo. Um
  falecido pode manter vários vínculos históricos, mas no máximo um vínculo ativo.
- **RF011**: O sistema DEVE permitir vincular um responsável existente ao cadastro do falecido.
- **RF012**: O sistema DEVE permitir que usuários autorizados editem informações de falecidos
  cadastrados, preservando a consistência de seus vínculos.
- **RF013**: O sistema DEVE permitir consultar falecidos por nome, data de falecimento, data de
  sepultamento ou local de sepultamento.
- **RF014**: O sistema DEVE alertar o usuário antes da confirmação quando identificar possíveis
  registros duplicados de falecidos, apresentando dados suficientes para comparação.

#### Sepulturas e jazigos

- **RF015**: O cadastro de sepultura ou jazigo DEVE exigir tipo, identificador único no contexto de
  sua localização e estado. Sepultura DEVE ter capacidade fixa de um falecido ativo; jazigo DEVE
  informar capacidade máxima inteira igual ou superior a um.
- **RF016**: O cadastro de sepultura ou jazigo DEVE exigir ao menos um componente de localização
  entre setor, quadra, rua, bloco, número ou descrição complementar e DEVE permitir registrar os
  demais componentes aplicáveis ao espaço.
- **RF017**: O sistema DEVE exigir e permitir definir o estado do espaço como `AVAILABLE`, `OCCUPIED`,
  `RESERVED` ou `INACTIVE`, apresentados aos usuários como disponível, ocupado, reservado ou inativo.
  Disponível significa nenhum vínculo ativo; ocupado significa ao menos um vínculo ativo; reservado
  e inativo bloqueiam novos vínculos enquanto permanecerem nesses estados.
- **RF018**: O sistema DEVE permitir editar informações de sepulturas e jazigos cadastrados após
  validação e confirmação de alterações sensíveis.
- **RF019**: O sistema DEVE atualizar o espaço para ocupado quando receber seu primeiro vínculo ativo.
  Um jazigo ocupado DEVE continuar aceitando vínculos ativos enquanto estiver abaixo de sua
  capacidade máxima e não estiver reservado ou inativo. Ao encerrar um vínculo, o sistema DEVE
  manter o espaço ocupado enquanto houver outro vínculo ativo; sem vínculos ativos, DEVE defini-lo
  como disponível, salvo se o espaço já estiver reservado ou inativo.
- **RF020**: O sistema DEVE impedir novo vínculo ativo em sepultura que já possua um falecido ativo,
  em jazigo que tenha atingido sua capacidade máxima ou em qualquer espaço reservado ou inativo.
- **RF021**: O sistema DEVE permitir consultar sepulturas e jazigos por localização, estado ou
  identificação.
- **RF022**: O sistema DEVE permitir visualizar os falecidos atualmente ou historicamente vinculados
  a uma sepultura ou jazigo, incluindo o estado do vínculo e, para vínculo encerrado, sua data de
  encerramento e motivo.

#### Responsáveis

- **RF023**: O cadastro de responsável DEVE exigir nome completo e ao menos um identificador ou
  contato entre CPF ou outro documento, telefone, e-mail ou endereço.
- **RF024**: O sistema DEVE permitir informar nome, telefone, e-mail, CPF ou outro documento e
  endereço do responsável quando aplicável, limitando a exibição ao necessário para cada operação.
- **RF025**: O sistema DEVE permitir vincular um responsável a um ou mais falecidos, sepulturas ou
  jazigos existentes e encerrar cada vínculo administrativamente com data e motivo, sem exclusão
  física.
- **RF026**: O sistema DEVE permitir editar dados de responsáveis cadastrados.
- **RF027**: O sistema DEVE permitir pesquisar responsáveis por nome, documento ou telefone. Nome
  pode ser filtro GET; documento completo e telefone completo DEVEM ser enviados somente em operação
  POST com body, nunca em query string ou URL.
- **RF028**: O sistema DEVE exibir, para usuários autorizados, os vínculos ativos e históricos de cada
  responsável com falecidos, sepulturas ou jazigos, incluindo data e motivo de encerramento quando
  aplicável.
- **RF029**: O sistema DEVE impedir integralmente o vínculo de um responsável a registros
  inexistentes.

#### Busca e localização

- **RF030**: O sistema DEVE permitir que usuários autenticados com perfil `EMPLOYEE` ou `ADMIN`
  busquem falecidos pelo nome completo ou parcial. A função de atendente DEVE usar o perfil
  `EMPLOYEE`, sem criar um terceiro perfil de acesso.
- **RF031**: O sistema DEVE permitir filtrar resultados por data de falecimento, data de
  sepultamento, setor, localização, CPF ou documento do falecido, nome do responsável ou CPF ou
  documento do responsável. A busca por documento completo DEVE realizar correspondência exata por
  operação POST com body processado somente no servidor; documentos completos NÃO DEVEM aparecer em
  query string, URL, resposta, logs, métricas ou mensagens de erro.
- **RF032**: O sistema DEVE exibir ao usuário interno a localização da sepultura ou jazigo vinculado
  ao falecido selecionado.
- **RF033**: O sistema DEVE permitir diferenciar falecidos com nomes iguais ou semelhantes pelo
  código interno, indicador de dados históricos incompletos, datas, localização e responsável quando
  disponíveis. Quando documento do falecido ou responsável for exibido nos resultados, somente seus
  quatro últimos caracteres DEVEM permanecer visíveis.
- **RF034**: O sistema DEVE exibir mensagem clara quando nenhum resultado for encontrado.
- **RF035**: O sistema DEVE apresentar a localização de forma clara e padronizada, incluindo os
  componentes cadastrados de setor, quadra, rua, bloco, número ou descrição complementar.

#### Relatórios administrativos

- **RF036**: O sistema DEVE permitir que administradores visualizem relatório de falecidos
  cadastrados.
- **RF037**: O sistema DEVE permitir que administradores visualizem relatório de sepultamentos por
  período.
- **RF038**: O sistema DEVE permitir que administradores visualizem relatório de ocupação de
  sepulturas e jazigos.
- **RF039**: O sistema DEVE permitir que administradores visualizem relatório de espaços disponíveis,
  ocupados, reservados e inativos.
- **RF040**: O sistema DEVE permitir aplicar aos relatórios filtros de período, estado, setor ou tipo
  de registro, conforme o relatório escolhido.
- **RF041**: O sistema DEVE apresentar os relatórios diretamente dentro da área administrativa do
  Jaziggo.
- **RF042**: O sistema DEVE exibir mensagem clara quando não houver dados para os filtros de relatório
  selecionados.

### Cross-Cutting Requirements

- **CR-001**: Toda funcionalidade administrativa DEVE exigir autenticação, exceto a ação necessária
  para iniciar uma sessão.
- **CR-002**: Familiares, visitantes e responsáveis cadastrados NÃO DEVEM possuir acesso direto ao
  Jaziggo; toda busca solicitada por eles DEVE ser realizada por usuário autorizado com perfil
  `EMPLOYEE` ou `ADMIN`.
- **CR-003**: Dados pessoais DEVEM ser coletados e exibidos apenas quando necessários à operação e
  NÃO DEVEM ser expostos desnecessariamente em buscas, relatórios, mensagens ou listagens. Documentos
  pessoais em resultados de busca DEVEM permanecer mascarados, mostrando somente os quatro últimos
  caracteres. Documentos completos usados como filtro exato DEVEM ser enviados em body de requisição
  POST e NÃO DEVEM aparecer em URL, resposta, logs, métricas ou mensagens de erro.
- **CR-003a**: Telefone completo usado como filtro administrativo DEVE ser enviado por POST body e
  NÃO DEVE aparecer em URL, resposta de listagem, logs, métricas ou mensagens de erro.
- **CR-004**: O sistema DEVE preservar registros e vínculos históricos. Encerrar vínculo de
  sepultamento ou vínculo administrativo de responsável significa desativá-lo com data de
  encerramento e motivo, sem exclusão física; o escopo inicial permite edição ou desativação
  aplicável dos demais registros, mas não exige exclusão definitiva.
- **CR-005**: A navegação DEVE apresentar claramente os módulos de usuários, falecidos,
  sepulturas/jazigos, responsáveis, busca/localização e relatórios conforme a permissão do usuário.
- **CR-006**: Formulários DEVEM identificar campos obrigatórios, validar os dados e apresentar
  mensagens objetivas de erro ou sucesso.
- **CR-007**: Ações sensíveis, como desativar usuário, alterar estado de espaço ou remover vínculo,
  DEVEM exigir confirmação explícita.
- **CR-008**: As jornadas principais DEVEM ser utilizáveis por teclado, apresentar foco visível,
  rótulos claros, contraste legível e mensagens que não dependam exclusivamente de cor.
- **CR-009**: O sistema DEVE funcionar sem integrações externas obrigatórias, e relatórios DEVEM usar
  somente os dados internos cadastrados.

### Scope Boundaries

**In scope**:

- Uso administrativo interno por usuários `ADMIN` e `EMPLOYEE`; atendente é uma função operacional
  abrangida pelo perfil `EMPLOYEE`.
- Autenticação e perfis `ADMIN` e `EMPLOYEE`.
- Os seis módulos definidos nesta especificação e os requisitos `RF001` a `RF042`.
- Consulta de localização baseada nos componentes textuais cadastrados.
- Visualização de relatórios dentro do Jaziggo.

**Out of scope**:

- Acesso ou consulta pública direta por familiares, visitantes ou responsáveis.
- Controle financeiro e relatórios financeiros.
- Mapas interativos, GPS, navegação em tempo real ou planta gráfica avançada.
- Aplicativo móvel nativo.
- Integrações com cartórios, prefeituras, órgãos públicos ou outros sistemas externos.
- Notificações automáticas por e-mail, SMS, mensageria ou canais semelhantes.
- Gestão documental avançada, contratos, concessões, manutenção, obras, exumação ou transferências.
- Auditoria detalhada, painéis analíticos avançados e exportação de relatórios.

### Requirement Traceability

| Module | Requirements | Primary acceptance coverage |
|--------|--------------|-----------------------------|
| Usuários e acesso | RF001-RF006 | User Story 1 |
| Falecidos | RF007-RF014 | User Story 2 |
| Sepulturas e jazigos | RF015-RF022 | User Story 3 |
| Responsáveis | RF023-RF029 | User Story 4 |
| Busca e localização | RF030-RF035 | User Story 5 |
| Relatórios | RF036-RF042 | User Story 6 |

### Key Entities

- **Usuário**: Pessoa autorizada a acessar o sistema; possui identidade, credenciais, estado ativo ou
  inativo e um perfil `ADMIN` ou `EMPLOYEE`. Atendente não é perfil separado, mas uma função que usa
  o perfil `EMPLOYEE`.
- **Falecido**: Pessoa sepultada ou registrada; possui código interno único, indicador de dados
  históricos incompletos quando aplicável, identificação disponível, datas, observações, local de
  sepultamento e responsáveis relacionados.
- **Espaço Cemiterial**: Sepultura ou jazigo identificado por tipo, localização, estado e capacidade;
  sepultura tem capacidade ativa fixa de um, jazigo possui capacidade máxima informada no cadastro,
  e ambos mantêm vínculos atuais e históricos com falecidos.
- **Responsável**: Pessoa de contato administrativo, com dados pessoais estritamente necessários e
  vínculos com falecidos ou espaços cemiteriais; não é usuário do sistema por esse vínculo.
- **Vínculo de Responsável**: Associação administrativa ativa ou histórica entre um responsável e
  exatamente um falecido ou espaço; quando encerrada, preserva data e motivo sem exclusão física.
- **Vínculo de Sepultamento**: Associação histórica entre um falecido e um espaço, com estado ativo
  ou encerrado e informações necessárias para determinar localização e ocupação; quando encerrado,
  mantém obrigatoriamente data de encerramento e motivo.
- **Localização**: Composição textual padronizada de setor, quadra, rua, bloco, número e descrição
  complementar disponíveis.
- **Relatório**: Visualização administrativa derivada dos registros internos e dos filtros escolhidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos cenários de aceitação, usuários não autenticados, contas desativadas e
  perfis sem permissão são impedidos de acessar a operação protegida.
- **SC-002**: Pelo menos 90% dos funcionários participantes de um teste de uso conseguem cadastrar um
  falecido e vinculá-lo a um espaço válido em até 5 minutos, sem ajuda externa.
- **SC-003**: Pelo menos 95% das buscas de localização apresentam resultados ou um estado sem
  resultados em até 3 segundos nas condições operacionais acordadas para o cemitério.
- **SC-004**: Pelo menos 90% dos atendimentos simulados localizam o registro correto e produzem uma
  orientação de localização em até 2 minutos.
- **SC-005**: Em 100% dos testes de conflito, vínculos inexistentes ou incompatíveis com a regra de
  ocupação são rejeitados sem alterar dados válidos existentes.
- **SC-006**: Em 100% dos testes com homônimos, o funcionário consegue distinguir os registros usando
  as informações complementares exibidas sem depender da exposição integral de documentos.
- **SC-007**: Em 100% das amostras de relatório, totais, filtros e estados exibidos correspondem aos
  registros internos usados como fonte.
- **SC-008**: Pelo menos 95% das visualizações de relatório são concluídas em até 10 segundos nas
  condições operacionais acordadas, inclusive quando não houver dados.
- **SC-009**: As jornadas críticas de login, cadastro, busca e relatórios podem ser concluídas por
  teclado e passam em 100% dos cenários de acessibilidade definidos nesta especificação.
- **SC-010**: Pelo menos 80% dos administradores e funcionários participantes de validação consideram
  claras a navegação, as mensagens e a apresentação da localização.

## Assumptions

- O escopo inicial atende um único cemitério; suporte a múltiplos cemitérios exige nova especificação.
- As regras administrativas de ocupação serão fornecidas pelo cemitério antes do uso; o Jaziggo
  aplica as capacidades definidas nesta especificação, mas não define normas legais de sepultamento.
- Uma sepultura pode manter múltiplos vínculos históricos, mas somente um vínculo ativo. Um jazigo
  pode manter múltiplos vínculos históricos e múltiplos vínculos ativos até sua capacidade máxima.
- Um falecido pode manter múltiplos vínculos de sepultamento históricos, mas somente um vínculo ativo
  no escopo inicial.
- Um responsável pode estar vinculado a mais de um falecido, sepultura ou jazigo.
- Registros antigos podem ser cadastrados sem documento e sem datas quando a informação não existir,
  desde que tenham nome completo e sejam explicitamente identificados como registros com data
  desconhecida; o código interno e o indicador de dados históricos incompletos apoiam sua
  diferenciação nas buscas.
- Possível duplicidade gera alerta e revisão humana; não bloqueia automaticamente homônimos legítimos.
- Registros com valor histórico são corrigidos ou desativados conforme aplicável, sem exclusão
  definitiva no escopo inicial; vínculos encerrados permanecem disponíveis para consultas históricas
  e relatórios aplicáveis.
- A precisão de buscas, localizações e relatórios depende da qualidade e atualização dos dados
  fornecidos pelos usuários internos.
- Relatórios são apenas visualizados dentro da aplicação; exportação não faz parte desta feature.
- Não há integrações externas obrigatórias nem validação automática em bases oficiais.
- Esta feature evolui a aplicação Next.js já existente em `jaziggo/`; criar outra aplicação Next.js
  ou um produto paralelo não faz parte desta especificação.
