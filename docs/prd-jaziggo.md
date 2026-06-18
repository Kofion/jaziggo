# Documento de Requisitos de Produto (PRD) do Jaziggo

## Visão Geral

O sistema de gerenciamento de cemitérios será uma aplicação web voltada para a organização administrativa de cemitérios, permitindo o cadastro e controle de falecidos, sepulturas, jazigos, responsáveis e localização de túmulos. O objetivo é substituir ou reduzir processos manuais, registros físicos e planilhas descentralizadas, oferecendo uma base de dados centralizada, consultável e segura.

A solução será utilizada principalmente por administradores e funcionários de cemitérios, que poderão registrar sepultamentos, consultar informações rapidamente, acompanhar a ocupação dos espaços e manter o histórico de cada sepultura ou jazigo. Como valor adicional, o sistema também poderá facilitar a localização de sepulturas por familiares e visitantes.

O produto é valioso porque melhora a organização interna, reduz perda de informações, agiliza o atendimento ao público e contribui para a digitalização de um setor que muitas vezes ainda depende de controles manuais. Além disso, a geração de relatórios administrativos permitirá que a gestão acompanhe dados importantes, como ocupação dos espaços e histórico de sepultamentos

## Objetivos


* Centralizar o cadastro e a consulta de informações relacionadas a falecidos, sepulturas, jazigos, responsáveis e usuários do sistema.

* Reduzir a dependência de registros físicos, planilhas manuais ou controles descentralizados, oferecendo uma base de dados única para a gestão do cemitério.

* Permitir que administradores e funcionários localizem rapidamente informações sobre falecidos, sepultamentos, sepulturas, jazigos e responsáveis vinculados.

* Facilitar o controle da ocupação do cemitério, possibilitando identificar sepulturas e jazigos ocupados, disponíveis, reservados ou inativos.

* Melhorar a agilidade no atendimento a familiares e visitantes que buscam informações sobre a localização de sepulturas.

* Disponibilizar relatórios administrativos que auxiliem na gestão do cemitério, como relatórios de falecidos cadastrados, sepultamentos por período e ocupação dos espaços.

* Garantir maior organização, segurança e consistência das informações cadastradas no sistema.

* Apoiar a administração do cemitério na tomada de decisões por meio de informações centralizadas, organizadas e de fácil consulta.


## Histórias de Usuário

### Personas

#### Usuários primários

**Administrador do cemitério**
Responsável por gerenciar o sistema, controlar usuários, acompanhar cadastros, consultar informações gerais, gerar relatórios administrativos e supervisionar a ocupação dos espaços cemiteriais.

**Funcionário/Atendente do cemitério**
Responsável por realizar cadastros, atualizar informações, consultar falecidos, localizar sepulturas e atender familiares ou visitantes que buscam informações.

#### Usuários secundários

**Familiar ou visitante**
Pessoa que busca localizar a sepultura de um falecido ou obter informações básicas de localização dentro do cemitério.

**Responsável pelo falecido, sepultura ou jazigo**
Pessoa associada a um falecido, sepultura ou jazigo, podendo ser utilizada como contato administrativo pelo cemitério.

---

### Histórias principais

* Como administrador do cemitério, eu quero cadastrar e gerenciar usuários do sistema para que apenas pessoas autorizadas possam acessar e modificar informações administrativas.

* Como administrador do cemitério, eu quero definir perfis de acesso para que cada usuário utilize apenas as funcionalidades adequadas à sua função.

* Como funcionário do cemitério, eu quero cadastrar falecidos com informações pessoais, data de falecimento, data de sepultamento e local de sepultamento para que o cemitério mantenha um histórico organizado e consultável.

* Como funcionário do cemitério, eu quero editar informações de falecidos cadastrados para corrigir ou atualizar dados quando necessário.

* Como funcionário do cemitério, eu quero cadastrar sepulturas e jazigos com identificação, localização e status para que seja possível controlar quais espaços estão disponíveis, ocupados, reservados ou inativos.

* Como funcionário do cemitério, eu quero atualizar o status de sepulturas e jazigos para manter a situação dos espaços sempre correta.

* Como funcionário do cemitério, eu quero vincular um falecido a uma sepultura ou jazigo para que a localização do sepultamento possa ser consultada posteriormente.

* Como funcionário do cemitério, eu quero cadastrar responsáveis vinculados a falecidos, sepulturas ou jazigos para que o cemitério saiba quem deve ser contatado em situações administrativas.

* Como funcionário do cemitério, eu quero pesquisar falecidos pelo nome, data de falecimento, data de sepultamento ou localização para encontrar rapidamente as informações solicitadas.

* Como funcionário do cemitério, eu quero consultar a localização de uma sepultura ou jazigo para orientar familiares e visitantes de forma mais rápida e precisa.

* Como funcionário do cemitério, eu quero consultar a localização de uma sepultura a partir do nome do falecido para informar familiares e visitantes com mais rapidez e precisão.

* Como administrador do cemitério, eu quero gerar relatórios de falecidos cadastrados para acompanhar os registros existentes no sistema.

* Como administrador do cemitério, eu quero gerar relatórios de sepultamentos por período para acompanhar a movimentação do cemitério ao longo do tempo.

