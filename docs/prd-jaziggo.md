# Documento de Requisitos de Produto (PRD) do Jaziggo

## Status do Documento

- **Produto**: Jaziggo
- **Escopo descrito**: MVP de gestão administrativa de cemitérios
- **Estado atual**: MVP implementado para uso acadêmico/demonstração, com gates de produção ainda dependentes de validação operacional e performance em ambiente isolado
- **Fonte de verdade detalhada**: `specs/001-cemetery-management/spec.md`, `plan.md`, `tasks.md`, `data-model.md` e `contracts/openapi.yaml`

Este PRD descreve o produto no estado atual do sistema. Ele não substitui os artefatos do Spec Kit nem o contrato OpenAPI para decisões técnicas detalhadas. Quando houver conflito, prevalecem a constituição do projeto, a especificação funcional atual e o contrato OpenAPI.

## Visão Geral

Jaziggo é uma aplicação web administrativa interna para gestão de cemitérios. O sistema centraliza cadastros e consultas de usuários internos, falecidos, sepulturas, jazigos, responsáveis, vínculos de sepultamento, busca de localização e relatórios administrativos.

O objetivo do produto é reduzir dependência de livros físicos, planilhas e conhecimento informal, oferecendo uma base de dados única, consultável e protegida. A aplicação apoia a rotina de administradores e funcionários do cemitério, melhora o atendimento a familiares e visitantes por meio de busca realizada por usuários autorizados e preserva histórico operacional de vínculos e ocupação.

Familiares, visitantes e responsáveis cadastrados são beneficiários indiretos. Eles não possuem conta, não acessam a aplicação e não realizam busca pública no escopo atual. Qualquer solicitação de localização feita por familiar ou visitante deve ser atendida por um usuário autenticado com perfil `ADMIN` ou `EMPLOYEE`.

## Objetivos

- Centralizar registros de falecidos, sepulturas, jazigos, responsáveis, usuários internos e vínculos administrativos.
- Permitir que administradores e funcionários encontrem rapidamente registros e localizações cadastradas.
- Controlar ocupação de sepulturas e jazigos com regras consistentes de capacidade, status e vínculo ativo.
- Preservar histórico de sepultamento e vínculos administrativos, evitando exclusão física de vínculos históricos.
- Proteger dados pessoais por autenticação, autorização, DTOs mínimos, mascaramento de documentos e restrição de filtros sensíveis.
- Disponibilizar relatórios administrativos internos para usuários `ADMIN`.
- Manter o escopo inicial sem consulta pública direta, integrações externas obrigatórias, exportações obrigatórias, mapas interativos ou módulo financeiro.

## Usuários e Personas

### Usuários Diretos

**Administrador (`ADMIN`)**
Usuário interno responsável por gerenciar usuários, acompanhar cadastros, executar operações administrativas, consultar registros e visualizar relatórios administrativos.

**Funcionário (`EMPLOYEE`)**
Usuário interno responsável por cadastrar e atualizar registros operacionais, manter falecidos, espaços e responsáveis, criar e encerrar vínculos, realizar buscas e orientar familiares ou visitantes durante atendimento.

**Atendente**
Descrição operacional de um funcionário durante atendimento ao público. Não é um perfil de acesso separado. No sistema, um atendente usa o perfil `EMPLOYEE`.

### Beneficiários Indiretos

**Familiar ou visitante**
Pessoa que solicita orientação de localização. Não possui acesso direto ao sistema e recebe apenas as informações necessárias comunicadas por usuário autorizado.

**Responsável cadastrado**
Pessoa associada administrativamente a falecidos, sepulturas ou jazigos. Não se torna usuário do sistema por existir como responsável.

## Escopo Atual do MVP

O MVP cobre os seguintes módulos:

1. Autenticação e controle de acesso.
2. Gestão de usuários internos.
3. Cadastro, edição, consulta e duplicidade de falecidos.
4. Cadastro, edição, consulta e status de sepulturas e jazigos.
5. Cadastro, edição, consulta e vínculos de responsáveis.
6. Vínculos de sepultamento com capacidade, ocupação e encerramento histórico.
7. Busca e localização de falecidos para atendimento interno.
8. Relatórios administrativos internos.
9. Health checks, métricas protegidas e logs estruturados sem dados pessoais.

