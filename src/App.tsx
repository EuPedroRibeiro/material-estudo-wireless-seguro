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
  Network,
  Play,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Terminal,
  Wifi,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { studyModules, validateStudyModules, type StudyBlock, type StudyModule } from './data/studyModules';
import {
  defaultRendererConfig,
  initializeRenderer,
  rendererModeLabels,
  type RendererConfig,
  type RendererDiagnostics,
  type RendererMode,
} from './graphics';

type ContentBlock = StudyBlock;

type Section = {
  id: string;
  order: number;
  title: string;
  summary: string;
  objective: string;
  sources: string[];
  goals: string[];
  blocks: ContentBlock[];
  index: number;
};

type LabMode = (typeof labModes)[number]['key'];

type SearchResult = {
  id: string;
  section: Section;
  block?: ContentBlock;
  title: string;
  snippet: string;
  matchLabel: string;
};

validateStudyModules(studyModules);

const totalBlockCount = studyModules.reduce((total, module) => total + module.blocks.length, 0);
const storageKey = 'wireless-study-progress-v1';
const entrySeenKey = 'wireless-lab-drive-entry-seen';

const navItems = [
  { id: 'entry', label: 'Início' },
  { id: 'journey', label: 'Trilha' },
  { id: 'study', label: 'Estudo' },
  { id: 'lab', label: 'Laboratório' },
  { id: 'report', label: 'Relatório' },
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
  { key: 'handshake', label: 'Troca', icon: Radio },
  { key: 'defense', label: 'Defesa', icon: ShieldCheck },
] as const;

const heroRendererConfig: RendererConfig = {
  ...defaultRendererConfig,
  debugOverlay: false,
  fpsLimit: 45,
};