* Como administrador do cemitério, eu quero gerar relatórios de ocupação dos espaços para visualizar a quantidade de sepulturas e jazigos disponíveis, ocupados, reservados ou inativos.

---

### Fluxos principais

#### Fluxo de cadastro de usuário

1. O administrador acessa o sistema.
2. Seleciona a opção de gerenciamento de usuários.
3. Informa os dados do novo usuário.
4. Define o perfil de acesso do usuário.
5. Salva o cadastro.
6. O sistema registra o usuário e permite seu acesso conforme o perfil definido.

#### Fluxo de cadastro de falecido

1. O funcionário acessa o sistema.
2. Seleciona a opção de cadastrar falecido.
3. Preenche os dados obrigatórios do falecido.
4. Informa ou seleciona a sepultura ou jazigo relacionado.
5. Vincula um responsável, caso exista.
6. Salva o cadastro.
7. O sistema registra as informações e permite consulta posterior.

#### Fluxo de cadastro de sepultura ou jazigo

1. O funcionário acessa o módulo de sepulturas e jazigos.
2. Seleciona a opção de novo cadastro.
3. Informa os dados de identificação e localização do espaço.
4. Define o status inicial da sepultura ou jazigo.
5. Salva o cadastro.
6. O sistema registra o espaço e o torna disponível para consulta e vinculação.

#### Fluxo de cadastro de responsável

1. O funcionário acessa o módulo de responsáveis.
2. Seleciona a opção de novo cadastro.
3. Preenche os dados do responsável.
4. Vincula o responsável a um falecido, sepultura ou jazigo, quando necessário.
5. Salva o cadastro.
6. O sistema registra o responsável e permite sua consulta posterior.

#### Fluxo de consulta de localização

1. O funcionário, familiar ou visitante informa o nome do falecido.
2. O sistema busca registros compatíveis.
3. O usuário seleciona o registro correto.
4. O sistema exibe a localização da sepultura ou jazigo.
5. O usuário utiliza essa informação para encontrar ou orientar o acesso ao local dentro do cemitério.

#### Fluxo de controle de ocupação

1. O funcionário cadastra ou atualiza uma sepultura ou jazigo.
2. O sistema registra o status do espaço.
3. Quando um falecido é vinculado ao local, o status é atualizado para ocupado.
4. O administrador ou funcionário consulta a situação geral dos espaços.
5. O sistema permite identificar locais disponíveis, ocupados, reservados ou inativos.

#### Fluxo de geração de relatório

1. O administrador acessa a área de relatórios.
2. Seleciona o tipo de relatório desejado.
3. Informa filtros, como período, status ou tipo de registro.
4. O sistema gera o relatório com os dados correspondentes.
5. O administrador visualiza as informações geradas pelo sistema.

---

### Casos extremos e exceções

* Como funcionário do cemitério, eu quero ser alertado quando tentar cadastrar um falecido com dados muito semelhantes a outro já existente para evitar registros duplicados.

* Como funcionário do cemitério, eu quero ser impedido de vincular um falecido a uma sepultura ou jazigo já ocupado, quando essa ocupação não permitir novos vínculos, para evitar conflitos de registro.

* Como funcionário do cemitério, eu quero que o sistema indique campos obrigatórios não preenchidos para evitar cadastros incompletos.

* Como funcionário do cemitério, eu quero visualizar uma mensagem quando nenhuma busca retornar resultado para saber que o registro não foi encontrado.

* Como familiar ou visitante, eu quero receber uma mensagem clara quando houver mais de um falecido com o mesmo nome para que eu possa diferenciar os registros por data ou outras informações.

* Como funcionário do cemitério, eu quero manter registros antigos associados a uma sepultura ou jazigo para preservar o histórico de uso daquele espaço.

* Como administrador do cemitério, eu quero impedir que usuários sem permissão acessem áreas restritas para proteger informações administrativas do sistema.

* Como administrador do cemitério, eu quero que relatórios sem dados disponíveis exibam uma mensagem clara para entender que não há registros correspondentes aos filtros aplicados.



## Funcionalidades Principais


### 1. Gestão de Usuários e Controle de Acesso

**O que faz:**
Permite o cadastro, autenticação e gerenciamento dos usuários que terão acesso ao sistema, como administradores e funcionários.

**Por que é importante:**
O sistema lidará com informações administrativas e pessoais relacionadas a falecidos, responsáveis, sepulturas e jazigos. Por isso, é necessário controlar quem pode acessar, cadastrar, alterar ou visualizar determinadas informações.

**Como funciona em alto nível:**
O usuário acessa o sistema por meio de login. Dependendo do seu perfil, terá acesso a funcionalidades específicas. Administradores poderão gerenciar usuários e permissões, enquanto funcionários terão acesso às operações relacionadas à rotina administrativa do cemitério.

**Requisitos funcionais:**

* RF001 - O sistema deve permitir o login de usuários cadastrados.
* RF002 - O sistema deve permitir o cadastro de novos usuários por um administrador.
* RF003 - O sistema deve permitir a definição de perfis de acesso, como administrador e funcionário.
* RF004 - O sistema deve restringir funcionalidades de acordo com o perfil do usuário.
* RF005 - O sistema deve permitir que o administrador edite usuários cadastrados.
* RF006 - O sistema deve permitir que o administrador desative usuários cadastrados.