## Fora de Escopo Atual

- Consulta pública direta por familiares, visitantes ou responsáveis.
- Terceiro perfil de acesso, como `ATTENDANT`.
- Controle financeiro, pagamentos, inadimplência ou relatórios financeiros.
- Exportação obrigatória de relatórios.
- Mapas interativos, GPS, navegação em tempo real ou planta gráfica avançada.
- Aplicativo mobile nativo.
- Integrações obrigatórias com cartórios, prefeituras, órgãos públicos, sistemas funerários ou bases externas.
- Notificações automáticas por e-mail, SMS, WhatsApp ou mensageria.
- Gestão documental avançada, contratos, concessões, obras, manutenção, exumação ou transferência de restos mortais.
- Auditoria detalhada completa de alterações como requisito do MVP.
- Dashboard analítico avançado.

## Regras de Produto Consolidadas

### Acesso e Papéis

- Toda funcionalidade administrativa exige autenticação, exceto o login.
- O sistema possui exatamente dois perfis: `ADMIN` e `EMPLOYEE`.
- `ADMIN` gerencia usuários e acessa relatórios administrativos.
- `ADMIN` e `EMPLOYEE` executam operações de cadastro, edição, vínculo, busca e localização conforme permissões do domínio.
- Controles visuais não substituem autorização no servidor.
- Conta desativada não deve conseguir autenticar nem executar operações protegidas.

### Privacidade

- Dados pessoais devem aparecer apenas quando necessários para a operação autorizada.
- Documentos pessoais em listagens, buscas e relatórios devem ser mascarados, mostrando somente os quatro últimos caracteres.
- Valores de documento com quatro ou menos caracteres devem ser totalmente mascarados.
- Documento completo pode ser usado como filtro exato, mas somente em requisição `POST` com body processado no servidor.
- Telefone completo usado como filtro sensível também deve ser enviado por `POST` com body.
- Documentos completos, telefones completos, senhas, hashes, tokens e segredos não devem aparecer em URL, resposta de listagem, logs, métricas ou mensagens de erro.
- Familiares e visitantes recebem orientação de localização por atendimento humano interno, não por tela pública.

### Histórico e Exclusão

- Vínculos de sepultamento e vínculos administrativos de responsável devem ser preservados historicamente.
- Encerrar vínculo significa alterar seu status para encerrado e registrar data/motivo; não significa excluir fisicamente.
- O MVP não expõe endpoints de exclusão física para falecidos, espaços, responsáveis ou vínculos históricos.
- Usuários podem ser desativados, não removidos como ação operacional padrão.
- Registros com valor histórico devem ser corrigidos ou mantidos conforme aplicável, preservando consistência.

### Ocupação

- Sepultura possui capacidade ativa fixa de 1 falecido.
- Jazigo exige capacidade máxima igual ou superior a 1.
- Um falecido pode ter múltiplos vínculos históricos, mas no máximo um vínculo de sepultamento ativo no escopo atual.
- Espaço `AVAILABLE` não possui vínculo ativo.
- Espaço `OCCUPIED` possui ao menos um vínculo ativo.
- Espaço `RESERVED` ou `INACTIVE` bloqueia novos vínculos.
- Jazigo ocupado pode receber novo vínculo ativo enquanto estiver abaixo da capacidade e não estiver reservado ou inativo.
- Encerramento de vínculo recalcula status do espaço preservando `RESERVED` e `INACTIVE` quando aplicável.

## Requisitos Funcionais

### Usuários e Controle de Acesso

