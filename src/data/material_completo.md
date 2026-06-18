# Wireless Lab Drive — Pack de Conteúdo Seguro

Este pacote foi criado para preencher lacunas do site com conteúdo educativo de pentest autorizado, sem comandos de ataque, payloads ou automações ofensivas.

## Fontes pesquisadas
- **OWASP Web Security Testing Guide** — https://owasp.org/www-project-web-security-testing-guide/
  Uso no conteúdo: Base para estruturar testes web autorizados, fases de teste, relatório e metodologia.
- **OWASP WSTG v4.2** — https://owasp.org/www-project-web-security-testing-guide/v42/
  Uso no conteúdo: Referência de categorias e organização de testes web em conteúdo educativo.
- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  Uso no conteúdo: Base para requisitos de verificação de segurança de aplicações.
- **OWASP MASVS / Mobile Application Security** — https://mas.owasp.org/MASVS/
  Uso no conteúdo: Base para conteúdo seguro sobre avaliação mobile sem instruções ofensivas.
- **NIST SP 800-115** — https://csrc.nist.gov/pubs/sp/800/115/final
  Uso no conteúdo: Base para escopo, planejamento, execução autorizada, análise e mitigação.
- **NIST SP 800-153** — https://csrc.nist.gov/pubs/sp/800/153/final
  Uso no conteúdo: Base para segurança WLAN, configuração, ciclo de vida e monitoramento.
- **PortSwigger Web Security Academy** — https://portswigger.net/web-security/getting-started/index.html
  Uso no conteúdo: Referência de formato de aprendizado: teoria, prática controlada e progresso.

## Módulos

### 01. Escopo, Ética e Laboratório Autorizado
Antes de qualquer teste, o profissional define permissão, objetivo, limites e evidências.

#### O que é pentest autorizado
Pentest autorizado é uma avaliação técnica feita com permissão explícita, escopo definido, janela de teste e objetivo documentado. O foco não é invadir por curiosidade; é encontrar riscos, provar impacto de forma controlada e orientar correções.

#### Contrato mental do laboratório
Todo exercício do site deve assumir ambiente controlado: máquinas próprias, labs legais, CTFs, sistemas de treinamento ou autorização formal. Sem escopo, não existe teste profissional.

#### Entregáveis de um teste
- Objetivo do teste
- Ativos permitidos
- O que está fora do escopo
- Janela de execução
- Riscos aceitos
- Evidências coletadas
- Recomendações de correção

#### Como pensar como consultor
O melhor relatório não é uma coleção de falhas. É uma tradução de risco técnico para decisão prática: o que aconteceu, por que importa, como corrigir e como validar a correção.

### 02. Linux e Terminal para Laboratório
Base operacional para navegar, organizar evidências e entender ambientes técnicos.

#### Terminal como painel de controle
O terminal é uma interface de precisão. No estudo defensivo, ele serve para navegar por arquivos, ler logs, organizar evidências, executar ferramentas autorizadas e entender como sistemas respondem.

#### Estrutura de arquivos e evidências
- Criar pasta por projeto/laboratório
- Separar anotações, capturas e resultados
- Registrar data e contexto
- Evitar misturar evidências de ambientes diferentes
- Manter histórico de decisões

#### Permissões sem bagunça
Entender permissões ajuda a interpretar riscos sem sair alterando o ambiente. O foco do estudo é reconhecer impacto, não quebrar a máquina.

#### Rotina de estudo
Leia um conceito, pratique em laboratório permitido, registre evidências e escreva a conclusão em linguagem simples.

### 03. Redes TCP/IP
Fundamento para entender comunicação, roteamento, portas, serviços e segmentação.

#### IP, máscara e gateway
IP identifica o host, máscara define o alcance da rede e gateway conecta a rede local a outros destinos. Esse trio explica boa parte dos problemas e riscos de comunicação.

#### Portas e serviços
Portas expõem serviços. Em uma avaliação segura, o objetivo é inventariar o que deveria estar disponível, o que apareceu sem necessidade e o que precisa de restrição ou autenticação.

#### DNS, DHCP e identidade de rede
DNS resolve nomes, DHCP entrega configuração e registros ajudam a entender quem está na rede. Em defesa, esses dados ajudam a identificar inconsistências e ativos esquecidos.

#### Segmentação
Uma rede bem segmentada limita impacto. Visitantes, servidores, estações, IoT e administração não devem viver no mesmo espaço sem controle.

### 04. Wi‑Fi 802.11 e Segurança WLAN
Como redes sem fio funcionam e como defender configuração, acesso e monitoramento.

#### Arquitetura WLAN
Uma WLAN combina clientes, pontos de acesso, controladoras e políticas. Segurança depende de configuração, autenticação, atualização, segmentação e monitoramento contínuo.