---

### 2. Cadastro e Gestão de Falecidos

**O que faz:**
Permite cadastrar, consultar, editar e organizar registros de pessoas falecidas sepultadas no cemitério.

**Por que é importante:**
O cadastro de falecidos é uma das informações centrais do sistema. Ele permite manter um histórico organizado dos sepultamentos e facilita consultas futuras por administradores, funcionários, familiares ou visitantes.

**Como funciona em alto nível:**
O funcionário cadastra os dados do falecido, como nome completo, data de nascimento, data de falecimento, data de sepultamento e observações. O registro pode ser vinculado a uma sepultura ou jazigo e a um responsável.

**Requisitos funcionais:**

* RF007 - O sistema deve permitir o cadastro de falecidos.
* RF008 - O sistema deve permitir informar dados básicos do falecido, como nome completo, CPF ou documento quando disponível, data de nascimento, data de falecimento e data de sepultamento.
* RF009 - O sistema deve permitir adicionar observações ao cadastro do falecido.
* RF010 - O sistema deve permitir vincular um falecido a uma sepultura ou jazigo.
* RF011 - O sistema deve permitir vincular um responsável ao cadastro do falecido.
* RF012 - O sistema deve permitir editar informações de falecidos cadastrados.
* RF013 - O sistema deve permitir consultar falecidos por nome, data de falecimento, data de sepultamento ou local de sepultamento.
* RF014 - O sistema deve alertar o usuário sobre possíveis registros duplicados de falecidos.

---

### 3. Gestão de Sepulturas e Jazigos

**O que faz:**
Permite cadastrar, organizar, consultar e atualizar os espaços físicos do cemitério, como sepulturas, jazigos, quadras, ruas, setores ou blocos.

**Por que é importante:**
O controle dos espaços é essencial para saber quais locais estão disponíveis, ocupados, reservados ou inativos. Essa funcionalidade evita conflitos de ocupação e melhora a organização física do cemitério.

**Como funciona em alto nível:**
O administrador ou funcionário cadastra os espaços cemiteriais com informações de identificação, localização e status. Cada sepultura ou jazigo pode ser vinculado a um ou mais registros, conforme as regras definidas para o sistema.

**Requisitos funcionais:**

* RF015 - O sistema deve permitir o cadastro de sepulturas e jazigos.
* RF016 - O sistema deve permitir informar dados de localização, como setor, quadra, rua, bloco, número ou descrição do local.
* RF017 - O sistema deve permitir definir o status do espaço como disponível, ocupado, reservado ou inativo.
* RF018 - O sistema deve permitir editar informações de sepulturas e jazigos cadastrados.
* RF019 - O sistema deve atualizar o status de uma sepultura ou jazigo quando houver vínculo com um falecido.
* RF020 - O sistema deve impedir que uma sepultura ou jazigo ocupado seja vinculado indevidamente a outro falecido, quando a regra de ocupação não permitir.
* RF021 - O sistema deve permitir consultar sepulturas e jazigos por localização, status ou identificação.
* RF022 - O sistema deve permitir visualizar os falecidos vinculados a uma sepultura ou jazigo, quando aplicável.

---

### 4. Cadastro e Gestão de Responsáveis

**O que faz:**
Permite cadastrar e gerenciar pessoas responsáveis por falecidos, sepulturas ou jazigos.

**Por que é importante:**
O cemitério precisa manter informações de contato dos responsáveis para tratar de questões administrativas, atualização de dados e comunicação relacionada aos registros cadastrados.

**Como funciona em alto nível:**
O funcionário cadastra o responsável com dados pessoais e de contato. Depois, esse responsável pode ser vinculado a um falecido, sepultura ou jazigo, permitindo que o cemitério saiba quem está associado a cada registro.

**Requisitos funcionais:**

* RF023 - O sistema deve permitir o cadastro de responsáveis.
* RF024 - O sistema deve permitir informar nome, telefone, e-mail, CPF ou outro documento e endereço do responsável, quando aplicável.
* RF025 - O sistema deve permitir vincular um responsável a um falecido, sepultura ou jazigo.
* RF026 - O sistema deve permitir editar dados de responsáveis cadastrados.
* RF027 - O sistema deve permitir pesquisar responsáveis por nome, documento ou telefone.
* RF028 - O sistema deve exibir quais falecidos, sepulturas ou jazigos estão vinculados a cada responsável.
* RF029 - O sistema deve impedir o vínculo de um responsável a registros inexistentes.

---

### 5. Busca e Localização de Sepulturas

**O que faz:**
Permite pesquisar falecidos e localizar a sepultura ou jazigo correspondente dentro do cemitério.

**Por que é importante:**
Essa funcionalidade melhora o atendimento a familiares e visitantes, reduzindo a dependência de livros físicos, planilhas ou conhecimento informal dos funcionários.

**Como funciona em alto nível:**
O usuário informa o nome do falecido ou outro dado de busca. O sistema retorna registros compatíveis e exibe a localização cadastrada da sepultura ou jazigo, como setor, quadra, rua, bloco, número ou descrição complementar.