- **RF001**: Permitir login somente de usuários cadastrados e ativos, rejeitando credenciais inválidas com mensagem segura.
- **RF002**: Permitir que somente `ADMIN` cadastre novos usuários internos.
- **RF003**: Atribuir a cada usuário exatamente um perfil entre `ADMIN` e `EMPLOYEE`.
- **RF004**: Restringir funcionalidades e dados conforme perfil, inclusive em chamadas diretas aos endpoints.
- **RF005**: Permitir que somente `ADMIN` edite usuários cadastrados.
- **RF006**: Permitir que somente `ADMIN` desative usuários e impedir novos acessos de conta desativada.

### Falecidos

- **RF007**: Permitir que usuários autorizados cadastrem falecidos.
- **RF008**: Exigir nome completo e ao menos uma data entre falecimento e sepultamento. Para registros históricos sem datas, exigir indicação explícita de data desconhecida. Documento, nascimento, segunda data e observações são opcionais. Cada registro deve possuir código interno único e indicador de dados históricos incompletos quando aplicável.
- **RF009**: Permitir observações administrativas no cadastro do falecido.
- **RF010**: Permitir vincular falecido a sepultura ou jazigo existente e apto, desde que o falecido não possua outro vínculo ativo.
- **RF011**: Permitir vincular responsável existente ao cadastro do falecido.
- **RF012**: Permitir edição de falecidos por usuários autorizados, preservando consistência dos vínculos.
- **RF013**: Permitir consulta de falecidos por nome, data de falecimento, data de sepultamento ou local de sepultamento.
- **RF014**: Alertar sobre possíveis duplicidades antes da confirmação, sem bloquear automaticamente homônimos legítimos.

### Sepulturas e Jazigos

- **RF015**: Exigir tipo, identificador único no contexto da localização, status e capacidade conforme o tipo do espaço.
- **RF016**: Exigir ao menos um componente de localização entre setor, quadra/fila, rua, bloco, número ou complemento.
- **RF017**: Controlar status como `AVAILABLE`, `OCCUPIED`, `RESERVED` ou `INACTIVE`.
- **RF018**: Permitir edição de espaços após validação e confirmação de mudanças sensíveis.
- **RF019**: Atualizar status do espaço conforme vínculos ativos e encerramentos históricos.
- **RF020**: Impedir vínculo ativo que exceda capacidade ou tente usar espaço reservado/inativo.
- **RF021**: Permitir consulta de espaços por localização, status ou identificação.
- **RF022**: Exibir falecidos atualmente ou historicamente vinculados, incluindo status, data de encerramento e motivo quando houver.

### Responsáveis

- **RF023**: Exigir nome completo e ao menos um identificador ou contato: documento, telefone, e-mail ou endereço.
- **RF024**: Permitir informar dados administrativos do responsável quando aplicável, limitando exibição ao necessário.
- **RF025**: Permitir vincular responsável a falecidos, sepulturas ou jazigos existentes e encerrar vínculos administrativamente com data e motivo, sem exclusão física.
- **RF026**: Permitir editar responsáveis cadastrados.
- **RF027**: Permitir pesquisar responsáveis por nome, documento ou telefone. Nome pode ser filtro GET; documento e telefone completos devem usar POST body.
- **RF028**: Exibir vínculos ativos e históricos de cada responsável, incluindo encerramento quando aplicável.
- **RF029**: Rejeitar integralmente vínculo com registros inexistentes.

### Busca e Localização

- **RF030**: Permitir busca por nome completo ou parcial do falecido para usuários autenticados `ADMIN` ou `EMPLOYEE`.
- **RF031**: Permitir filtros por datas, setor, localização, documento do falecido, nome do responsável e documento do responsável, respeitando transporte seguro para filtros sensíveis.
- **RF032**: Exibir a localização da sepultura ou jazigo vinculado ao falecido selecionado.
- **RF033**: Diferenciar homônimos por código interno, indicador de dados incompletos, datas, localização e responsável quando disponível, sem expor documento completo.
- **RF034**: Exibir mensagem clara quando não houver resultados.
- **RF035**: Apresentar localização de forma padronizada com os componentes cadastrados.

### Relatórios Administrativos

