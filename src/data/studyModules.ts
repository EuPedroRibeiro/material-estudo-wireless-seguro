export type StudyBlockType =
  | 'conceito'
  | 'nota-de-campo'
  | 'checklist'
  | 'comparacao'
  | 'metodologia'
  | 'relatorio'
  | 'revisao'
  | 'meta-diaria'
  | 'fonte'
  | 'alerta'
  | 'resumo';

export type StudyBlock = {
  id: string;
  title: string;
  type: StudyBlockType;
  content?: string;
  items?: string[];
};

export type StudyModule = {
  id: string;
  order: number;
  title: string;
  summary: string;
  objective: string;
  sources: string[];
  goals: string[];
  blocks: StudyBlock[];
};

export type StudyContent = {
  packName: string;
  language: 'pt-BR';
  version: string;
  safetyScope: string;
  paletteRule: string;
  sourceNotes: Array<{
    name: string;
    url: string;
    use: string;
  }>;
  modules: StudyModule[];
};

export const studyContent: StudyContent = {
  packName: 'Wireless Lab Drive - Conteudo Seguro de Pentest',
  language: 'pt-BR',
  version: '1.1.0',
  safetyScope:
    'Conteudo educativo para laboratorio autorizado. Nao contem comandos de ataque, payloads ou automacoes ofensivas.',
  paletteRule: 'Interface deve usar preto, branco, cinza e vermelho sutil.',
  sourceNotes: [
    {
      name: 'OWASP Web Security Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      use: 'Base conceitual para estruturar testes web autorizados, fases de verificacao e relatorio.',
    },
    {
      name: 'OWASP ASVS',
      url: 'https://owasp.org/www-project-application-security-verification-standard/',
      use: 'Base conceitual para requisitos verificaveis de seguranca de aplicacoes.',
    },
    {
      name: 'OWASP MASVS / MASTG',
      url: 'https://mas.owasp.org/',
      use: 'Base conceitual para avaliacao mobile autorizada, privacidade e protecao de dados.',
    },
    {
      name: 'NIST SP 800-115',
      url: 'https://csrc.nist.gov/pubs/sp/800/115/final',
      use: 'Base conceitual para planejamento, escopo, execucao autorizada, analise e mitigacao.',
    },
    {
      name: 'NIST SP 800-153',
      url: 'https://csrc.nist.gov/pubs/sp/800/153/final',
      use: 'Base conceitual para seguranca WLAN, configuracao, ciclo de vida e monitoramento.',
    },
    {
      name: 'PortSwigger Web Security Academy',
      url: 'https://portswigger.net/web-security',
      use: 'Referencia de organizacao didatica: teoria, pratica controlada e progresso.',
    },
    {
      name: 'CVSS v3.1 / NVD Metrics',
      url: 'https://www.first.org/cvss/v3.1/specification-document',
      use: 'Base conceitual para severidade, priorizacao e comunicacao de risco.',
    },
  ],
  modules: [
    {
      id: 'fundamentos-seguranca-ofensiva',
      order: 1,
      title: 'Fundamentos de Segurança Ofensiva',
      summary: 'Base etica, metodologica e profissional para testes autorizados.',
      objective:
        'Entender que um teste profissional comeca antes de qualquer ferramenta: permissao, escopo, regras, evidencia e entrega.',
      sources: ['PTES', 'NIST SP 800-115', 'OWASP WSTG'],
      goals: [
        'Explicar diferencas entre black box, gray box e white box.',
        'Descrever pre-engajamento, reconhecimento, analise, relatorio e reteste.',
        'Identificar limites de atuacao e regras de engajamento.',
      ],
      blocks: [
        {
          id: 'fundamentos-o-que-e-pentest',
          title: 'O que é pentest autorizado',
          type: 'conceito',
          content:
            'Pentest autorizado e uma avaliacao tecnica com permissao explicita, escopo definido e objetivo documentado. A finalidade e encontrar riscos, provar impacto de forma controlada e orientar correcoes.',
        },
        {
          id: 'fundamentos-modelos-de-caixa',
          title: 'Black box, gray box e white box',
          type: 'comparacao',
          content:
            'Black box parte de pouco conhecimento, gray box combina informacao parcial e white box usa acesso ampliado a arquitetura, contas ou codigo. A escolha muda o nivel de evidencia, nao muda a necessidade de autorizacao.',
        },
        {
          id: 'fundamentos-ciclo-de-vida',
          title: 'Ciclo de vida do teste',
          type: 'metodologia',
          items: [
            'Pre-engajamento e escopo.',
            'Reconhecimento permitido.',
            'Analise controlada.',
            'Consolidacao de evidencia.',
            'Relatorio tecnico e executivo.',
            'Reteste e validacao de correcao.',
          ],
        },
        {
          id: 'fundamentos-regras-engajamento',
          title: 'Regras de engajamento',
          type: 'checklist',
          items: [
            'Ativos permitidos.',
            'Janela de teste.',
            'Limites tecnicos.',
            'Contatos de emergencia.',
            'Riscos aceitos.',
            'Formato de evidencia.',
            'Criterios de encerramento.',
          ],
        },
        {
          id: 'fundamentos-nota-profissional',
          title: 'Fundamento antes da execução',
          type: 'nota-de-campo',
          content:
            'O melhor profissional nao comeca por ferramenta. Ele entende objetivo, impacto, responsabilidade e como transformar achados em decisao pratica.',
        },
      ],
    },
    {
      id: 'linux-testes-seguranca',
      order: 2,
      title: 'Linux para Testes de Segurança',
      summary: 'Base operacional para navegar, organizar evidencias e entender ambientes tecnicos.',
      objective:
        'Dar autonomia para o aluno se movimentar em sistemas Linux, organizar estudos e manter rotina de laboratorio educacional.',
      sources: ['NIST SP 800-115', 'HTB Academy', 'TCM Security PNPT Methodology'],
      goals: [
        'Navegar por diretorios e organizar evidencias.',
        'Entender permissoes, usuarios, grupos e logs.',
        'Usar terminal como ferramenta de produtividade e documentacao.',
      ],
      blocks: [
        {
          id: 'linux-terminal',
          title: 'Terminal como painel de controle',
          type: 'conceito',
          content:
            'O terminal e uma interface de precisao. Em estudo autorizado, ele ajuda a navegar por arquivos, ler logs, registrar evidencias e entender respostas do sistema.',
        },
        {
          id: 'linux-evidencias',
          title: 'Estrutura de arquivos e evidências',
          type: 'checklist',
          items: [
            'Criar pasta por laboratorio.',
            'Separar anotacoes, capturas e resultados.',
            'Registrar data, contexto e objetivo.',
            'Evitar misturar evidencias de ambientes diferentes.',
            'Manter historico de decisoes.',
          ],
        },
        {
          id: 'linux-permissoes',
          title: 'Permissões sem bagunça',
          type: 'conceito',
          content:
            'Permissoes ajudam a entender risco operacional. A leitura correta evita mudancas desnecessarias e melhora a analise de impacto.',
        },
        {
          id: 'linux-pipes-redirecionamento',
          title: 'Pipes, redirecionamentos e produtividade',
          type: 'resumo',
          content:
            'Pipes e redirecionamentos conectam pequenas operacoes. No laboratorio, eles servem para filtrar saidas, guardar notas e construir rotina sem perder rastreabilidade.',
        },
        {
          id: 'linux-meta',
          title: 'Rotina de laboratório',
          type: 'meta-diaria',
          content:
            'Leia um conceito, pratique em ambiente permitido, registre evidencia e escreva a conclusao em linguagem simples.',
        },
      ],
    },
    {
      id: 'redes-tcp-ip-analise',
      order: 3,
      title: 'Redes TCP/IP para Análise',
      summary: 'Fundamento para entender comunicacao, roteamento, portas, servicos e segmentacao.',
      objective:
        'Fazer o aluno interpretar sinais basicos de conectividade, exposicao e estrutura de rede sem transformar diagnostico em exploracao.',
      sources: ['NIST SP 800-115', 'NIST SP 800-153'],
      goals: [
        'Explicar IP, MAC, DNS, DHCP, ARP e gateway.',
        'Interpretar portas e servicos expostos.',
        'Relacionar OSI, sub-redes, NAT e roteamento basico.',
      ],
      blocks: [
        {
          id: 'redes-identidade',
          title: 'IP, MAC, gateway e máscara',
          type: 'conceito',
          content:
            'IP identifica o host, MAC identifica a interface, mascara define alcance da rede e gateway conecta destinos fora do segmento local.',
        },
        {
          id: 'redes-servicos',
          title: 'Portas e serviços',
          type: 'conceito',
          content:
            'Portas indicam servicos disponiveis. Em avaliacao segura, o objetivo e inventariar o que deveria estar exposto, o que apareceu sem necessidade e o que precisa de restricao.',
        },
        {
          id: 'redes-diagnostico',
          title: 'Diagnóstico de conectividade',
          type: 'checklist',
          items: [
            'Confirmar endereco local.',
            'Entender rota e gateway.',
            'Validar resolucao de nomes.',
            'Observar latencia e perda.',
            'Registrar evidencias sem alterar o ambiente.',
          ],
        },
        {
          id: 'redes-osi',
          title: 'Modelo OSI na prática',
          type: 'comparacao',
          content:
            'Camadas ajudam a diagnosticar: fisica e enlace explicam sinal e MAC, rede explica IP e rotas, transporte explica portas, aplicacao explica servicos e mensagens.',
        },
        {
          id: 'redes-segmentacao',
          title: 'Segmentação',
          type: 'nota-de-campo',
          content:
            'Uma rede bem segmentada limita impacto. Visitantes, servidores, estacoes, IoT e administracao nao devem viver no mesmo espaco sem controle.',
        },
      ],
    },
    {
      id: 'wifi-80211-seguranca-wireless',
      order: 4,
      title: 'Wi-Fi 802.11 e Segurança Wireless',
      summary: 'Como redes sem fio funcionam e como defender configuracao, acesso e monitoramento.',
      objective:
        'Explicar funcionamento wireless, riscos comuns e boas praticas WLAN em linguagem profissional e autorizada.',
      sources: ['NIST SP 800-153', 'OWASP WSTG'],
      goals: [
        'Entender frequencias, canais, potencia de sinal e interferencia.',
        'Comparar WEP, WPA, WPA2, WPA3, WPS e WPA Enterprise.',
        'Descrever segmentacao, redes convidadas e monitoramento.',
      ],
      blocks: [
        {
          id: 'wifi-arquitetura',
          title: 'Arquitetura WLAN',
          type: 'conceito',
          content:
            'Uma WLAN combina clientes, pontos de acesso, controladoras, SSIDs e politicas. Seguranca depende de configuracao, autenticacao, atualizacao, segmentacao e monitoramento continuo.',
        },
        {
          id: 'wifi-radio',
          title: 'Rádio, canais e dBm',
          type: 'conceito',
          content:
            'Frequencia, canal e potencia de sinal influenciam alcance, estabilidade e interferencia. dBm ajuda a separar problema fisico de problema de configuracao.',
        },
        {
          id: 'wifi-seguranca',
          title: 'Autenticação e criptografia',
          type: 'comparacao',
          content:
            'O estudo compara modelos de autenticacao, forca de senhas, WPA2/WPA3, isolamento de clientes e separacao de redes convidadas.',
        },
        {
          id: 'wifi-checklist-defesa',
          title: 'Checklist de defesa Wi-Fi',
          type: 'checklist',
          items: [
            'Usar criptografia moderna.',
            'Separar rede corporativa e convidados.',
            'Remover credenciais padrao.',
            'Atualizar firmware.',
            'Reduzir exposicao desnecessaria.',
            'Monitorar pontos de acesso desconhecidos.',
            'Documentar SSIDs e responsaveis.',
          ],
        },
        {
          id: 'wifi-relatorio',
          title: 'Relatório WLAN',
          type: 'relatorio',
          content:
            'Um bom relatorio WLAN explica configuracao atual, risco percebido, impacto no negocio, recomendacoes e forma de validar a correcao sem expor detalhes sensiveis.',
        },
      ],
    },
    {
      id: 'ferramentas-analise-wireless',
      order: 5,
      title: 'Ferramentas de Análise Wireless',
      summary: 'Papel das ferramentas no estudo, na interpretacao de sinais e na organizacao de evidencias.',
      objective:
        'Ensinar finalidade, contexto, limitacoes e interpretacao de resultados sem transformar ferramenta em substituto de raciocinio.',
      sources: ['NIST SP 800-153', 'Bettercap documentation', 'TCM Security PNPT Methodology'],
      goals: [
        'Entender finalidade de suites e utilitarios wireless.',
        'Relacionar hash, processamento e evidencia sem instrucoes operacionais ofensivas.',
        'Organizar saidas tecnicas para relatorio.',
      ],
      blocks: [
        {
          id: 'tools-finalidade',
          title: 'Ferramenta não substitui raciocínio',
          type: 'conceito',
          content:
            'Ferramentas ajudam a coletar sinais, mas o valor esta em interpretar resultado, confirmar contexto e explicar risco de forma compreensivel.',
        },
        {
          id: 'tools-wireless-suite',
          title: 'Suites wireless como instrumentos de leitura',
          type: 'resumo',
          content:
            'Suites wireless podem ser estudadas pela finalidade: observar redes, entender quadros, organizar capturas autorizadas, validar configuracao e apoiar relatorio.',
        },
        {
          id: 'tools-hash-wordlists',
          title: 'Hashes, GPU e wordlists como conceito',
          type: 'conceito',
          content:
            'Hashes e processamento acelerado ajudam a explicar risco de senha fraca. O foco do material e entender exposicao, politica de senhas, MFA e defesa.',
        },
        {
          id: 'tools-evidencias',
          title: 'Registro de evidências',
          type: 'checklist',
          items: [
            'Salvar origem do dado.',
            'Anotar hipotese.',
            'Anotar resultado.',
            'Separar falso positivo.',
            'Escrever impacto.',
            'Criar recomendacao.',
          ],
        },
        {
          id: 'tools-limites',
          title: 'Limites de laboratório',
          type: 'alerta',
          content:
            'Use ferramentas apenas em ambiente autorizado. Evite qualquer teste fora do escopo e registre decisoes tecnicas durante o processo.',
        },
      ],
    },
    {
      id: 'metodologias-teste-web',
      order: 6,
      title: 'Metodologias de Teste Web',
      summary: 'Categorias OWASP, criterios verificaveis, APIs, autenticacao e priorizacao de risco.',
      objective:
        'Organizar avaliacao web em metodologia clara, com categorias, impacto, severidade e forma de documentar achados.',
      sources: ['OWASP WSTG', 'OWASP ASVS', 'PortSwigger Web Security Academy', 'CVSS v3.1', 'NVD Metrics'],
      goals: [
        'Relacionar WSTG, ASVS e categorias de verificacao.',
        'Entender riscos como falhas de autenticacao, acesso, entrada e APIs como conceitos.',
        'Usar CVSS como apoio de priorizacao, nao como unica decisao.',
      ],
      blocks: [
        {
          id: 'web-wstg',
          title: 'WSTG como mapa de estudo',
          type: 'fonte',
          content:
            'O OWASP WSTG organiza testes web em categorias. Para estudo, ele funciona como mapa: entender objetivo, observar evidencias, registrar impacto e propor correcao.',
        },
        {
          id: 'web-asvs',
          title: 'ASVS como régua de qualidade',
          type: 'fonte',
          content:
            'O ASVS ajuda a transformar seguranca em requisito verificavel. Em vez de dizer que algo esta seguro, o relatorio aponta quais controles foram avaliados.',
        },
        {
          id: 'web-categorias',
          title: 'Categorias de verificação',
          type: 'checklist',
          items: [
            'Information Gathering.',
            'Configuration Testing.',
            'Authentication Testing.',
            'Session Management Testing.',
            'Authorization Testing.',
            'Input Validation Testing.',
            'Error Handling.',
            'Business Logic.',
            'API testing.',
          ],
        },
        {
          id: 'web-riscos-conceituais',
          title: 'Riscos web como conceito',
          type: 'conceito',
          content:
            'SQL Injection, XSS, SSRF, Command Injection, falhas de autenticacao e controle de acesso devem ser estudados como categorias de risco, impacto e correcao, sem payloads reutilizaveis.',
        },
        {
          id: 'web-cvss',
          title: 'CVSS e priorização',
          type: 'metodologia',
          content:
            'CVSS ajuda a discutir vetor, impacto e severidade. A priorizacao final tambem considera contexto, exposicao, criticidade do ativo e capacidade de remediacao.',
        },
      ],
    },
    {
      id: 'seguranca-mobile-android',
      order: 7,
      title: 'Segurança Mobile Android',
      summary: 'Avaliacao defensiva de apps mobile usando criterios de armazenamento, rede, autenticacao e privacidade.',
      objective:
        'Ensinar avaliacao mobile autorizada, protecao de dados, criterios de verificacao e boas praticas de relatorio.',
      sources: ['OWASP MASVS', 'OWASP MASTG'],
      goals: [
        'Entender arquitetura mobile e modelos de seguranca.',
        'Observar armazenamento, rede, autenticacao, permissao, logs e build.',
        'Descrever NetHunter apenas como ferramenta educacional de laboratorio.',
      ],
      blocks: [
        {
          id: 'mobile-correcao-nomenclatura',
          title: 'Avaliação mobile autorizada',
          type: 'alerta',
          content:
            'Este modulo substitui qualquer linguagem antiga sobre mobile por uma abordagem profissional: verificacao autorizada, protecao de dados, privacidade e criterios de seguranca.',
        },
        {
          id: 'mobile-masvs',
          title: 'MASVS e MASTG como base',
          type: 'fonte',
          content:
            'OWASP MASVS e MASTG organizam controles e testes de apps mobile, incluindo armazenamento seguro, comunicacao, autenticacao, criptografia, privacidade e resiliencia.',
        },
        {
          id: 'mobile-observacao',
          title: 'O que observar em apps',
          type: 'checklist',
          items: [
            'Dados sensiveis armazenados.',
            'Comunicacao protegida.',
            'Autenticacao e sessao.',
            'Permissoes solicitadas.',
            'Logs em producao.',
            'Configuracao de build.',
            'Privacidade e consentimento.',
          ],
        },
        {
          id: 'mobile-plataformas',
          title: 'Android, iOS e modelos de segurança',
          type: 'comparacao',
          content:
            'Android e iOS possuem modelos, permissões e ecossistemas diferentes. O estudo deve comparar criterios de protecao sem assumir que uma plataforma elimina todos os riscos.',
        },
        {
          id: 'mobile-nethunter',
          title: 'NetHunter no laboratório',
          type: 'nota-de-campo',
          content:
            'NetHunter pode ser citado como ambiente educacional de laboratorio. A pagina nao executa comandos, nao automatiza testes e nao orienta uso fora de escopo autorizado.',
        },
      ],
    },
    {
      id: 'wordlists-politica-senhas',
      order: 8,
      title: 'Wordlists e Política de Senhas',
      summary: 'Por que senhas fracas geram risco e como politicas, MFA e monitoramento reduzem exposicao.',
      objective:
        'Explicar wordlists e hashes como conceitos de risco, conectando o tema a defesa, resposta e boas praticas.',
      sources: ['NIST SP 800-115', 'CVSS v3.1', 'NVD Metrics'],
      goals: [
        'Entender por que senhas fracas e reutilizacao aumentam risco.',
        'Relacionar vazamentos, hashes, MFA e gerenciadores de senha.',
        'Criar recomendacoes defensivas para politica de senha.',
      ],
      blocks: [
        {
          id: 'senhas-wordlists',
          title: 'O que são wordlists',
          type: 'conceito',
          content:
            'Wordlists sao listas usadas para representar padroes comuns de senha. No estudo seguro, elas explicam por que credenciais fracas e reutilizadas sao risco real.',
        },
        {
          id: 'senhas-risco',
          title: 'Risco de reutilização',
          type: 'alerta',
          content:
            'Senhas reutilizadas transformam um vazamento externo em risco interno. A defesa combina MFA, gerenciadores, monitoramento e educacao do usuario.',
        },
        {
          id: 'senhas-hashes',
          title: 'Hashes e proteção',
          type: 'conceito',
          content:
            'Hashes nao devem ser confundidos com criptografia reversivel. Uma boa politica inclui algoritmos adequados, parametros modernos e protecao contra tentativas repetidas.',
        },
        {
          id: 'senhas-defesa',
          title: 'Defesa contra risco de senha',
          type: 'checklist',
          items: [
            'Exigir MFA em contas criticas.',
            'Usar gerenciador de senhas.',
            'Bloquear credenciais vazadas.',
            'Monitorar tentativas anormais.',
            'Remover senhas padrao.',
            'Treinar usuarios para frases longas.',
          ],
        },
        {
          id: 'senhas-relatorio',
          title: 'Como relatar',
          type: 'relatorio',
          content:
            'O relatorio deve explicar impacto, evidencia permitida e recomendacao. Evite publicar segredos, hashes completos ou dados sensiveis desnecessarios.',
        },
      ],
    },
    {
      id: 'relatorio-tecnico-executivo',
      order: 9,
      title: 'Relatório Técnico e Executivo',
      summary: 'Transformar achados tecnicos em entrega clara, objetiva e util para decisao.',
      objective:
        'Ensinar estrutura de relatorio profissional, severidade, evidencia, recomendacao, plano de acao e reteste.',
      sources: ['PTES Reporting', 'NIST SP 800-115', 'CVSS v3.1'],
      goals: [
        'Separar resumo executivo e detalhe tecnico.',
        'Relacionar evidencia, impacto, probabilidade e prioridade.',
        'Criar recomendacoes e plano de reteste.',
      ],
      blocks: [
        {
          id: 'relatorio-estrutura',
          title: 'Estrutura profissional',
          type: 'checklist',
          items: [
            'Resumo executivo.',
            'Escopo.',
            'Metodologia.',
            'Achados.',
            'Evidencias.',
            'Risco.',
            'Recomendacoes.',
            'Plano de correcao.',
            'Reteste.',
          ],
        },
        {
          id: 'relatorio-linguagem',
          title: 'Linguagem clara',
          type: 'conceito',
          content:
            'Relatorio bom e direto: explica o problema, por que importa, onde foi visto e como corrigir. Evite drama tecnico e nao esconda incertezas.',
        },
        {
          id: 'relatorio-severidade',
          title: 'Severidade e CVSS',
          type: 'metodologia',
          content:
            'CVSS apoia a conversa de severidade, mas a decisao precisa considerar contexto do negocio, exposicao, facilidade de exploracao, compensacoes e urgencia.',
        },
        {
          id: 'relatorio-evidencias',
          title: 'Evidências com cuidado',
          type: 'nota-de-campo',
          content:
            'Evidencia deve ser suficiente para provar o achado e segura o bastante para nao vazar segredos. Mascare dados sensiveis sempre que possivel.',
        },
        {
          id: 'relatorio-plano-acao',
          title: 'Plano de ação e reteste',
          type: 'relatorio',
          content:
            'A entrega termina melhor quando aponta responsavel, prazo, recomendacao, validacao esperada e criterio de reteste.',
        },
      ],
    },
    {
      id: 'preparacao-certificacao-sywp',
      order: 10,
      title: 'Preparação para Certificação SYWP',
      summary: 'Trilha de preparacao com rotina, documentacao, simulados e pratica autorizada.',
      objective:
        'Criar uma rotina de estudo para certificacao wireless com foco em fundamentos, relatorio, tempo e evidencias.',
      sources: ['Solyd Wireless Pentester', 'HTB Academy', 'TryHackMe', 'VulnHub'],
      goals: [
        'Organizar revisao por semana.',
        'Treinar relatorio e controle de tempo.',
        'Executar simulados apenas em ambientes permitidos.',
      ],
      blocks: [
        {
          id: 'sywp-estrutura',
          title: 'Estrutura da preparação',
          type: 'resumo',
          content:
            'A preparacao combina fundamentos, redes, wireless, metodologia, evidencias, relatorio e entrevista. O objetivo e chegar com rotina, nao com improviso.',
        },
        {
          id: 'sywp-checklist',
          title: 'Checklist de preparação',
          type: 'checklist',
          items: [
            'Revisar Linux e redes.',
            'Revisar fundamentos wireless.',
            'Treinar escrita de relatorio.',
            'Organizar modelo de evidencias.',
            'Praticar simulados autorizados.',
            'Cronometrar sessoes.',
            'Preparar resumo executivo.',
          ],
        },
        {
          id: 'sywp-roteiro',
          title: 'Roteiro por semana',
          type: 'meta-diaria',
          content:
            'Alterne blocos de teoria, leitura de evidencia, laboratorio permitido e escrita. Reserve tempo para revisar erros e transformar duvidas em notas de campo.',
        },
        {
          id: 'sywp-labs',
          title: 'Laboratórios recomendados',
          type: 'fonte',
          content:
            'Use plataformas e laboratorios permitidos para consolidar metodologia. O criterio e aprender com escopo claro, ambiente controlado e registro de progresso.',
        },
        {
          id: 'sywp-prova',
          title: 'Controle de tempo e evidências',
          type: 'revisao',
          content:
            'Em simulados, pratique tomar notas enquanto trabalha. Evidencia sem organizacao vira retrabalho; organizacao sem pratica vira teoria solta.',
        },
      ],
    },
  ],
};