**Requisitos funcionais:**

* RF030 - O sistema deve permitir buscar falecidos pelo nome completo ou parcial.
* RF031 - O sistema deve permitir filtrar resultados por data de falecimento, data de sepultamento, setor, localização, CPF/documento do falecido, nome do responsável ou CPF/documento do responsável.
* RF032 - O sistema deve exibir a localização da sepultura ou jazigo vinculado ao falecido.
* RF033 - O sistema deve permitir diferenciar registros de falecidos com nomes iguais ou semelhantes utilizando informações complementares, como datas, localização, CPF/documento do falecido e dados do responsável vinculado.
* RF034 - O sistema deve exibir mensagem quando nenhum resultado for encontrado.
* RF035 - O sistema deve apresentar informações de localização de forma clara e padronizada para facilitar o atendimento ao público.

---

### 6. Relatórios Administrativos

**O que faz:**
Permite gerar relatórios com dados relevantes para a gestão do cemitério, como falecidos cadastrados, sepultamentos por período e ocupação dos espaços.

**Por que é importante:**
Relatórios auxiliam a administração na consulta, acompanhamento e análise das informações cadastradas no sistema. Eles permitem visualizar dados importantes de forma organizada, apoiando a gestão do cemitério.

**Como funciona em alto nível:**
O administrador seleciona o tipo de relatório e aplica filtros, como período, status, setor ou tipo de registro. O sistema gera uma visualização com os dados correspondentes.

**Requisitos funcionais:**

* RF036 - O sistema deve permitir gerar relatório de falecidos cadastrados.
* RF037 - O sistema deve permitir gerar relatório de sepultamentos por período.
* RF038 - O sistema deve permitir gerar relatório de ocupação de sepulturas e jazigos.
* RF039 - O sistema deve permitir gerar relatório de espaços disponíveis, ocupados, reservados e inativos.
* RF040 - O sistema deve permitir aplicar filtros aos relatórios, como período, status, setor ou tipo de registro.
* RF041 - O sistema deve permitir visualizar os relatórios no sistema.
* RF042 - O sistema deve exibir mensagem clara quando não houver dados para os filtros selecionados.


## Experiência do Usuário

### Personas de Usuário e Necessidades

#### Administrador do Cemitério

O administrador do cemitério é o usuário responsável por controlar o acesso ao sistema, acompanhar os cadastros, consultar informações gerais, supervisionar a ocupação dos espaços cemiteriais e gerar relatórios administrativos.

**Necessidades principais:**

* Realizar login no sistema com segurança.
* Cadastrar, editar e desativar usuários.
* Definir perfis de acesso para administradores e funcionários.
* Consultar registros de falecidos, sepulturas, jazigos e responsáveis.
* Acompanhar a ocupação dos espaços cemiteriais.
* Gerar relatórios administrativos com filtros.
* Visualizar informações de forma organizada, clara e rápida.

#### Funcionário ou Atendente do Cemitério

O funcionário ou atendente é o usuário responsável pelas operações diárias do sistema, como cadastro de falecidos, cadastro de sepulturas e jazigos, registro de responsáveis, atualização de informações e atendimento a familiares ou visitantes.

**Necessidades principais:**

* Cadastrar falecidos de forma simples e rápida.
* Atualizar informações de falecidos, sepulturas, jazigos e responsáveis.
* Vincular falecidos a sepulturas ou jazigos.
* Vincular responsáveis a falecidos, sepulturas ou jazigos.
* Pesquisar falecidos e localizar sepulturas.
* Consultar espaços disponíveis, ocupados, reservados ou inativos.
* Informar familiares e visitantes sobre a localização de sepulturas ou jazigos.
* Receber mensagens claras em casos de erro, duplicidade ou campos obrigatórios não preenchidos.

#### Familiar ou Visitante

O familiar ou visitante é um beneficiário indireto do sistema. Ele não acessa diretamente a aplicação, mas solicita informações ao funcionário ou atendente do cemitério, que realiza a consulta no sistema.

**Necessidades principais:**

* Solicitar ao funcionário a localização da sepultura ou jazigo de uma pessoa falecida.
* Receber informações claras sobre o local de sepultamento.
* Conseguir diferenciar registros com nomes iguais ou semelhantes por meio das informações fornecidas pelo atendente.
* Ser atendido com mais rapidez e precisão.

#### Responsável pelo Falecido, Sepultura ou Jazigo

O responsável é uma pessoa vinculada administrativamente a um falecido, sepultura ou jazigo. Ele não acessa diretamente o sistema, mas seus dados são importantes para contato e organização administrativa do cemitério.

**Necessidades principais:**

* Ter seus dados registrados de forma organizada.
* Estar corretamente vinculado aos registros correspondentes.
* Permitir que o cemitério mantenha informações de contato atualizadas.
* Facilitar a comunicação administrativa quando necessário.

---

### Fluxos e Interações Principais do Usuário

#### Fluxo de Login