- **RF036**: Permitir que `ADMIN` visualize relatório de falecidos cadastrados.
- **RF037**: Permitir que `ADMIN` visualize relatório de sepultamentos por período.
- **RF038**: Permitir que `ADMIN` visualize relatório de ocupação de sepulturas e jazigos.
- **RF039**: Permitir que `ADMIN` visualize relatório de espaços disponíveis, ocupados, reservados e inativos.
- **RF040**: Permitir filtros de período, status, setor ou tipo conforme o relatório.
- **RF041**: Exibir relatórios dentro da aplicação.
- **RF042**: Exibir estado vazio claro quando filtros não retornarem dados.

## Fluxos Principais

### Login e Autorização

1. Usuário interno acessa a aplicação.
2. Informa credenciais.
3. O sistema valida usuário ativo e credenciais.
4. O sistema cria sessão segura e libera somente funcionalidades permitidas ao perfil.
5. Requisições protegidas revalidam autenticação e autorização no servidor.

### Cadastro de Falecido e Vínculo de Sepultamento

1. Usuário autorizado cadastra falecido com campos mínimos.
2. Sistema valida datas, indicação de dado histórico incompleto e possível duplicidade.
3. Usuário seleciona espaço apto.
4. Sistema verifica capacidade, status do espaço e vínculo ativo prévio do falecido.
5. Sistema cria vínculo ativo em transação e atualiza status do espaço.
6. O histórico fica disponível para consulta.

### Encerramento Histórico de Vínculo

1. Usuário autorizado seleciona vínculo ativo.
2. Informa confirmação, data de encerramento e motivo.
3. Sistema altera status do vínculo para encerrado.
4. Sistema recalcula status do espaço conforme vínculos ativos restantes.
5. O vínculo encerrado permanece consultável.

### Busca de Localização Durante Atendimento

1. Familiar ou visitante solicita orientação a um funcionário ou atendente.
2. Funcionário autenticado realiza busca pelo nome ou filtros permitidos.
3. Sistema apresenta resultados internos com dados mínimos e documentos mascarados.
4. Funcionário diferencia homônimos usando código interno, datas, responsável e localização.
5. Funcionário comunica somente a localização necessária.

### Relatórios Administrativos

1. `ADMIN` acessa a área de relatórios.
2. Escolhe relatório e aplica filtros.
3. Sistema consulta dados internos e retorna visualização paginada/filtrada.
4. Caso não haja dados, apresenta estado vazio claro.
5. `EMPLOYEE` não acessa relatórios administrativos.

## Critérios de Sucesso e Validação

- Usuários não autenticados, contas desativadas e perfis sem permissão devem ser bloqueados em 100% dos cenários protegidos.
- Vínculos inválidos, inexistentes ou incompatíveis com capacidade/status devem ser rejeitados sem alterar dados válidos.
- Homônimos devem ser diferenciáveis sem exposição integral de documentos.
- Relatórios devem refletir os dados internos usados como fonte.
- Jornadas críticas devem ser utilizáveis por teclado, com foco visível, rótulos claros e mensagens que não dependam só de cor.
- Para o MVP acadêmico, SC-002, SC-004 e SC-010 são validados por cenários funcionais/documentais e testes automatizados; validação empírica com usuários reais fica como trabalho futuro.
- Metas de performance de busca em até 3 segundos e relatórios em até 10 segundos possuem scripts e baseline planejados, mas a evidência medida de produção/preprodução depende de execução com `PERFORMANCE_DATABASE_URL` isolado e registro sanitizado dos resultados.

## Estado Atual de Evidência

O MVP possui implementação e testes automatizados para os módulos centrais, incluindo autenticação, RBAC, privacidade, regras de vínculo, relatórios e contrato HTTP. O contrato OpenAPI deve ser validado junto com a suíte de contrato que compara rotas, métodos, segurança e envelopes.

A evidência de restauração de backup existe de forma sanitizada para o contexto acadêmico/MVP. Para produção, deve ser repetida contra a estratégia real de backup e ambiente isolado aprovado.

A evidência real de performance ainda não deve ser considerada concluída para produção enquanto os benchmarks T165/T166 e os query plans T167 não forem executados contra a base de performance isolada.