function App() {
  const sections = useMemo(() => buildSections(studyModules), []);
  const [activeSectionId, setActiveSectionId] = useState(() => sections[0]?.id ?? 'inicio');
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [completed, setCompleted] = useState<Set<string>>(() => readProgress());
  const [entrySeen, setEntrySeen] = useState(() => readEntrySeen());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [labMode, setLabMode] = useState<LabMode>('map');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const importantSections = sections;
  const moduleSections = sections;
  const reportSection =
    sections.find((section) => section.id === 'relatorio-tecnico-executivo') ??
    sections.find((section) => /relatório|relatorio/i.test(section.title)) ??
    activeSection;
  const journeySections = moduleSections;
  const completedCount = importantSections.filter((section) => completed.has(section.id)).length;
  const pendingSections = importantSections.filter((section) => !completed.has(section.id));
  const recentlyCompletedSections = importantSections.filter((section) => completed.has(section.id)).slice(-5);
  const progress = importantSections.length ? Math.round((completedCount / importantSections.length) * 100) : 0;
  const nextSection = importantSections.find((section) => !completed.has(section.id)) ?? activeSection;
  const activeJourneyIndex = Math.max(
    0,
    journeySections.findIndex((section) => section.id === activeSection.id),
  );

  const searchResults = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return buildSearchResults(sections, term);
  }, [query, sections]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
  }, [completed]);

  function chooseSection(id: string, scrollTarget = 'study') {
    setActiveSectionId(id);
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => scrollToSection(scrollTarget));
  }

  function enterLab() {
    saveEntrySeen();
    setEntrySeen(true);
    window.requestAnimationFrame(() => scrollToSection('hero'));
  }

  function replayEntry() {
    clearEntrySeen();
    setEntrySeen(false);
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => scrollToSection('entry'));
  }

  function handleHomeSelect() {
    setMobileMenuOpen(false);
    scrollToSection(entrySeen ? 'hero' : 'entry');
  }

  function openReviewMode() {
    setReviewOpen(true);
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => scrollToSection('review'));
  }

  function toggleDone(id: string) {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function jumpToResult(result: SearchResult) {
    setActiveSectionId(result.section.id);
    setMobileMenuOpen(false);
    window.setTimeout(() => {
      const target = result.block ? document.getElementById(result.block.id) : document.getElementById('study');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
        onFocusToggle={() => setFocusMode((value) => !value)}
        onHomeSelect={handleHomeSelect}
        onReplayEntry={replayEntry}
        onReviewOpen={openReviewMode}
        searchResults={searchResults}
        onResultSelect={jumpToResult}
        onQueryClear={() => setQuery('')}
        focusMode={focusMode}
      />

      {!entrySeen && <LoadingGate progress={progress} nextSection={nextSection} onEnter={enterLab} />}

      <HeroExperience
        progress={progress}
        moduleCount={moduleSections.length}
        blockCount={totalBlockCount}
        labMode={labMode}
        onStart={() => chooseSection(nextSection.id)}
      />

      <ExamReviewPanel
        open={reviewOpen}
        progress={progress}
        pendingSections={pendingSections}
        completedSections={recentlyCompletedSections}
        completedCount={completedCount}
        totalCount={importantSections.length}
        onClose={() => setReviewOpen(false)}
        onSelectSection={chooseSection}
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
  mobileOpen,
  onMobileOpenChange,
  onFocusToggle,
  onHomeSelect,
  onReplayEntry,
  onReviewOpen,
  searchResults,
  onResultSelect,
  onQueryClear,
  focusMode,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (value: boolean) => void;
  onFocusToggle: () => void;
  onHomeSelect: () => void;
  onReplayEntry: () => void;
  onReviewOpen: () => void;
  searchResults: SearchResult[];
  onResultSelect: (result: SearchResult) => void;
  onQueryClear: () => void;
  focusMode: boolean;
}) {
  return (
    <header className="study-nav">
      <div className="nav-pill">
        <button
          className="nav-menu-button"
          type="button"
          onClick={() => onMobileOpenChange(true)}
          aria-label="Abrir navegação"
        >
          <Menu size={18} />
        </button>
        <button className="brand-lockup" type="button" onClick={onHomeSelect} aria-label="Ir para o início">
          <span className="brand-symbol" aria-hidden="true">
            <HackerMark />
          </span>
        </button>

        <nav className={`nav-links ${mobileOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
          <button
            className="nav-close"
            type="button"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'entry') {
                  onHomeSelect();
                  return;
                }
                onMobileOpenChange(false);
                scrollToSection(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onMobileOpenChange(false);
              onReviewOpen();
            }}
          >
            Revisão
          </button>
        </nav>

        <div className="nav-right">
          <SearchPanel
            query={query}
            results={searchResults}
            onQueryChange={onQueryChange}
            onResultSelect={onResultSelect}
            onQueryClear={onQueryClear}
          />
          <button className="nav-text-button is-quiet" type="button" onClick={onReplayEntry}>
            <RotateCcw size={15} />
            <span>Abertura</span>
          </button>
          <button
            className={`nav-icon ${focusMode ? 'is-active' : ''}`}
            type="button"
            onClick={onFocusToggle}
            title="Modo foco"
            aria-label="Alternar modo foco"
          >
            <Eye size={17} />
          </button>
          <a
            className="nav-icon"
            href="/material_estudo_premium_wireless_seguro.docx"
            title="Baixar DOCX original"
            aria-label="Baixar DOCX original"
          >
            <Download size={17} />
          </a>
        </div>
      </div>
    </header>
  );
}

function SearchPanel({
  query,
  results,
  onQueryChange,
  onResultSelect,
  onQueryClear,
}: {
  query: string;
  results: SearchResult[];
  onQueryChange: (value: string) => void;
  onResultSelect: (result: SearchResult) => void;
  onQueryClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasQuery = query.trim().length > 0;
  const showResults = hasQuery && isOpen;

  return (
    <div className="search-shell">
      <label className="global-search">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => {
            setIsOpen(true);
            onQueryChange(event.target.value);
          }}
          onFocus={() => {
            if (hasQuery) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
          }}
          placeholder="Buscar no material"
          aria-label="Buscar no material"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onQueryClear();
            }}
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </label>

      {showResults && (
        <section className="search-results" aria-label="Resultados de busca">
          <div className="search-results-head">
            <p className="kicker">Busca</p>
            <strong>{results.length ? `${results.length} resultado(s)` : 'Nenhum resultado encontrado.'}</strong>
          </div>
          <div className="result-list">
            {results.map((result, index) => (
              <button
                className="search-result"
                key={`${result.id}-${index}`}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onResultSelect(result);
                }}
              >
                <span>{result.matchLabel}</span>
                <strong>{result.title}</strong>
                <small>{renderHighlighted(result.snippet, query)}</small>
              </button>
            ))}
            {!results.length && <p className="search-empty">Nenhum resultado encontrado.</p>}
          </div>
        </section>
      )}
    </div>
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
  const reveal = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={reveal.ref}
      className={`loading-gate reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`}
      id="entry"
      aria-label="Entrada do laboratório"
    >
      <div className="gate-frame">
        <p className="kicker">Modo laboratório autorizado</p>
        <h1>Iniciar laboratório</h1>
        <p>
          Inicializando uma jornada de estudo técnico: fundamentos, rede viva, análise, defesa e relatório final em
          ambiente controlado.
        </p>
        <div className="gate-console" aria-label="Status de inicialização">
          <span>estudo / pronto</span>
          <span>escopo autorizado</span>
          <span>progresso / {progress}%</span>
        </div>
      </div>
      <button className="enter-drive" type="button" onClick={onEnter} aria-label="Entrar no laboratório">
        <Play size={18} />
        <span>Entrar no laboratório</span>
        <small aria-hidden="true">{compactTitle(nextSection.title)}</small>
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
  const reveal = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={reveal.ref}
      className={`hero-experience reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`}
      id="hero"
    >
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
          <span>Laboratório wireless</span>
          <strong>Acesso autorizado</strong>
        </div>
        <SignalCanvas mode={labMode} config={heroRendererConfig} />
        <div className="hero-metrics" id="progress">
          <MetricBlock label="Módulos" value={moduleCount} />
          <MetricBlock label="Blocos" value={blockCount} />
          <MetricBlock label="Progresso" value={`${progress}%`} />
          <MetricBlock label="Modo" value="Autorizado" />
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

function HackerMark() {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Ícone do laboratório">
      <circle cx="24" cy="24" r="22" fill="#050505" />
      <path
        d="M14 21c1.8-7 6.3-11 10-11s8.2 4 10 11l-2.2 13c-.3 1.8-1.8 3-3.6 3h-8.4c-1.8 0-3.3-1.2-3.6-3L14 21Z"
        fill="#f5f5f0"
      />
      <path d="M17 22h14l-3.4-7.6H20.4L17 22Z" fill="#050505" />
      <path d="M17.5 27.5h13M20 32h8" stroke="#050505" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M34 12l2.8 2.8M36.8 12L34 14.8" stroke="#ff1f2d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExamReviewPanel({
  open,
  progress,
  pendingSections,
  completedSections,
  completedCount,
  totalCount,
  onClose,
  onSelectSection,
}: {
  open: boolean;
  progress: number;
  pendingSections: Section[];
  completedSections: Section[];
  completedCount: number;
  totalCount: number;
  onClose: () => void;
  onSelectSection: (id: string, scrollTarget?: string) => void;
}) {
  const reveal = useScrollReveal<HTMLElement>();
  const focusSection = pendingSections[0] ?? completedSections[completedSections.length - 1];
  const pendingToday = Math.min(3, pendingSections.length);
  const reviewGoals = (focusSection?.goals.length ? focusSection.goals : studyModules[0]?.goals ?? []).slice(0, 3);
  const focusBlocks = focusSection?.blocks.slice(0, 3) ?? [];

  if (!open) return null;

  return (
    <section
      ref={reveal.ref}
      className={`exam-review-panel reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`}
      id="review"
      aria-label="Revisão de prova"
    >
      <div className="review-copy">
        <p className="kicker">Revisão de prova</p>
        <h2>Plano de foco para a próxima sessão.</h2>
        <p>
          Um resumo limpo do que falta, do que já foi marcado e do melhor próximo passo para manter o estudo técnico em
          ritmo de prova.
        </p>
      </div>

      <div className="review-dashboard">
        <div className="review-summary">
          <MetricBlock label="Progresso" value={`${progress}%`} />
          <MetricBlock label="Pendentes" value={pendingSections.length} />
          <MetricBlock label="Concluídos" value={completedCount} />
        </div>

        <div className="review-focus">
          <span>Foco sugerido</span>
          <strong>{focusSection ? compactTitle(focusSection.title) : 'Relatório de aprendizado'}</strong>
          <p>{focusSection ? sectionDigest(focusSection) : 'Tudo marcado. Use o relatório final para consolidar.'}</p>
          {focusSection && (
            <button type="button" onClick={() => onSelectSection(focusSection.id)}>
              <Play size={16} />
              Abrir foco
            </button>
          )}
        </div>

        <div className="review-checklist">
          <div className="panel-title">
            <div>
          <p className="kicker">Meta diária</p>
              <h3>{pendingToday ? `${pendingToday} módulos em foco` : 'Revisão fechada'}</h3>
            </div>
            <ListChecks size={18} />
          </div>
          {reviewGoals.map((goal, index) => (
            <span key={goal} className={progress >= (index + 1) * 30 ? 'is-done' : ''}>
              <Check size={15} />
              {goal}
            </span>
          ))}
          {focusBlocks.map((block) => (
            <span key={block.id}>
              <Check size={15} />
              {block.title}
            </span>
          ))}
        </div>

        <div className="review-lists">
          <div>
            <span>Pendentes</span>
            {pendingSections.slice(0, 5).map((section) => (
              <button key={section.id} type="button" onClick={() => onSelectSection(section.id)}>
                {compactTitle(section.title)}
              </button>
            ))}
            {!pendingSections.length && <em>Nenhum bloco pendente.</em>}
          </div>
          <div>
            <span>Concluídos recentes</span>
            {completedSections.map((section) => (
              <button key={section.id} type="button" onClick={() => onSelectSection(section.id)}>
                {compactTitle(section.title)}
              </button>
            ))}
            {!completedSections.length && <em>Marque um módulo para criar histórico.</em>}
          </div>
        </div>

        <button className="review-close" type="button" onClick={onClose}>
          <X size={16} />
          Fechar revisão
        </button>
      </div>
    </section>
  );
}

function StoryChapters({
  moduleSections,
  onSelectSection,
}: {
  moduleSections: Section[];
  onSelectSection: (id: string, scrollTarget?: string) => void;
}) {
  const reveal = useScrollReveal<HTMLElement>();
  const chapters = moduleSections.slice(0, 4).map((section) => ({
    title: section.title,
    text: section.summary,
    section,
    icon: iconForSection(section),
  }));

  return (
    <section
      ref={reveal.ref}
      className={`story-chapters reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`}
      aria-label="Capítulos narrativos"
    >
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
            <strong>{compactTitle(chapter.title)}</strong>
            <p>{chapter.text}</p>
          </button>
        );
      })}
    </section>
  );
}

function iconForSection(section: Section) {
  const text = normalize(`${section.title} ${section.summary}`);
  if (text.includes('wireless') || text.includes('wi-fi')) return Wifi;
  if (text.includes('rede') || text.includes('tcp')) return Network;
  if (text.includes('relatorio')) return FileText;
  if (text.includes('defesa') || text.includes('escopo')) return ShieldCheck;
  if (text.includes('web') || text.includes('metodologia')) return Activity;
  return BookOpen;
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
  const reveal = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={reveal.ref}
      className={`module-journey reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`}
      id="journey"
    >
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
            key={`${section.id}-${index}`}
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
      <span className="module-index">{String(section.order).padStart(2, '0')}</span>
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
  const reveal = useScrollReveal<HTMLElement>();

  return (
    <article ref={reveal.ref} className={`study-reader reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`}>
      <div className="reader-toolbar">
        <div>
          <p className="kicker">Modo estudo ativo</p>
          <h2>{renderHighlighted(activeSection.title, query)}</h2>
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
            <option key={`${section.id}-${section.index}`} value={section.id}>
              {String(section.order).padStart(2, '0')} - {compactTitle(section.title)}
            </option>
          ))}
        </select>
        <span>{activeSection.blocks.length} blocos neste capítulo</span>
      </div>

      <div className="reader-lead">
        <span>Nota de campo</span>
        <p>{renderHighlighted(activeSection.summary, query)}</p>
        <small>{renderHighlighted(activeSection.objective, query)}</small>
        <div className="reader-tags">
          {activeSection.sources.map((source) => (
            <em key={source}>{renderHighlighted(source, query)}</em>
          ))}
        </div>
      </div>

      <div className="content-stream">
        {activeSection.blocks.map((block, index) => (
          <ContentBlockView key={`${block.id}-${index}`} block={block} query={query} />
        ))}
      </div>
    </article>
  );
}

function LabPanel({ mode, onModeChange }: { mode: LabMode; onModeChange: (mode: LabMode) => void }) {
  const [rendererConfig, setRendererConfig] = useState<RendererConfig>(defaultRendererConfig);
  const [diagnostics, setDiagnostics] = useState<RendererDiagnostics | null>(null);
  const reveal = useScrollReveal<HTMLElement>();

  function updateRendererConfig(update: Partial<RendererConfig>) {
    setRendererConfig((current) => ({ ...current, ...update }));
  }

  return (
    <aside ref={reveal.ref} className={`lab-panel reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`} id="lab">
      <div className="lab-panel-head">
        <p className="kicker">Painel de laboratório</p>
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
          <span>Renderizador</span>
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
            <span>Sincronização</span>
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
            <span>Diagnóstico</span>
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
        <strong>{diagnostics?.rendererLabel ?? 'Inicializando renderizador'}</strong>
      </div>
      <dl>
        <div>
          <dt>Ativo</dt>
          <dd>{activeRendererLabel(diagnostics?.activeRenderer)}</dd>
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
  const [history, setHistory] = useState<string[]>(['escopo validado', 'modo evidência pronto']);
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
          <h3>Cartões de memória</h3>
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
  const sourceCount = new Set(studyModules.flatMap((module) => module.sources)).size;

  return (
    <section className="integrity-panel">
      <div className="panel-title">
        <div>
          <p className="kicker">Integridade</p>
          <h3>Fonte única ativa</h3>
        </div>
        <ShieldCheck size={18} />
      </div>
      <dl>
        <div>
          <dt>Módulos</dt>
          <dd>{studyModules.length}</dd>
        </div>
        <div>
          <dt>Blocos</dt>
          <dd>{totalBlockCount}</dd>
        </div>
        <div>
          <dt>Fontes</dt>
          <dd>{sourceCount}</dd>
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
  const reveal = useScrollReveal<HTMLElement>();
  const reportSources = Array.from(new Set(studyModules.flatMap((module) => module.sources))).slice(0, 6);
  const reportGoals = reportSection.goals.slice(0, 3);

  return (
    <section
      ref={reveal.ref}
      className={`report-section reveal-on-scroll ${reveal.isVisible ? 'is-visible' : ''}`}
      id="report"
    >
      <div>
        <p className="kicker">Relatório de aprendizado</p>
        <h2>Transforme estudo em entrega clara.</h2>
        <p>{reportSection.summary}</p>
        <div className="report-data-list">
          {reportGoals.map((goal) => (
            <span key={goal}>{goal}</span>
          ))}
          {reportSources.map((source) => (
            <span key={source}>{source}</span>
          ))}
        </div>
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
  return (
    <article className={`study-block study-block-${block.type}`} id={block.id}>
      <div className="reader-heading">
        {blockIcon(block.type)}
        <div>
          <span>{blockTypeLabel(block.type)}</span>
          <h3>{renderHighlighted(block.title, query)}</h3>
        </div>
      </div>

      {block.content && <p className="paragraph-block">{renderHighlighted(block.content, query)}</p>}

      {block.items?.length ? (
        <div className="checklist-items">
          {block.items.map((item, index) => (
            <div className="list-block" key={`${block.id}-item-${index}`}>
              <Check size={16} />
              <p>{renderHighlighted(item, query)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function blockIcon(type: ContentBlock['type']) {
  if (type === 'checklist' || type === 'revisao') return <ListChecks size={22} />;
  if (type === 'relatorio') return <FileText size={22} />;
  if (type === 'fonte') return <BookOpen size={22} />;
  if (type === 'alerta') return <ShieldCheck size={22} />;
  if (type === 'meta-diaria') return <BadgeCheck size={22} />;
  return <Flame size={22} />;
}

function blockTypeLabel(type: ContentBlock['type']) {
  const labels: Record<ContentBlock['type'], string> = {
    conceito: 'Conceito',
    'nota-de-campo': 'Nota de campo',
    checklist: 'Checklist',
    comparacao: 'Comparação',
    metodologia: 'Metodologia',
    relatorio: 'Relatório',
    revisao: 'Revisão',
    'meta-diaria': 'Meta diária',
    fonte: 'Fonte conceitual',
    alerta: 'Alerta técnico',
    resumo: 'Resumo',
  };
  return labels[type];
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

function buildSections(modules: StudyModule[]): Section[] {
  return [...modules]
    .sort((a, b) => a.order - b.order)
    .map((module, index) => ({
      id: module.id,
      order: module.order,
      title: module.title,
      summary: module.summary,
      objective: module.objective,
      sources: module.sources,
      goals: module.goals,
      blocks: module.blocks,
      index: index + 1,
    }));
}

function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.16 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
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

function readEntrySeen() {
  try {
    return localStorage.getItem(entrySeenKey) === 'true';
  } catch {
    return false;
  }
}

function saveEntrySeen() {
  try {
    localStorage.setItem(entrySeenKey, 'true');
  } catch {
    // Não crítico: a entrada ainda funciona na sessão atual.
  }
}

function clearEntrySeen() {
  try {
    localStorage.removeItem(entrySeenKey);
  } catch {
    // Não crítico: afeta apenas a persistência da abertura.
  }
}

function buildSearchResults(sections: Section[], term: string): SearchResult[] {
  const normalizedTerm = normalize(term);
  const results: Array<SearchResult & { score: number }> = [];

  sections.forEach((section) => {
    const moduleFields = [
      { value: section.title, score: 60 },
      { value: section.summary, score: 40 },
      { value: section.objective, score: 32 },
      { value: section.goals.join(' '), score: 22 },
      { value: section.sources.join(' '), score: 12 },
    ];
    const moduleText = moduleFields.map((field) => field.value).join(' ');
    const moduleScore = moduleFields.reduce(
      (score, field) => (normalize(field.value).includes(normalizedTerm) ? Math.max(score, field.score) : score),
      0,
    );

    if (moduleScore) {
      results.push({
        id: `${section.id}-title`,
        section,
        title: compactTitle(section.title),
        snippet: searchSnippet(moduleText, term),
        matchLabel: 'Módulo',
        score: moduleScore,
      });
    }

    section.blocks.forEach((block) => {
      const text = blockText(block);
      const blockScore = blockSearchScore(block, normalizedTerm);
      if (!blockScore) return;
      results.push({
        id: block.id,
        section,
        block,
        title: compactTitle(section.title),
        snippet: searchSnippet(text, term),
        matchLabel: blockTypeLabel(block.type),
        score: blockScore,
      });
    });
  });

  return results
    .sort((a, b) => b.score - a.score || a.section.order - b.section.order)
    .slice(0, 12)
    .map(({ score, ...result }) => result);
}

function blockText(block: ContentBlock) {
  return [block.title, block.type, block.content, ...(block.items ?? [])].filter(Boolean).join(' ');
}

function blockSearchScore(block: ContentBlock, normalizedTerm: string) {
  if (normalize(block.title).includes(normalizedTerm)) return 48;
  if (normalize(block.content ?? '').includes(normalizedTerm)) return 24;
  if (normalize((block.items ?? []).join(' ')).includes(normalizedTerm)) return 20;
  if (normalize(block.type).includes(normalizedTerm)) return 10;
  return 0;
}

function searchSnippet(text: string, term: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const index = normalize(clean).indexOf(normalize(term));
  if (index < 0) return clean.slice(0, 170);
  const start = Math.max(0, index - 58);
  const end = Math.min(clean.length, index + term.length + 110);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';
  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function compactTitle(title: string) {
  return title
    .replace(/^MÓDULO\s+(\d+):\s*/i, '')
    .replace(/^APÊNDICE\s+([A-Z]):\s*/i, '')
    .replace(/^\s*\d+\s*[\.\-)]\s*/, '')
    .trim();
}

function sectionDigest(section: Section) {
  return (section.summary || section.objective || `${section.blocks.length} blocos de estudo`)
    .replace(/\s+/g, ' ')
    .slice(0, 168);
}

function renderHighlighted(text: string, query: string) {
  const term = query.trim();
  if (!term) return text;

  const haystack = normalizedWithMap(text);
  const needle = normalize(term);
  if (!needle) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let searchFrom = 0;
  let partIndex = 0;

  while (searchFrom < haystack.value.length) {
    const matchIndex = haystack.value.indexOf(needle, searchFrom);
    if (matchIndex < 0) break;

    const start = haystack.map[matchIndex] ?? 0;
    const end = haystack.map[matchIndex + needle.length] ?? text.length;

    if (start > cursor) {
      parts.push(<span key={`t-${partIndex++}`}>{text.slice(cursor, start)}</span>);
    }

    parts.push(<mark key={`m-${partIndex++}`}>{text.slice(start, end)}</mark>);
    cursor = end;
    searchFrom = matchIndex + needle.length;
  }

  if (!parts.length) return text;
  if (cursor < text.length) {
    parts.push(<span key={`t-${partIndex}`}>{text.slice(cursor)}</span>);
  }

  return parts;
}

function normalizedWithMap(value: string) {
  let normalizedValue = '';
  const map: number[] = [];

  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) break;

    const char = String.fromCodePoint(codePoint);
    const folded = normalize(char);
    for (const foldedChar of folded) {
      normalizedValue += foldedChar;
      map.push(index);
    }
    index += char.length;
  }

  map.push(value.length);
  return { value: normalizedValue, map };
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function activeRendererLabel(renderer?: RendererDiagnostics['activeRenderer']) {
  if (!renderer || renderer === 'none') return 'nenhum';
  if (renderer === 'software') return 'fallback';
  return renderer;
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