1. O usuário acessa a página inicial do sistema.
2. O sistema exibe o formulário de login.
3. O usuário informa e-mail e senha.
4. O sistema valida as credenciais.
5. Caso os dados estejam corretos, o usuário é direcionado para a área principal do sistema.
6. Caso os dados estejam incorretos, o sistema exibe uma mensagem de erro clara.

#### Fluxo de Gerenciamento de Usuários

1. O administrador acessa o módulo de usuários.
2. Seleciona a opção de cadastrar um novo usuário.
3. Informa os dados necessários, como nome, e-mail, senha inicial e perfil de acesso.
4. O sistema valida os campos obrigatórios.
5. O administrador salva o cadastro.
6. O sistema registra o usuário e libera o acesso conforme o perfil definido.
7. O administrador também pode editar ou desativar usuários já cadastrados.

#### Fluxo de Cadastro de Falecido

1. O funcionário acessa o módulo de falecidos.
2. Seleciona a opção de novo cadastro.
3. Preenche os dados do falecido, como nome completo, data de nascimento, data de falecimento e data de sepultamento.
4. Informa observações, caso existam.
5. Seleciona a sepultura ou jazigo correspondente.
6. Vincula um responsável, quando aplicável.
7. O sistema valida os campos obrigatórios.
8. O sistema verifica possíveis registros duplicados.
9. O funcionário salva o cadastro.
10. O sistema confirma o registro e permite consulta posterior.

#### Fluxo de Cadastro de Sepultura ou Jazigo

1. O funcionário acessa o módulo de sepulturas e jazigos.
2. Seleciona a opção de novo cadastro.
3. Informa os dados de identificação e localização, como setor, quadra, rua, bloco, número ou descrição complementar.
4. Define o status inicial do espaço, como disponível, ocupado, reservado ou inativo.
5. O sistema valida os dados informados.
6. O funcionário salva o cadastro.
7. O sistema registra o espaço e o disponibiliza para consulta e vinculação.

#### Fluxo de Cadastro de Responsável

1. O funcionário acessa o módulo de responsáveis.
2. Seleciona a opção de novo cadastro.
3. Informa os dados do responsável, como nome, telefone, e-mail, documento e endereço, quando aplicável.
4. Vincula o responsável a um falecido, sepultura ou jazigo.
5. O sistema valida os campos obrigatórios.
6. O funcionário salva o cadastro.
7. O sistema registra o responsável e permite consulta posterior.

#### Fluxo de Busca e Localização

1. O familiar ou visitante solicita ao funcionário a localização da sepultura ou jazigo de uma pessoa falecida.
2. O funcionário acessa a área de busca do sistema.
3. O funcionário informa o nome do falecido ou outro filtro disponível.
4. O sistema busca registros compatíveis.
5. O sistema exibe uma lista de resultados encontrados.
6. O funcionário seleciona o registro correto.
7. O sistema exibe os dados básicos do falecido e a localização da sepultura ou jazigo.
8. Caso existam registros com nomes iguais ou semelhantes, o sistema apresenta informações adicionais para diferenciação.
9. O funcionário repassa ao familiar ou visitante as informações de localização.
10. Caso nenhum registro seja encontrado, o funcionário informa que não há resultados correspondentes no sistema.

#### Fluxo de Controle de Ocupação

1. O funcionário cadastra ou atualiza uma sepultura ou jazigo.
2. O sistema registra o status do espaço.
3. Quando um falecido é vinculado ao local, o sistema atualiza o status conforme a regra definida.
4. O administrador ou funcionário pode consultar os espaços por status.
5. O sistema permite visualizar quais espaços estão disponíveis, ocupados, reservados ou inativos.

#### Fluxo de Geração de Relatórios

1. O administrador acessa a área de relatórios.
2. Seleciona o tipo de relatório desejado.
3. Aplica filtros, como período, status, setor ou tipo de registro.
4. O sistema gera uma visualização com os dados correspondentes.
5. O administrador analisa as informações apresentadas.
6. Caso não existam dados para os filtros selecionados, o sistema exibe uma mensagem clara informando a ausência de resultados.

---

### Considerações e Requisitos de UI/UX

* A interface deve ser simples, objetiva e voltada para uso administrativo.
* A navegação deve ser organizada por módulos principais: usuários, falecidos, sepulturas/jazigos, responsáveis, busca/localização e relatórios.
* O sistema deve apresentar menus claros, permitindo que o usuário encontre rapidamente a funcionalidade desejada.
* A tela inicial deve oferecer acesso rápido às principais áreas do sistema.
* Os formulários devem ser organizados em seções lógicas, evitando excesso de informações em uma única tela.
* Campos obrigatórios devem ser claramente identificados.
* O sistema deve exibir mensagens de erro objetivas, informando o problema e orientando a correção.
* O sistema deve exibir mensagens de sucesso após ações importantes, como cadastro, edição ou geração de relatório.
* O sistema deve solicitar confirmação antes de ações sensíveis, como desativar usuário, alterar status de sepultura ou remover vínculos.
* As listagens devem permitir busca, filtros e ordenação sempre que houver muitos registros.
* A busca por falecidos deve ser de fácil acesso para o funcionário, pois é uma das funcionalidades mais importantes para o atendimento ao público.
* As informações de localização devem ser apresentadas de forma clara e padronizada, incluindo setor, quadra, rua, bloco, número ou descrição complementar.
* Registros com nomes iguais ou semelhantes devem apresentar dados adicionais para facilitar a diferenciação.
* O sistema deve indicar estados vazios, como ausência de registros cadastrados, ausência de resultados de busca ou ausência de dados em relatórios.
* O layout deve ser responsivo, permitindo uso em computadores, notebooks, tablets e, quando possível, celulares.
* Os botões de ação principal devem ser destacados, como “Cadastrar”, “Salvar”, “Buscar”, “Editar”, “Gerar relatório” e “Confirmar”.
* O sistema deve evitar termos técnicos desnecessários, utilizando linguagem simples e compreensível.
* O sistema deve apresentar indicadores visuais de carregamento durante buscas, salvamentos e geração de relatórios.
* O usuário deve conseguir retornar facilmente para telas anteriores, listagens e páginas de detalhe.
* O sistema não deve possuir uma tela pública para familiares ou visitantes realizarem consultas diretamente; a busca e localização devem ser realizadas pelo funcionário ou atendente.

