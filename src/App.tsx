import {
  Activity,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Flame,
  Layers3,
  ListChecks,
  Menu,
  MonitorSmartphone,
  Network,
  Play,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import material from './data/material.json';
import {
  defaultRendererConfig,
  initializeRenderer,
  rendererModeLabels,
  type RendererConfig,
  type RendererDiagnostics,
  type RendererMode,
} from './graphics';

type ContentBlock =
  | {
      id: string;
      type: 'paragraph' | 'heading1' | 'heading2' | 'heading' | 'list';
      style: string | null;
      text: string;
    }
  | {
      id: string;
      type: 'table';
      rows: string[][];
    };

type Section = {
  id: string;
  title: string;
  blocks: ContentBlock[];
  index: number;
};

type MaterialData = {
  metadata: {
    title: string;
    subtitle: string;
    description: string;
    sourceFile: string;
    paragraphCount: number;
    tableCount: number;
    blockCount: number;
    contentHash: string;
  };
  blocks: ContentBlock[];
};

type LabMode = (typeof labModes)[number]['key'];

const data = material as MaterialData;
const storageKey = 'wireless-study-progress-v1';
const productName = 'WIRELESS LAB DRIVE';

const navItems = [
  { id: 'entry', label: 'Início' },
  { id: 'journey', label: 'Trilha' },
  { id: 'study', label: 'Estudo' },
  { id: 'lab', label: 'Laboratório' },
  { id: 'report', label: 'Relatório' },
  { id: 'progress', label: 'Progresso' },
];

const commandBank = [
  {
    command: 'whoami',
    label: 'Identidade',
    response: 'Mostra o usuário atual. Bom para confirmar contexto antes de registrar evidências.',
  },
  {
    command: 'pwd',
    label: 'Local',
    response: 'Exibe o diretório atual. Evita salvar artefatos no lugar errado durante o laboratório.',
  },
  {
    command: 'ip a',
    label: 'Rede',
    response: 'Lista interfaces e endereços IP. Use para ler o mapa local antes de qualquer hipótese.',
  },
  {
    command: 'iwconfig',
    label: 'Wi-Fi',
    response: 'Mostra configuração wireless, modo da interface e detalhes úteis para diagnóstico.',
  },
  {
    command: 'ping',
    label: 'Alcance',
    response: 'Testa resposta de um host autorizado e ajuda a separar falha de rota de falha de serviço.',
  },
  {
    command: 'grep',
    label: 'Filtro',
    response: 'Procura texto em arquivos de log e anotações. Ótimo para transformar bagunça em evidência.',
  },
];

const flashcards = [
  {
    front: 'Escopo',
    back: 'O limite formal do laboratório ou do teste autorizado. Sem escopo, não existe pentest responsável.',
  },
  {
    front: 'Handshake WPA/WPA2',
    back: 'Troca de mensagens que prova a negociação entre cliente e AP. No estudo, vira evidência e mitigação.',
  },
  {
    front: 'PMKID',
    back: 'Identificador ligado ao processo de autenticação. O valor de estudo está em entender risco, defesa e relato.',
  },
  {
    front: 'WPS',
    back: 'Atalho de pareamento que pode virar ponto fraco. Defesa típica: desativar e validar bloqueios.',
  },
  {
    front: 'dBm',
    back: 'Medida de potência do sinal. Ajuda a separar problema de rádio, distância, canal e interferência.',
  },
  {
    front: 'Relatório',
    back: 'A entrega que conecta hipótese, evidência, impacto e correção. É onde o laboratório vira aprendizado.',
  },
];

const osiLayers = [
  { name: 'Aplicação', detail: 'DNS, HTTP, serviços e evidências legíveis para relatório.' },
  { name: 'Transporte', detail: 'TCP e UDP explicam confiabilidade, latência e portas.' },
  { name: 'Rede', detail: 'IP, rotas, gateway e caminho entre origem e destino.' },
  { name: 'Enlace', detail: 'MAC, ARP e quadros 802.11 moram aqui.' },
  { name: 'Física', detail: 'Canal, ruído, frequência, potência e alcance do sinal.' },
];

const labModes = [
  { key: 'map', label: 'Mapa', icon: Network },
  { key: 'handshake', label: 'Handshake', icon: Radio },
  { key: 'defense', label: 'Defesa', icon: ShieldCheck },
] as const;

const heroRendererConfig: RendererConfig = {
  ...defaultRendererConfig,
  debugOverlay: false,
  fpsLimit: 45,
};

function App() {
  const sections = useMemo(() => buildSections(data.blocks), []);
  const [activeSectionId, setActiveSectionId] = useState(() => sections[0]?.id ?? 'inicio');
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [completed, setCompleted] = useState<Set<string>>(() => readProgress());
  const [labMode, setLabMode] = useState<LabMode>('map');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const importantSections = sections.filter((section) =>
    /^(MÓDULO|APÊNDICE|Modelo de Relatório)/i.test(section.title),
  );
  const moduleSections = importantSections.filter((section) => /^MÓDULO/i.test(section.title));
  const appendixSections = importantSections.filter((section) => /^APÊNDICE|Modelo de Relatório/i.test(section.title));
  const reportSection =
    appendixSections.find((section) => /Modelo de Relatório/i.test(section.title)) ??
    appendixSections[appendixSections.length - 1] ??
    activeSection;
  const journeySections = [...moduleSections, reportSection].filter(Boolean);
  const completedCount = importantSections.filter((section) => completed.has(section.id)).length;
  const progress = importantSections.length ? Math.round((completedCount / importantSections.length) * 100) : 0;
  const nextSection = importantSections.find((section) => !completed.has(section.id)) ?? activeSection;
  const activeJourneyIndex = Math.max(
    0,
    journeySections.findIndex((section) => section.id === activeSection.id),
  );

  const blockToSection = useMemo(() => {
    const map = new Map<string, Section>();
    sections.forEach((section) => section.blocks.forEach((block) => map.set(block.id, section)));
    return map;
  }, [sections]);

  const searchResults = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return data.blocks
      .filter((block) => blockContains(block, term))
      .map((block) => ({ block, section: blockToSection.get(block.id) }))
      .filter((entry): entry is { block: ContentBlock; section: Section } => Boolean(entry.section))
      .slice(0, 10);
  }, [blockToSection, query]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
  }, [completed]);

  function chooseSection(id: string, scrollTarget = 'study') {
    setActiveSectionId(id);
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => scrollToSection(scrollTarget));
  }

  function toggleDone(id: string) {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function jumpToResult(block: ContentBlock, section: Section) {
    setActiveSectionId(section.id);
    setMobileMenuOpen(false);
    window.setTimeout(() => {
      document.getElementById(block.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  return (
    <main
      className={`app-shell ${focusMode ? 'is-focus' : ''}`}
      style={{ '--reader-scale': fontScale } as React.CSSProperties}
    >
      <StudyNavigation
        query={query}
        onQueryChange={setQuery}
        progress={progress}
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
        onFocusToggle={() => setFocusMode((value) => !value)}
        focusMode={focusMode}
      />

      {query.trim() && (
        <SearchResults results={searchResults} onResultSelect={jumpToResult} />
      )}

      <LoadingGate progress={progress} nextSection={nextSection} onEnter={() => chooseSection(nextSection.id)} />

      <HeroExperience
        progress={progress}
        moduleCount={moduleSections.length}
        blockCount={data.metadata.blockCount}
        labMode={labMode}
        onStart={() => chooseSection(nextSection.id)}
      />

      <ProgressRail
        progress={progress}
        activeSection={activeSection}
        nextSection={nextSection}
        completedCount={completedCount}
        totalCount={importantSections.length}
        onNext={() => chooseSection(nextSection.id)}
        onReset={() => setCompleted(new Set())}
      />

      <StoryChapters moduleSections={moduleSections} onSelectSection={chooseSection} />

      <ModuleJourneyMap
        sections={journeySections}
        activeSection={activeSection}
        completed={completed}
        activeJourneyIndex={activeJourneyIndex}
        onSelectSection={chooseSection}
      />

      <section className="experience-workspace" id="study">
        <StudyReader
          sections={sections}
          activeSection={activeSection}
          completed={completed}
          query={query}
          fontScale={fontScale}
          onFontScaleChange={setFontScale}
          onSectionSelect={chooseSection}
          onToggleDone={toggleDone}
        />

        <LabPanel mode={labMode} onModeChange={setLabMode} />
      </section>

      <ReportSection reportSection={reportSection} onOpenReport={chooseSection} progress={progress} />
    </main>
  );
}

function StudyNavigation({
  query,
  onQueryChange,
  progress,
  mobileOpen,
  onMobileOpenChange,
  onFocusToggle,
  focusMode,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  progress: number;
  mobileOpen: boolean;
  onMobileOpenChange: (value: boolean) => void;
  onFocusToggle: () => void;
  focusMode: boolean;
}) {
  return (
    <header className="study-nav">
      <button
        className="nav-menu-button"
        type="button"
        onClick={() => onMobileOpenChange(true)}
        aria-label="Abrir navegação"
      >
        <Menu size={18} />
      </button>
      <button className="brand-lockup" type="button" onClick={() => scrollToSection('entry')}>
        <span className="brand-symbol">
          <Wifi size={20} />
        </span>
        <span>
          <small>Academia Wireless</small>
          <strong>{productName}</strong>
        </span>
      </button>

      <nav className={`nav-links ${mobileOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
        <button className="nav-close" type="button" onClick={() => onMobileOpenChange(false)} aria-label="Fechar menu">
          <X size={18} />
        </button>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onMobileOpenChange(false);
              scrollToSection(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <label className="global-search">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar conceito, módulo ou evidência"
          aria-label="Buscar no material"
        />
      </label>

      <div className="nav-actions">
        <span className="nav-progress" aria-label={`Progresso ${progress}%`}>
          <i style={{ width: `${progress}%` }} />
        </span>
        <button
          className={`nav-icon ${focusMode ? 'is-active' : ''}`}
          type="button"
          onClick={onFocusToggle}
          title="Modo foco"
        >
          <Eye size={17} />
        </button>
        <a className="nav-icon" href="/material_estudo_premium_wireless_seguro.docx" title="Baixar DOCX original">
          <Download size={17} />
        </a>
      </div>
    </header>
  );
}

function SearchResults({
  results,
  onResultSelect,
}: {
  results: Array<{ block: ContentBlock; section: Section }>;
  onResultSelect: (block: ContentBlock, section: Section) => void;
}) {
  return (
    <section className="search-results" aria-label="Resultados de busca">
      <div>
        <p className="kicker">Busca ativa</p>
        <strong>{results.length ? `${results.length} achados relevantes` : 'Nada encontrado'}</strong>
      </div>
      <div className="result-list">
        {results.map(({ block, section }) => (
          <button key={block.id} type="button" onClick={() => onResultSelect(block, section)}>
            <span>{compactTitle(section.title)}</span>
            <small>{blockPreview(block)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function LoadingGate({
  progress,
  nextSection,
  onEnter,
}: {
  progress: number;
  nextSection: Section;
  onEnter: () => void;
}) {
  return (
    <section className="loading-gate" id="entry" aria-label="Entrada do laboratório">
      <div className="gate-frame">
        <p className="kicker">Authorized lab mode</p>
        <h1>Load Wireless Lab</h1>
        <p>
          Inicializando uma jornada de estudo técnico: fundamentos, rede viva, análise, defesa e relatório final em
          ambiente controlado.
        </p>
        <div className="gate-console" aria-label="Status de inicialização">
          <span>study-os / ready</span>
          <span>scope / authorized</span>
          <span>progress / {progress}%</span>
        </div>
      </div>
      <button className="enter-drive" type="button" onClick={onEnter}>
        <Play size={18} />
        <span>Enter the grid</span>
        <small>{compactTitle(nextSection.title)}</small>
      </button>
    </section>
  );
}

function HeroExperience({
  progress,
  moduleCount,
  blockCount,
  labMode,
  onStart,
}: {
  progress: number;
  moduleCount: number;
  blockCount: number;
  labMode: LabMode;
  onStart: () => void;
}) {
  return (
    <section className="hero-experience" id="hero">
      <div className="hero-copy">
        <p className="kicker">Laboratório autorizado</p>
        <h2>Segurança Wireless do zero ao raciocínio de pentest autorizado</h2>
        <p>
          Uma trilha visual para entender redes, defesa, análise e metodologia em ambientes controlados, com leitura
          editorial e prática segura.
        </p>
        <div className="hero-actions">
          <button type="button" onClick={onStart}>
            <span>Continuar estudo</span>
            <Play size={17} />
          </button>
          <a href="/material_estudo_premium_wireless_seguro.docx">
            <span>DOCX original</span>
            <Download size={17} />
          </a>
        </div>
      </div>

      <div className="hero-visual" aria-label="Rede simulada">
        <div className="hero-visual-head">
          <span>Wireless study grid</span>
          <strong>Authorized only</strong>
        </div>
        <SignalCanvas mode={labMode} config={heroRendererConfig} />
        <div className="hero-metrics" id="progress">
          <MetricBlock label="Módulos" value={moduleCount} />
          <MetricBlock label="Blocos" value={blockCount} />
          <MetricBlock label="Progresso" value={`${progress}%`} />
          <MetricBlock label="Modo" value="Lab" />
        </div>
      </div>
    </section>
  );
}

function MetricBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-block">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProgressRail({
  progress,
  activeSection,
  nextSection,
  completedCount,
  totalCount,
  onNext,
  onReset,
}: {
  progress: number;
  activeSection: Section;
  nextSection: Section;
  completedCount: number;
  totalCount: number;
  onNext: () => void;
  onReset: () => void;
}) {
  return (
    <aside className="progress-rail" aria-label="Progresso do estudo">
      <span className="rail-line" style={{ height: `${progress}%` }} />
      <strong>{progress}%</strong>
      <small>
        {completedCount}/{totalCount}
      </small>
      <button type="button" onClick={onNext} title="Ir para próximo bloco">
        <Zap size={15} />
      </button>
      <button type="button" onClick={onReset} title="Resetar progresso">
        <RotateCcw size={15} />
      </button>
      <p>{compactTitle(activeSection.title)}</p>
      <em>Próximo: {compactTitle(nextSection.title)}</em>
    </aside>
  );
}

function StoryChapters({
  moduleSections,
  onSelectSection,
}: {
  moduleSections: Section[];
  onSelectSection: (id: string, scrollTarget?: string) => void;
}) {
  const chapters = [
    {
      title: 'Fundamentos',
      text: 'Comece pelo sistema, rede e linguagem técnica. Fundamento antes da execução.',
      section: moduleSections[0],
      icon: BookOpen,
    },
    {
      title: 'Rede viva',
      text: 'Entenda rádio, superfície, sinal, canal e a arquitetura que sustenta o laboratório.',
      section: moduleSections[2],
      icon: Wifi,
    },
    {
      title: 'Análise',
      text: 'Ferramentas entram como raciocínio, evidência e método, não como atalhos soltos.',
      section: moduleSections[3],
      icon: Activity,
    },
    {
      title: 'Defesa',
      text: 'Cada descoberta precisa terminar em mitigação, documentação e melhoria real.',
      section: moduleSections[6],
      icon: ShieldCheck,
    },
  ].filter((chapter) => chapter.section);

  return (
    <section className="story-chapters" aria-label="Capítulos narrativos">
      {chapters.map((chapter, index) => {
        const Icon = chapter.icon;
        return (
          <button
            key={chapter.title}
            className="story-chapter"
            type="button"
            onClick={() => onSelectSection(chapter.section.id)}
          >
            <span>0{index + 1}</span>
            <Icon size={22} />
            <strong>{chapter.title}</strong>
            <p>{chapter.text}</p>
          </button>
        );
      })}
    </section>
  );
}

function ModuleJourneyMap({
  sections,
  activeSection,
  completed,
  activeJourneyIndex,
  onSelectSection,
}: {
  sections: Section[];
  activeSection: Section;
  completed: Set<string>;
  activeJourneyIndex: number;
  onSelectSection: (id: string, scrollTarget?: string) => void;
}) {
  return (
    <section className="module-journey" id="journey">
      <div className="section-intro">
        <p className="kicker">Trilha em progresso</p>
        <h2>A rota técnica</h2>
        <p>
          Um mapa vertical de estudo, com módulos concluídos, etapa ativa e próximos capítulos reduzidos para manter
          foco.
        </p>
      </div>
      <div className="journey-route">
        {sections.map((section, index) => (
          <ModuleNode
            key={section.id}
            section={section}
            index={index}
            isActive={section.id === activeSection.id}
            isDone={completed.has(section.id)}
            isFuture={index > activeJourneyIndex + 1}
            onSelect={() => onSelectSection(section.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ModuleNode({
  section,
  index,
  isActive,
  isDone,
  isFuture,
  onSelect,
}: {
  section: Section;
  index: number;
  isActive: boolean;
  isDone: boolean;
  isFuture: boolean;
  onSelect: () => void;
}) {
  const stateLabel = isDone ? 'concluído' : isActive ? 'módulo atual' : isFuture ? 'próximo bloco' : 'disponível';

  return (
    <button
      className={`module-node ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''} ${isFuture ? 'is-future' : ''}`}
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'step' : undefined}
    >
      <span className="module-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="module-copy">
        <small>{stateLabel}</small>
        <strong>{compactTitle(section.title)}</strong>
        <em>{sectionDigest(section)}</em>
      </span>
      <span className="module-count">{section.blocks.length} blocos</span>
    </button>
  );
}

function StudyReader({
  sections,
  activeSection,
  completed,
  query,
  fontScale,
  onFontScaleChange,
  onSectionSelect,
  onToggleDone,
}: {
  sections: Section[];
  activeSection: Section;
  completed: Set<string>;
  query: string;
  fontScale: number;
  onFontScaleChange: (value: number) => void;
  onSectionSelect: (id: string, scrollTarget?: string) => void;
  onToggleDone: (id: string) => void;
}) {
  return (
    <article className="study-reader">
      <div className="reader-toolbar">
        <div>
          <p className="kicker">Modo estudo ativo</p>
          <h2>{activeSection.title}</h2>
        </div>
        <div className="reader-controls">
          <label>
            <BookOpen size={16} />
            <input
              type="range"
              min="0.94"
              max="1.18"
              step="0.02"
              value={fontScale}
              onChange={(event) => onFontScaleChange(Number(event.target.value))}
              aria-label="Tamanho do texto"
            />
          </label>
          <button
            className={completed.has(activeSection.id) ? 'is-done' : ''}
            type="button"
            onClick={() => onToggleDone(activeSection.id)}
          >
            <BadgeCheck size={18} />
            <span>{completed.has(activeSection.id) ? 'Concluído' : 'Marcar'}</span>
          </button>
        </div>
      </div>

      <div className="section-dock" aria-label="Índice compacto">
        <select
          value={activeSection.id}
          onChange={(event) => onSectionSelect(event.target.value)}
          aria-label="Selecionar seção"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {String(section.index).padStart(2, '0')} - {compactTitle(section.title)}
            </option>
          ))}
        </select>
        <span>{activeSection.blocks.length} blocos neste capítulo</span>
      </div>

      <div className="reader-lead">
        <span>Nota de campo</span>
        <p>{sectionDigest(activeSection)}</p>
      </div>

      <div className="content-stream">
        {activeSection.blocks.map((block) => (
          <ContentBlockView key={block.id} block={block} query={query} />
        ))}
      </div>
    </article>
  );
}

function LabPanel({ mode, onModeChange }: { mode: LabMode; onModeChange: (mode: LabMode) => void }) {
  const [rendererConfig, setRendererConfig] = useState<RendererConfig>(defaultRendererConfig);
  const [diagnostics, setDiagnostics] = useState<RendererDiagnostics | null>(null);

  function updateRendererConfig(update: Partial<RendererConfig>) {
    setRendererConfig((current) => ({ ...current, ...update }));
  }

  return (
    <aside className="lab-panel" id="lab">
      <div className="lab-panel-head">
        <p className="kicker">Lab Panel</p>
        <h2>Rede viva</h2>
        <span>Ambiente controlado</span>
      </div>

      <div className="lab-status">
        <div>
          <strong>STA</strong>
          <span>Cliente</span>
        </div>
        <div>
          <strong>AP</strong>
          <span>Ponto de acesso</span>
        </div>
        <div>
          <strong>DEF</strong>
          <span>Defesa</span>
        </div>
      </div>

      <SignalCanvas mode={mode} config={rendererConfig} onDiagnostics={setDiagnostics} />

      <div className="segmented">
        {labModes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={mode === item.key ? 'is-active' : ''}
              onClick={() => onModeChange(item.key)}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <RendererControls config={rendererConfig} diagnostics={diagnostics} onChange={updateRendererConfig} />
      <TerminalTraining />
      <FlashcardDeck />
      <LayerStack />
      <IntegrityPanel />
    </aside>
  );
}

function RendererControls({
  config,
  diagnostics,
  onChange,
}: {
  config: RendererConfig;
  diagnostics: RendererDiagnostics | null;
  onChange: (update: Partial<RendererConfig>) => void;
}) {
  return (
    <section className="renderer-console" aria-label="Diagnóstico gráfico">
      <div className="renderer-config">
        <label>
          <span>Renderer</span>
          <select
            value={config.renderer}
            onChange={(event) => onChange({ renderer: event.target.value as RendererMode })}
            aria-label="Selecionar renderizador"
          >
            {(Object.keys(rendererModeLabels) as RendererMode[]).map((key) => (
              <option key={key} value={key}>
                {rendererModeLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>FPS</span>
          <input
            type="number"
            min="15"
            max="240"
            step="15"
            value={config.fpsLimit}
            onChange={(event) => onChange({ fpsLimit: Number(event.target.value) || 60 })}
            aria-label="Limite de FPS"
          />
        </label>
        <div className="renderer-toggles">
          <label>
            <input
              type="checkbox"
              checked={config.vsync}
              onChange={(event) => onChange({ vsync: event.target.checked })}
            />
            <span>VSync</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.useHardwareAcceleration}
              onChange={(event) => onChange({ useHardwareAcceleration: event.target.checked })}
            />
            <span>GPU</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.debugOverlay}
              onChange={(event) => onChange({ debugOverlay: event.target.checked })}
            />
            <span>Debug</span>
          </label>
        </div>
      </div>

      {config.debugOverlay && <RendererDiagnosticsPanel diagnostics={diagnostics} config={config} />}
    </section>
  );
}

function RendererDiagnosticsPanel({
  diagnostics,
  config,
}: {
  diagnostics: RendererDiagnostics | null;
  config: RendererConfig;
}) {
  const messages = [...(diagnostics?.fallbackEvents ?? []), ...(diagnostics?.initializationErrors ?? [])].slice(-3);

  return (
    <div className="renderer-diagnostics" aria-label="Diagnóstico gráfico">
      <div className="renderer-diagnostics-head">
        <span>{rendererModeLabels[config.renderer]}</span>
        <strong>{diagnostics?.rendererLabel ?? 'Inicializando renderer'}</strong>
      </div>
      <dl>
        <div>
          <dt>Ativo</dt>
          <dd>{diagnostics?.activeRenderer ?? 'none'}</dd>
        </div>
        <div>
          <dt>GPU</dt>
          <dd>{diagnostics?.gpuName ?? 'detectando'}</dd>
        </div>
        <div>
          <dt>DirectX</dt>
          <dd>{diagnostics?.directXAvailable ? 'sim' : 'não'}</dd>
        </div>
        <div>
          <dt>OpenGL</dt>
          <dd>{diagnostics?.openglAvailable ? 'sim' : 'não'}</dd>
        </div>
        <div>
          <dt>FPS médio</dt>
          <dd>{diagnostics?.fpsAverage ? `${diagnostics.fpsAverage}` : '0'}</dd>
        </div>
        <div>
          <dt>VRAM</dt>
          <dd>{diagnostics?.graphicsMemoryMB ? `${diagnostics.graphicsMemoryMB} MB` : 'n/d'}</dd>
        </div>
      </dl>
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}

function TerminalTraining() {
  const [activeCommand, setActiveCommand] = useState(commandBank[0]);
  const [typed, setTyped] = useState('ip a');
  const [history, setHistory] = useState<string[]>(['scope validated', 'evidence mode ready']);
  const matched = commandBank.find((item) => typed.trim().startsWith(item.command));
  const displayCommand = matched ?? activeCommand;

  function selectCommand(item: (typeof commandBank)[number]) {
    setActiveCommand(item);
    setTyped(item.command);
    setHistory((current) => [`${item.command} / conceito carregado`, ...current].slice(0, 4));
  }

  return (
    <section className="terminal-training">
      <div className="panel-title">
        <div>
          <p className="kicker">Terminal visual</p>
          <h3>Comandos educativos</h3>
        </div>
        <Terminal size={18} />
      </div>
      <div className="command-grid">
        {commandBank.map((item) => (
          <button
            key={item.command}
            type="button"
            className={activeCommand.command === item.command ? 'is-active' : ''}
            onClick={() => selectCommand(item)}
          >
            {item.command}
          </button>
        ))}
      </div>
      <div className="terminal-box">
        <label>
          <span>$</span>
          <input value={typed} onChange={(event) => setTyped(event.target.value)} aria-label="Comando de treino" />
        </label>
        <p>{displayCommand.response}</p>
        <small>{displayCommand.label}</small>
      </div>
      <div className="lab-history">
        {history.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function FlashcardDeck() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = flashcards[index];

  function move(direction: 1 | -1) {
    setRevealed(false);
    setIndex((current) => (current + direction + flashcards.length) % flashcards.length);
  }

  return (
    <section className="flashcard-panel">
      <div className="panel-title">
        <div>
          <p className="kicker">Memória</p>
          <h3>Flashcards</h3>
        </div>
        <Layers3 size={18} />
      </div>
      <button className={`flashcard ${revealed ? 'is-revealed' : ''}`} onClick={() => setRevealed((value) => !value)}>
        <strong>{card.front}</strong>
        <span>{revealed ? card.back : 'Clique para revelar'}</span>
      </button>
      <div className="deck-controls">
        <button type="button" onClick={() => move(-1)} title="Anterior">
          <ChevronLeft size={16} />
        </button>
        <span>
          {index + 1}/{flashcards.length}
        </span>
        <button type="button" onClick={() => move(1)} title="Próximo">
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

function LayerStack() {
  const [active, setActive] = useState(0);

  return (
    <section className="layer-panel">
      <div className="panel-title">
        <div>
          <p className="kicker">Modelo mental</p>
          <h3>Camadas</h3>
        </div>
        <ListChecks size={18} />
      </div>
      <div className="layer-stack">
        {osiLayers.map((layer, index) => (
          <button
            key={layer.name}
            type="button"
            className={index === active ? 'is-active' : ''}
            onClick={() => setActive(index)}
          >
            {layer.name}
          </button>
        ))}
      </div>
      <p className="layer-detail">{osiLayers[active].detail}</p>
    </section>
  );
}

function IntegrityPanel() {
  return (
    <section className="integrity-panel">
      <div className="panel-title">
        <div>
          <p className="kicker">Integridade</p>
          <h3>Conteúdo preservado</h3>
        </div>
        <ShieldCheck size={18} />
      </div>
      <dl>
        <div>
          <dt>Parágrafos</dt>
          <dd>{data.metadata.paragraphCount}</dd>
        </div>
        <div>
          <dt>Tabelas</dt>
          <dd>{data.metadata.tableCount}</dd>
        </div>
        <div>
          <dt>Hash</dt>
          <dd>{data.metadata.contentHash.slice(0, 10)}</dd>
        </div>
      </dl>
      <a href="/material_estudo_premium_wireless_seguro.docx">
        <Download size={16} />
        DOCX original
      </a>
    </section>
  );
}

function ReportSection({
  reportSection,
  onOpenReport,
  progress,
}: {
  reportSection: Section;
  onOpenReport: (id: string, scrollTarget?: string) => void;
  progress: number;
}) {
  return (
    <section className="report-section" id="report">
      <div>
        <p className="kicker">Relatório de aprendizado</p>
        <h2>Transforme estudo em entrega clara.</h2>
        <p>
          O fechamento da jornada conecta hipótese, evidência, impacto e correção. O relatório final permanece
          preservado no material e pode ser aberto a qualquer momento.
        </p>
      </div>
      <div className="report-actions">
        <MetricBlock label="Progresso" value={`${progress}%`} />
        <button type="button" onClick={() => onOpenReport(reportSection.id)}>
          <FileText size={18} />
          Abrir relatório
        </button>
      </div>
    </section>
  );
}

function SignalCanvas({
  mode,
  config = defaultRendererConfig,
  onDiagnostics,
}: {
  mode: string;
  config?: RendererConfig;
  onDiagnostics?: (diagnostics: RendererDiagnostics) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let raf = 0;
    let renderer: Awaited<ReturnType<typeof initializeRenderer>>['renderer'] | null = null;
    let previousFrame = performance.now();
    let previousRender = 0;
    let previousDiagnostics = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * ratio));
      const height = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      renderer?.resize(width, height, ratio);
    };

    const draw = (timeMs: number) => {
      if (!renderer || cancelled) return;
      const minFrameTime = config.fpsLimit > 0 ? 1000 / config.fpsLimit : 0;
      const elapsedSinceRender = timeMs - previousRender;
      const shouldRender = elapsedSinceRender >= minFrameTime || !config.vsync;

      if (shouldRender) {
        resize();
        renderer.render({
          timeMs,
          deltaMs: timeMs - previousFrame,
          mode: modeRef.current,
          width: canvas.width,
          height: canvas.height,
          pixelRatio: window.devicePixelRatio || 1,
        });
        previousFrame = timeMs;
        previousRender = timeMs;
      }

      if (onDiagnostics && timeMs - previousDiagnostics > 700) {
        onDiagnostics(renderer.getDiagnostics());
        previousDiagnostics = timeMs;
      }

      raf = window.requestAnimationFrame(draw);
    };

    initializeRenderer(canvas, config)
      .then((result) => {
        if (cancelled) {
          result.renderer.dispose();
          return;
        }
        renderer = result.renderer;
        onDiagnostics?.(result.diagnostics);
        resize();
        raf = window.requestAnimationFrame(draw);
      })
      .catch((error) => {
        if (!cancelled) {
          onDiagnostics?.({
            ...defaultRendererConfigDiagnostics(config.renderer),
            initializationErrors: [error instanceof Error ? error.message : String(error)],
          });
        }
      });

    window.addEventListener('resize', resize);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      renderer?.dispose();
      window.removeEventListener('resize', resize);
    };
  }, [
    config.debugOverlay,
    config.fpsLimit,
    config.renderer,
    config.useHardwareAcceleration,
    config.vsync,
    onDiagnostics,
  ]);

  return (
    <canvas
      key={`${config.renderer}-${config.useHardwareAcceleration}`}
      ref={canvasRef}
      className="signal-canvas"
      aria-hidden="true"
    />
  );
}

function ContentBlockView({ block, query }: { block: ContentBlock; query: string }) {
  if (block.type === 'table') {
    if (block.rows.length === 1 && block.rows[0].length === 1) {
      return (
        <FieldNote id={block.id} icon={<Sparkles size={18} />}>
          {renderHighlighted(block.rows[0][0], query)}
        </FieldNote>
      );
    }

    const [head, ...body] = block.rows;
    return (
      <div className="table-wrap" id={block.id}>
        <table>
          <thead>
            <tr>
              {head.map((cell, index) => (
                <th key={`${block.id}-h-${index}`}>{renderHighlighted(cell, query)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={`${block.id}-r-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${block.id}-c-${rowIndex}-${cellIndex}`}>{renderHighlighted(cell, query)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === 'heading1') {
    return (
      <div className="reader-heading" id={block.id}>
        <Flame size={22} />
        <h3>{renderHighlighted(block.text, query)}</h3>
      </div>
    );
  }

  if (block.type === 'heading2' || block.type === 'heading') {
    return (
      <h4 className="reader-subheading" id={block.id}>
        {renderHighlighted(block.text, query)}
      </h4>
    );
  }

  if (block.type === 'list') {
    return (
      <div className="list-block" id={block.id}>
        <Check size={16} />
        <p>{renderHighlighted(block.text, query)}</p>
      </div>
    );
  }

  if (looksLikeCode(block.text)) {
    return (
      <pre className="code-block" id={block.id}>
        <code>{block.text}</code>
      </pre>
    );
  }

  if (isFieldNote(block.text)) {
    return (
      <FieldNote id={block.id} icon={<ShieldCheck size={18} />}>
        {renderHighlighted(block.text, query)}
      </FieldNote>
    );
  }

  return (
    <p className="paragraph-block" id={block.id}>
      {renderHighlighted(block.text, query)}
    </p>
  );
}

function FieldNote({
  id,
  icon,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="field-note" id={id}>
      {icon}
      <div>
        <span>Nota de campo</span>
        <p>{children}</p>
      </div>
    </article>
  );
}

function buildSections(blocks: ContentBlock[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { id: 'inicio', title: 'Abertura', blocks: [], index: 1 };

  blocks.forEach((block) => {
    if (block.type === 'heading1') {
      if (current.blocks.length) sections.push(current);
      current = {
        id: block.id,
        title: block.text,
        blocks: [block],
        index: sections.length + 1,
      };
      return;
    }
    current.blocks.push(block);
  });

  if (current.blocks.length) sections.push(current);
  return sections.map((section, index) => ({ ...section, index: index + 1 }));
}

function readProgress() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw));
  } catch {
    return new Set<string>();
  }
}

function blockContains(block: ContentBlock, term: string) {
  const haystack = block.type === 'table' ? block.rows.flat().join(' ') : block.text;
  return normalize(haystack).includes(normalize(term));
}

function blockPreview(block: ContentBlock) {
  const value = block.type === 'table' ? block.rows.flat().join(' | ') : block.text;
  return value.replace(/\s+/g, ' ').slice(0, 140);
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function compactTitle(title: string) {
  return title.replace(/^MÓDULO\s+(\d+):\s*/i, '$1. ').replace(/^APÊNDICE\s+([A-Z]):\s*/i, 'Ap. $1 - ');
}

function sectionDigest(section: Section) {
  const source = section.blocks.find((block) => block.type !== 'heading1');
  if (!source) return `${section.blocks.length} blocos de estudo`;
  const text = source.type === 'table' ? source.rows.flat().join(' ') : source.text;
  return text.replace(/\s+/g, ' ').slice(0, 132);
}

function renderHighlighted(text: string, query: string) {
  const term = query.trim();
  if (!term) return text;

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function looksLikeCode(text: string) {
  return (
    text.includes('\n') &&
    (/^\s*(#|\$|sudo|air|hashcat|iw|ip|ping|grep|chmod|mkdir|cd)\b/im.test(text) || text.includes('```'))
  );
}

function isFieldNote(text: string) {
  return /escopo|autorizad|defesa|relat[óo]rio|evid[êe]ncia|mitiga|regra|aten[çc][ãa]o/i.test(text) && text.length < 420;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function defaultRendererConfigDiagnostics(renderer: RendererMode): RendererDiagnostics {
  return {
    requestedRenderer: renderer,
    activeRenderer: 'none',
    rendererLabel: 'Falha de inicialização',
    gpuName: 'Não detectada',
    driver: 'Não detectado',
    directXAvailable: false,
    openglAvailable: false,
    directXVersion: 'Indisponível',
    openglVersion: 'Indisponível',
    fpsAverage: 0,
    graphicsMemoryMB: null,
    hardwareAcceleration: false,
    initializationErrors: [],
    fallbackEvents: [],
    timestamp: Date.now(),
  };
}

export default App;