export const studyModules = studyContent.modules;

export function validateStudyModules(modules: StudyModule[] = studyModules) {
  const warnings: string[] = [];
  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  const seenTitles = new Set<string>();
  const titleNumberPattern = /^\s*(?:\d+[\.\-)]|0\d[\.\-)]|\d+\s+-)\s*/;
  const problematicTitlePattern = /ataque\s+via|ataques?\s+passo|wordlists?\s+[—-]\s+os\s+dicionarios/i;

  modules.forEach((module) => {
    const normalizedTitle = normalizeStudyText(module.title);

    if (seenIds.has(module.id)) warnings.push(`Modulo com id duplicado: ${module.id}`);
    if (seenOrders.has(module.order)) warnings.push(`Modulo com order duplicado: ${module.order}`);
    if (seenTitles.has(normalizedTitle)) warnings.push(`Modulo com title duplicado: ${module.title}`);
    if (titleNumberPattern.test(module.title)) warnings.push(`Titulo com numero hardcoded: ${module.title}`);
    if (problematicTitlePattern.test(normalizedTitle)) warnings.push(`Titulo publico com linguagem inadequada: ${module.title}`);
    if (!module.blocks.length) warnings.push(`Modulo sem blocos: ${module.title}`);

    seenIds.add(module.id);
    seenOrders.add(module.order);
    seenTitles.add(normalizedTitle);

    const seenBlockIds = new Set<string>();
    module.blocks.forEach((block) => {
      if (!block.id) warnings.push(`Bloco sem id no modulo ${module.title}`);
      if (seenBlockIds.has(block.id)) warnings.push(`Bloco com id duplicado em ${module.title}: ${block.id}`);
      if (!block.title) warnings.push(`Bloco sem title no modulo ${module.title}`);
      if (!block.content && !block.items?.length) warnings.push(`Bloco sem content/items em ${module.title}: ${block.title}`);
      seenBlockIds.add(block.id);
    });
  });

  if (warnings.length && import.meta.env.DEV) {
    console.warn('[Wireless Lab Drive] Validacao de conteudo:', warnings);
  }

  return warnings;
}

function normalizeStudyText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