---

### Requisitos de Acessibilidade

* O sistema deve utilizar contraste adequado entre texto e fundo para facilitar a leitura.
* Os textos, botões e campos devem possuir tamanho suficiente para leitura confortável.
* Todos os campos de formulário devem possuir rótulos claros e descritivos.
* O sistema deve permitir navegação básica por teclado.
* Botões, links e campos interativos devem apresentar indicação visual de foco.
* Mensagens de erro não devem depender apenas de cor, devendo apresentar texto explicativo.
* Ícones devem ser acompanhados de texto ou descrição compreensível.
* A linguagem utilizada na interface deve ser simples, direta e objetiva.
* As páginas devem seguir uma hierarquia visual clara, com títulos, subtítulos e agrupamento lógico das informações.
* Tabelas devem possuir cabeçalhos claros para facilitar a compreensão dos dados.
* O sistema deve evitar excesso de informações em uma única tela, reduzindo a sobrecarga cognitiva.
* A interface deve ser compreensível para usuários com diferentes níveis de familiaridade com tecnologia.
* O sistema deve seguir boas práticas de acessibilidade web, permitindo futura adequação a padrões como WCAG.


## Restrições Técnicas de Alto Nível


### Integrações Externas

* Não há integrações externas obrigatórias previstas para o escopo atual do sistema.
* O sistema deve funcionar de forma independente, sem depender de integração com sistemas municipais, cartórios, órgãos públicos, sistemas financeiros ou plataformas externas.
* Caso integrações externas sejam necessárias futuramente, elas deverão ser tratadas em uma nova etapa de especificação, fora do escopo inicial deste PRD.
* A geração de relatórios deve ocorrer a partir dos dados internos cadastrados no próprio sistema.

---

### Segurança, Conformidade e Privacidade

* O sistema deve exigir autenticação para acesso às funcionalidades administrativas.
* Apenas usuários autorizados devem conseguir acessar, cadastrar, editar ou consultar informações internas do sistema.
* O sistema deve possuir controle de acesso por perfil, diferenciando permissões de administrador e funcionário.
* O administrador deve ter acesso ao gerenciamento de usuários e relatórios administrativos.
* O funcionário deve ter acesso às funcionalidades operacionais necessárias para cadastro, consulta, atualização e localização de registros.
* Familiares e visitantes não devem acessar diretamente o sistema; as consultas de localização devem ser realizadas pelo funcionário ou atendente.
* O sistema deve considerar boas práticas relacionadas à Lei Geral de Proteção de Dados Pessoais, especialmente no tratamento de informações de responsáveis, contatos, documentos e demais dados pessoais cadastrados.
* O sistema deve evitar a exposição desnecessária de dados pessoais, exibindo apenas as informações necessárias para cada tipo de operação.
* O sistema deve impedir acesso não autorizado a informações administrativas e pessoais cadastradas.

---

### Sensibilidade de Dados e Privacidade

* Os dados de responsáveis, como telefone, e-mail, documento e endereço, devem ser tratados como informações sensíveis do ponto de vista administrativo e de privacidade.
* Os dados de falecidos, sepulturas, jazigos e responsáveis devem ser armazenados de forma organizada e protegida contra acessos indevidos.
* As informações exibidas nas buscas devem ser suficientes para identificar corretamente o registro, mas sem expor dados desnecessários.
* Registros com nomes iguais ou semelhantes devem apresentar informações complementares, como datas ou localização, para evitar confusão na identificação.
* O sistema deve priorizar a consistência dos dados cadastrados, evitando registros incompletos, duplicados ou vínculos inválidos.
* O sistema deve manter os dados organizados de forma que consultas, relatórios e vínculos entre entidades sejam confiáveis.

---

### Performance e Escalabilidade

* O sistema deve responder de forma adequada às operações principais, como login, cadastro, edição, busca e consulta de registros.
* As buscas por falecidos, sepulturas, jazigos e responsáveis devem retornar resultados em tempo aceitável para uso administrativo.
* A funcionalidade de busca e localização deve ser priorizada em termos de agilidade, pois impacta diretamente o atendimento a familiares e visitantes.
* Os relatórios administrativos devem ser gerados em tempo aceitável, considerando filtros como período, status, setor ou tipo de registro.
* O sistema deve ser capaz de lidar com crescimento gradual da base de dados, incluindo aumento no número de falecidos, sepulturas, jazigos, responsáveis e usuários.
* O sistema deve manter desempenho adequado mesmo com um volume crescente de registros históricos.