#### Autenticação e criptografia
O estudo deve comparar modelos de autenticação, força de senhas, uso de WPA2/WPA3, isolamento de clientes e separação de redes convidadas.

#### Checklist de defesa Wi‑Fi
- Usar criptografia moderna
- Separar rede corporativa e convidados
- Remover credenciais padrão
- Atualizar firmware
- Reduzir exposição desnecessária
- Monitorar APs desconhecidos
- Documentar SSIDs e responsáveis

#### Relatório WLAN
Um bom relatório WLAN explica configuração atual, risco percebido, impacto no negócio, recomendações e forma de validar a correção sem expor detalhes sensíveis.

### 05. Metodologia de Teste Autorizado
Planejamento, execução controlada, evidência, análise e mitigação.

#### Fases seguras
Um teste profissional passa por preparação, entendimento do alvo permitido, verificação controlada, análise, priorização, relatório e reteste. A qualidade está na organização.

#### Evidência boa
- Captura clara
- Data e hora
- Ativo relacionado
- Impacto explicado
- Risco sem exagero
- Correção recomendada
- Validação sugerida

#### Severidade sem teatro
Severidade deve considerar probabilidade, impacto, exposição, facilidade de correção e contexto do ambiente. Nem tudo que parece técnico é crítico.

### 06. Segurança Web com OWASP
Raciocínio de testes web, requisitos de segurança e categorias de risco.

#### WSTG como mapa de estudo
O OWASP WSTG organiza testes web em categorias. Para estudo, ele funciona como mapa: entender objetivo, observar evidências, registrar impacto e propor correção.

#### ASVS como régua de qualidade
O ASVS ajuda a transformar segurança em requisito verificável. Em vez de dizer 'está seguro', o relatório aponta quais controles foram avaliados e qual nível de confiança existe.

#### Checklist web seguro
- Autenticação clara
- Controle de acesso por função
- Validação de entrada
- Sessões protegidas
- Logs úteis
- Erros sem vazamento de informação
- Configuração segura

#### Prática controlada
Use ambientes de treinamento legalizados. O objetivo é consolidar raciocínio, não testar sistemas aleatórios.

### 07. Segurança Mobile Android
Avaliação defensiva de apps mobile usando critérios de armazenamento, rede, autenticação e privacidade.

#### Mobile é avaliação autorizada
Substitua nomenclaturas antigas por 'Segurança Mobile Android'. O foco da página deve ser avaliação autorizada, proteção de dados e verificação de controles.

#### MASVS como base
O OWASP MASVS organiza controles para apps mobile, incluindo armazenamento seguro, comunicação, autenticação, criptografia, privacidade e resiliência.

#### O que observar em apps
- Dados sensíveis armazenados
- Comunicação protegida
- Autenticação e sessão
- Permissões solicitadas
- Logs em produção
- Configuração de build
- Privacidade e consentimento

#### Resultado esperado
A entrega mobile deve explicar risco, evidência e recomendação, sem expor segredos do app ou instruções reutilizáveis fora do laboratório autorizado.

### 08. Ferramentas, Evidências e Organização
Como usar ferramentas de forma responsável e transformar saída técnica em entendimento.

#### Ferramenta não substitui raciocínio
Ferramentas ajudam a coletar sinais, mas o valor está em interpretar resultado, confirmar contexto e explicar o risco de forma compreensível.

#### Registro de evidências
- Salvar origem do dado
- Anotar hipótese
- Anotar resultado
- Separar falso positivo
- Escrever impacto
- Criar recomendação

#### Boas práticas
Use ferramentas apenas em ambiente autorizado. Evite executar qualquer teste fora do escopo e registre decisões técnicas durante o processo.

### 09. Defesa, Hardening e Monitoramento
Corrigir, reduzir exposição e acompanhar o ambiente depois do teste.

#### Hardening
Hardening é reduzir superfície de ataque: remover o que não precisa, configurar com segurança, atualizar componentes e limitar acessos.

#### Monitoramento
Sem monitoramento, falhas voltam despercebidas. Logs, alertas, inventário e revisão periódica ajudam a manter o ambiente sob controle.

#### Checklist pós-correção
- Correção aplicada
- Configuração revisada
- Reteste realizado
- Evidência atualizada
- Responsável definido
- Prazo registrado

### 10. Relatório Profissional
Transformar estudo técnico em entrega clara, útil e confiável.

#### Estrutura recomendada
- Resumo executivo
- Escopo
- Metodologia
- Achados
- Evidências
- Risco
- Recomendações
- Plano de correção
- Reteste

#### Linguagem
Relatório bom é direto: explica o problema, por que importa, onde foi visto e como corrigir. Evite drama técnico e evite esconder incertezas.

#### Portfólio de estudo
Em labs legais, transforme cada módulo em um mini relatório. Isso cria portfólio e melhora sua leitura profissional.