## Requisitos de UI/UX

- Interface administrativa objetiva, organizada por módulos e adequada para uso repetido.
- Navegação por perfil, exibindo somente módulos permitidos.
- Formulários com campos obrigatórios claros, validação e mensagens objetivas.
- Estados de loading, sucesso, erro e vazio em fluxos críticos.
- Confirmação explícita para ações sensíveis, como desativar usuário, alterar status de espaço e encerrar vínculo.
- Resultados de busca com dados suficientes para diferenciação, sem exposição desnecessária.
- Localização apresentada em formato textual padronizado.
- Relatórios internos com filtros claros e estados vazios compreensíveis.
- Sem tela pública de consulta.

## Requisitos de Acessibilidade

- Navegação básica por teclado nas jornadas críticas.
- Foco visível em botões, links e campos.
- Rótulos claros em formulários.
- Tabelas com cabeçalhos compreensíveis.
- Contraste legível.
- Mensagens de erro textuais, sem depender apenas de cor.
- Hierarquia visual clara.

## Restrições Técnicas de Alto Nível

- Aplicação web Next.js existente em `jaziggo/`; não criar segunda aplicação.
- TypeScript como linguagem da aplicação.
- PostgreSQL como banco relacional.
- Prisma ORM para acesso a dados e migrations.
- Auth.js com credenciais internas e senha com hash seguro.
- Relatórios visualizados dentro da aplicação.
- Sem integrações externas obrigatórias no escopo inicial.
- HTTPS obrigatório em produção.
- Logs e métricas sem dados pessoais completos.

## Riscos e Mitigações

### Dados Históricos Incompletos

Risco: registros antigos podem não possuir documento, datas completas ou localização padronizada.
Mitigação: permitir cadastro com indicação explícita de dados desconhecidos, código interno único e indicador de incompletude.

### Duplicidade

Risco: homônimos ou registros parciais podem gerar duplicidade.
Mitigação: alertar possíveis duplicidades e permitir revisão humana sem bloqueio automático rígido.

### Ocupação Incorreta

Risco: múltiplos vínculos indevidos podem comprometer capacidade.
Mitigação: transações, validação de capacidade, vínculo ativo único por falecido e recálculo de status.

### Exposição de Dados Pessoais

Risco: documentos, contatos ou dados sensíveis aparecerem em superfícies indevidas.
Mitigação: mascaramento, DTOs mínimos, filtros sensíveis por POST body, logs/métricas sem dados pessoais e autorização server-side.

### Performance Ainda Não Medida para Produção

Risco: buscas ou relatórios em base grande não atenderem metas.
Mitigação: scripts de benchmark, baseline de performance, query plans e execução pendente em ambiente isolado antes de aprovação produtiva.

### Escopo Crescente

Risco: inclusão prematura de mapas, exportações, integrações ou financeiro.
Mitigação: manter esses itens fora do MVP e exigir nova especificação para futuras versões.

## Questões Resolvidas

- Atendente não é perfil separado; usa `EMPLOYEE`.
- Familiares, visitantes e responsáveis não acessam diretamente o sistema.
- Sepultura aceita um vínculo ativo; jazigo aceita múltiplos vínculos ativos até a capacidade.
- Falecido pode ter vários vínculos históricos, mas no máximo um vínculo ativo.
- Vínculos encerrados são preservados com data e motivo.
- Documento completo não é exibido em resultados e só pode ser usado como filtro sensível no servidor.
- Relatórios são internos e restritos a `ADMIN` no MVP.
- Não há exclusão física operacional de vínculos históricos no contrato atual.

## Questões Futuras

- Validação empírica com administradores e funcionários reais.
- Execução e registro dos benchmarks de performance em base isolada.
- Estratégia produtiva de backup, restore e operação contínua.
- Eventual suporte multi-cemitério.
- Exportação de relatórios.
- Busca aproximada por similaridade textual.
- Auditoria detalhada de alterações.
- Mapas ou representação gráfica do cemitério.
- Integrações externas e módulos financeiros, caso aprovados em nova especificação.