---

### Requisitos Não Negociáveis de Tecnologia ou Protocolo

* O sistema deve ser desenvolvido como uma aplicação web.
* O sistema deve possuir autenticação de usuários.
* O sistema deve possuir controle de acesso por perfil.
* O sistema deve permitir acesso por navegadores modernos.
* O sistema deve utilizar comunicação segura quando estiver em ambiente de produção.
* O sistema deve preservar a integridade dos vínculos entre falecidos, sepulturas, jazigos e responsáveis.
* O sistema não deve disponibilizar consulta pública direta para familiares ou visitantes.
* O sistema deve permitir que os relatórios sejam visualizados diretamente na aplicação.
* Detalhes sobre arquitetura, banco de dados, frameworks, APIs, estrutura de pastas, componentes e decisões de implementação devem ser definidos na Especificação Técnica.

## Fora de Escopo


Esta seção define funcionalidades, integrações e comportamentos que não fazem parte do escopo atual do sistema de gerenciamento de cemitérios. Esses itens poderão ser considerados em versões futuras, mas não devem ser implementados nesta etapa.

### Funcionalidades explicitamente excluídas

* O sistema não incluirá controle financeiro, como registro de pagamentos, inadimplências, taxas, cobranças, boletos, recibos ou controle de valores relacionados a sepulturas, jazigos ou serviços cemiteriais.

* O sistema não incluirá relatórios financeiros, como relatórios de pagamentos, receitas, débitos, inadimplência ou situação financeira de responsáveis.

* O sistema não disponibilizará uma tela pública para familiares ou visitantes realizarem consultas diretamente. A busca e localização de sepulturas será realizada exclusivamente por administradores, funcionários ou atendentes do cemitério.

* O sistema não incluirá mapa interativo, geolocalização por GPS, navegação interna em tempo real ou visualização gráfica avançada da planta do cemitério.

* O sistema não incluirá aplicativo mobile nativo para Android ou iOS.

* O sistema não incluirá integração com cartórios, prefeituras, sistemas municipais, sistemas funerários, órgãos públicos ou bases de dados externas.

* O sistema não incluirá envio automático de notificações por e-mail, SMS, WhatsApp ou outros canais externos.

* O sistema não incluirá assinatura digital, anexação de documentos oficiais, digitalização de certidões ou gestão documental avançada.

* O sistema não incluirá módulo específico para contratos, concessões, renovações, permissões de uso ou documentação jurídica de jazigos.

* O sistema não incluirá módulo de manutenção, obras, limpeza, exumação ou transferência de restos mortais.

* O sistema não incluirá auditoria detalhada de alterações, trilha completa de logs ou histórico avançado de ações realizadas pelos usuários.

* O sistema não incluirá painel gerencial avançado com gráficos, indicadores dinâmicos ou dashboards analíticos complexos.

---

### Considerações futuras fora do escopo atual

As seguintes funcionalidades podem ser consideradas em versões futuras, mas não fazem parte da implementação atual:

* Exportação de relatórios em formatos como PDF, Excel ou CSV.
* Mapa visual do cemitério com representação gráfica de setores, quadras, ruas e jazigos.
* Consulta pública controlada para familiares e visitantes.
* Integração com sistemas externos de órgãos públicos ou administrativos.
* Módulo financeiro para acompanhamento de pagamentos e pendências.
* Dashboard administrativo com indicadores visuais e gráficos.
* Histórico detalhado de alterações realizadas no sistema.
* Gestão de documentos anexados aos registros.
* Notificações automáticas para responsáveis cadastrados.
* Aplicativo mobile para uso em campo.

---

### Limites e limitações do sistema

* O sistema será voltado para uso administrativo interno do cemitério.

* O acesso ao sistema será restrito a usuários cadastrados e autorizados.

* Familiares e visitantes serão beneficiários indiretos do sistema, mas não usuários diretos da aplicação.

* A localização de sepulturas será apresentada com base nas informações cadastradas no sistema, como setor, quadra, rua, bloco, número ou descrição complementar.

* A precisão da localização dependerá da qualidade e atualização dos dados inseridos pelos administradores e funcionários.

* Os relatórios administrativos serão baseados somente nos dados internos cadastrados no sistema.

* O sistema não validará automaticamente informações com bases externas, documentos oficiais ou registros públicos.

* O sistema não substituirá procedimentos legais, administrativos ou documentais obrigatórios do cemitério.

* O sistema não será responsável por definir regras legais de sepultamento, concessão, exumação ou uso dos espaços cemiteriais.

* Detalhes técnicos de arquitetura, tecnologias, banco de dados, deploy, autenticação e decisões de implementação serão definidos na Especificação Técnica.

## Questões em Aberto

Esta seção lista pontos que ainda podem precisar de esclarecimento ou decisão antes da implementação do sistema. As questões abaixo não impedem a definição inicial do PRD, mas devem ser avaliadas para evitar ambiguidades durante o desenvolvimento.

### Requisitos não claros ou casos extremos

* Deve ser definido se uma mesma sepultura ou jazigo poderá possuir mais de um falecido vinculado, considerando situações como jazigos familiares ou múltiplos sepultamentos no mesmo espaço.

* Deve ser definido quais status serão utilizados para sepulturas e jazigos, como disponível, ocupado, reservado e inativo, e em quais situações cada status poderá ser alterado.

* Deve ser definido se o sistema permitirá a exclusão definitiva de registros ou se registros como falecidos, sepulturas, jazigos, responsáveis e usuários poderão apenas ser editados, desativados ou mantidos como histórico.

* Deve ser definido quais campos serão obrigatórios no cadastro de falecidos, sepulturas, jazigos e responsáveis.

* Deve ser definido se o CPF ou documento do falecido será obrigatório apenas quando disponível, considerando a existência de registros antigos ou incompletos.

* Deve ser definido se o CPF ou documento do responsável será obrigatório no cadastro, já que essa informação pode auxiliar na diferenciação de responsáveis com nomes iguais ou semelhantes.

* Deve ser definido como o sistema deve tratar registros antigos de falecidos que não possuam CPF, documento, data completa ou outras informações cadastrais.

* Deve ser definido como o sistema deve tratar tentativas de cadastro duplicado de falecidos, responsáveis ou espaços cemiteriais.

* Deve ser definido quais informações complementares serão exibidas para diferenciar falecidos com nomes iguais ou semelhantes, como data de falecimento, data de sepultamento, CPF/documento quando disponível, nome do responsável e localização do jazigo ou sepultura.

* Deve ser definido quais informações complementares serão exibidas para diferenciar responsáveis com nomes iguais ou semelhantes, como CPF/documento, telefone ou vínculo com falecido, sepultura ou jazigo.

* Deve ser definido se o vínculo entre responsável e registro será feito diretamente com o falecido, com a sepultura/jazigo ou com ambos.

* Deve ser definido se um responsável poderá estar vinculado a mais de um falecido, sepultura ou jazigo.

---

### Perguntas sobre necessidades do usuário ou objetivos de negócio

* Quais são as informações mais importantes para o funcionário durante o atendimento a familiares e visitantes?

* Qual deve ser o caminho mais rápido dentro do sistema para localizar uma sepultura ou jazigo durante um atendimento?

* Quais critérios de busca devem ser priorizados na localização de falecidos, como nome do falecido, CPF/documento do falecido, nome do responsável, CPF/documento do responsável, data de falecimento, data de sepultamento ou localização?

* Quais relatórios administrativos são realmente necessários para a gestão inicial do cemitério?

* Os relatórios deverão ser apenas visualizados no sistema ou haverá necessidade futura de exportação?

* O administrador e o funcionário terão permissões muito diferentes ou a diferença será limitada ao gerenciamento de usuários e relatórios?

* O sistema será utilizado por um único cemitério ou deverá considerar a possibilidade de múltiplos cemitérios no futuro?

* A nomenclatura usada no sistema deve priorizar “sepultura”, “jazigo”, “túmulo” ou permitir diferenciação entre esses tipos de espaço?

---

### Dependências de fatores externos

* A qualidade das buscas e relatórios dependerá da qualidade dos dados cadastrados pelos administradores e funcionários.

* A precisão da localização dependerá da padronização das informações físicas do cemitério, como setor, quadra, rua, bloco, número ou descrição complementar.

* Caso o cemitério possua registros antigos em livros físicos ou planilhas, será necessário definir como esses dados serão organizados antes de serem cadastrados no sistema.

* Caso existam registros antigos sem CPF, documento, datas completas ou localização padronizada, será necessário permitir o cadastro mesmo com informações parciais.

* Caso existam regras administrativas específicas do cemitério sobre ocupação de jazigos, reutilização de espaços ou vínculos familiares, essas regras precisarão ser esclarecidas antes da implementação.

* Caso o sistema seja utilizado em mais de um cemitério futuramente, poderá ser necessário revisar regras de cadastro, localização e relatórios.

---

### Áreas que podem requerer design ou pesquisa de usuário

* Definir a melhor organização visual das telas principais, especialmente os módulos de falecidos, sepulturas/jazigos, responsáveis, busca/localização e relatórios.

* Definir a melhor forma de apresentar a localização de uma sepultura ou jazigo sem utilizar mapa interativo.

* Definir quais filtros devem estar disponíveis nas listagens e na busca de falecidos.

* Definir como diferenciar visualmente registros com nomes iguais ou semelhantes, evitando que o funcionário selecione o cadastro errado durante o atendimento.

* Definir como exibir CPF ou documento na interface de forma útil para diferenciação, mas sem exposição desnecessária de dados pessoais.

* Definir o formato mais simples e compreensível para os relatórios administrativos.

* Avaliar quais termos são mais familiares para os funcionários do cemitério, evitando nomenclaturas confusas ou excessivamente técnicas.

* Avaliar quais informações devem aparecer primeiro nas telas de consulta, priorizando a rapidez no atendimento.