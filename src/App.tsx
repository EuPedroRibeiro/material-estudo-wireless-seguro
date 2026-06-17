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

const data = material as MaterialData;
const storageKey = 'wireless-study-progress-v1';

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
  const [labMode, setLabMode] = useState<(typeof labModes)[number]['key']>('map');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const importantSections = sections.filter((section) =>
    /^(MÓDULO|APÊNDICE|Modelo de Relatório)/i.test(section.title),
  );
  const completedCount = importantSections.filter((section) => completed.has(section.id)).length;
  const progress = importantSections.length
    ? Math.round((completedCount / importantSections.length) * 100)
    : 0;
  const moduleSections = importantSections.filter((section) => /^MÓDULO/i.test(section.title));
  const appendixSections = importantSections.filter((section) => /^APÊNDICE|Modelo de Relatório/i.test(section.title));
  const reportSection = appendixSections.find((section) => /Modelo de Relatório/i.test(section.title)) ?? appendixSections[0];
  const journeySections = [...moduleSections, ...(reportSection ? [reportSection] : [])];
  const activeJourneyIndex = Math.max(
    0,
    journeySections.findIndex((section) => section.id === activeSection.id),
  );
  const nextSection = importantSections.find((section) => !completed.has(section.id)) ?? activeSection;
  const nextJourneySection =
    journeySections.find((section) => !completed.has(section.id) && section.id !== activeSection.id) ??
    reportSection ??
    activeSection;
  const currentReaderSummary = sectionDigest(activeSection);

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
      .slice(0, 12);
  }, [blockToSection, query]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
  }, [completed]);

  function chooseSection(id: string) {
    setActiveSectionId(id);
    setSidebarOpen(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
    setSidebarOpen(false);
    window.setTimeout(() => {
      document.getElementById(block.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  return (
    <main
      className={`app-shell ${focusMode ? 'is-focus' : ''}`}
      style={{ '--reader-scale': fontScale } as React.CSSProperties}
    >
      <header className="topbar">
        <button
          className="icon-button mobile-trail-button"
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir trilha de estudo"
        >
          <ListChecks size={18} />
        </button>
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Wifi size={22} />
          </div>
          <div>
            <p className="eyebrow">Academia Wireless</p>
            <h1>Wireless Lab OS</h1>
            <p>{data.metadata.title}</p>
          </div>
        </div>

        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no material"
            aria-label="Buscar no material"
          />
        </label>

        <div className="top-actions">
          <button className="top-pill" type="button" onClick={() => chooseSection(nextSection.id)}>
            <Play size={16} />
            <span>{completed.has(nextSection.id) ? 'Revisar' : 'Continuar'}</span>
          </button>
          <button
            className={`icon-button ${focusMode ? 'is-active' : ''}`}
            onClick={() => setFocusMode((value) => !value)}
            title="Modo foco"
            type="button"
          >
            <Eye size={18} />
          </button>
          <a
            className="icon-button"
            href="/material_estudo_premium_wireless_seguro.docx"
            title="Baixar DOCX original"
          >
            <Download size={18} />
          </a>
        </div>
      </header>

      {query.trim() && (
        <section className="search-results" aria-label="Resultados de busca">
          <div>
            <p className="eyebrow">Resultados</p>
            <strong>{searchResults.length ? `${searchResults.length} primeiros achados` : 'Nada encontrado'}</strong>
          </div>
          <div className="result-list">
            {searchResults.map(({ block, section }) => (
              <button key={block.id} type="button" onClick={() => jumpToResult(block, section)}>
                <span>{section.title}</span>
                <small>{blockPreview(block)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="academy-hero os-hero">
        <div className="hero-copy">
          <div className="academy-badge">
            <ShieldCheck size={16} />
            <span>Lab autorizado | defesa | relatório</span>
          </div>
          <h2>Segurança Wireless em modo laboratório autorizado</h2>
          <p>
            Uma mesa de comando para estudar fundamentos, rádio, ferramentas, defesa, prova e relatório
            sem perder o escopo ético: tudo organizado para prática responsável e leitura confortável.
          </p>
          <div className="hero-proof-grid" aria-label="Indicadores do material">
            <div>
              <strong>{moduleSections.length}</strong>
              <span>módulos</span>
            </div>
            <div>
              <strong>{data.metadata.blockCount}</strong>
              <span>blocos</span>
            </div>
            <div>
              <strong>{progress}%</strong>
              <span>progresso</span>
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={() => chooseSection(nextSection.id)}>
              <Play size={17} />
              <span>{completed.has(nextSection.id) ? 'Revisar trilha' : 'Continuar estudo'}</span>
            </button>
            <a href="/material_estudo_premium_wireless_seguro.docx">
              <Download size={17} />
              <span>DOCX original</span>
            </a>
          </div>
        </div>

        <div className="hero-stage">
          <div className="hero-stage-head">
            <span>wireless lab mesh</span>
            <span>authorized only</span>
          </div>
          <SignalCanvas mode={labMode} config={heroRendererConfig} />
          <div className="hero-terminal">
            <code>$ scope --check wireless-lab --evidence clean</code>
            <span>escopo validado | evidência limpa | mitigação documentada</span>
          </div>
        </div>
      </section>

      <section className="academy-metrics">
        <div className="mission-stat">
          <Activity size={18} />
          <strong>{progress}%</strong>
          <span>concluído</span>
        </div>
        <div className="progress-track" aria-label={`Progresso ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="mission-stat">
          <FileText size={18} />
          <strong>{data.metadata.blockCount}</strong>
          <span>blocos preservados</span>
        </div>
        <div className="mission-stat">
          <MonitorSmartphone size={18} />
          <strong>3 telas</strong>
          <span>PC, notebook e celular</span>
        </div>
      </section>

      <section className="journey-shell" aria-label="Mapa da jornada">
        <div className="journey-heading">
          <div>
            <p className="eyebrow">Mapa de progresso</p>
            <h2>Da base ao relatório premium</h2>
          </div>
          <p>
            Avance como uma trilha: fundamentos, redes, Wi-Fi, laboratório, prova e entrega profissional.
          </p>
        </div>
        <div className="journey-map" style={{ '--steps': journeySections.length } as React.CSSProperties}>
          {journeySections.map((section, index) => {
            const isActive = section.id === activeSection.id;
            const isDone = completed.has(section.id);
            const isReport = section.id === reportSection?.id;
            const stateClass = isActive
              ? 'is-current'
              : isDone
                ? 'is-complete'
                : index <= activeJourneyIndex + 1
                  ? 'is-next'
                  : 'is-locked';
            const stateLabel = isDone
              ? 'concluído'
              : isActive
                ? 'em estudo'
                : isReport
                  ? 'entrega final'
                  : index === activeJourneyIndex + 1
                    ? 'próximo'
                    : 'em espera';

            return (
              <button
                key={section.id}
                type="button"
                className={`journey-node ${stateClass} ${isReport ? 'is-report' : ''}`}
                onClick={() => chooseSection(section.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="node-orb">
                  {isDone ? <Check size={15} /> : isReport ? <FileText size={15} /> : String(index + 1).padStart(2, '0')}
                </span>
                <span className="node-content">
                  <strong>{compactTitle(section.title)}</strong>
                  <small>{sectionDigest(section)}</small>
                </span>
                <span className="node-meta">{stateLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="main-grid">
        <div
          className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="sidebar-head">
            <div>
              <p className="eyebrow">Trilha</p>
              <h3>Command Center</h3>
            </div>
            <div className="sidebar-actions">
              <button
                className="icon-button small mobile-close"
                type="button"
                title="Fechar trilha"
                onClick={() => setSidebarOpen(false)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-button small"
                type="button"
                title="Resetar progresso"
                onClick={() => setCompleted(new Set())}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
          <div className="sidebar-dashboard">
            <div className="progress-dial" style={{ '--value': `${progress}%` } as React.CSSProperties}>
              <strong>{progress}%</strong>
              <span>feito</span>
            </div>
            <div className="sidebar-now">
              <span>Agora</span>
              <strong>{compactTitle(activeSection.title)}</strong>
              <small>{currentReaderSummary}</small>
            </div>
          </div>
          <div className="next-card">
            <p className="eyebrow">Próximo passo</p>
            <button type="button" onClick={() => chooseSection(nextJourneySection.id)}>
              <Zap size={15} />
              <span>{compactTitle(nextJourneySection.title)}</span>
            </button>
          </div>
          <nav className="section-nav" aria-label="Seções do material">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={section.id === activeSection.id ? 'is-active' : ''}
                onClick={() => chooseSection(section.id)}
              >
                <span className="nav-index">{String(section.index).padStart(2, '0')}</span>
                <span>{compactTitle(section.title)}</span>
                {completed.has(section.id) && <Check size={14} />}
              </button>
            ))}
          </nav>
        </aside>

        <section className="reader-area">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">Agora estudando</p>
              <h2>{activeSection.title}</h2>
            </div>
            <div className="reader-controls">
              <label>
                <BookOpen size={16} />
                <input
                  type="range"
                  min="0.9"
                  max="1.18"
                  step="0.02"
                  value={fontScale}
                  onChange={(event) => setFontScale(Number(event.target.value))}
                  aria-label="Tamanho do texto"
                />
              </label>
              <button
                className={`complete-button ${completed.has(activeSection.id) ? 'is-done' : ''}`}
                type="button"
                onClick={() => toggleDone(activeSection.id)}
              >
                <BadgeCheck size={18} />
                <span>{completed.has(activeSection.id) ? 'Concluído' : 'Marcar'}</span>
              </button>
            </div>
          </div>

          <div className="content-stream">
            {activeSection.blocks.map((block) => (
              <ContentBlockView key={block.id} block={block} query={query} />
            ))}
          </div>
        </section>

        <aside className="right-rail">
          <LiveLab mode={labMode} onModeChange={setLabMode} />
          <CommandLab />
          <FlashcardDeck />
          <LayerStack />
          <IntegrityPanel />
        </aside>
      </div>
    </main>
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
  const haystack =
    block.type === 'table' ? block.rows.flat().join(' ') : block.text;
  return normalize(haystack).includes(normalize(term));
}

function blockPreview(block: ContentBlock) {
  const value = block.type === 'table' ? block.rows.flat().join(' | ') : block.text;
  return value.replace(/\s+/g, ' ').slice(0, 130);
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function compactTitle(title: string) {
  return title
    .replace(/^MÓDULO\s+(\d+):\s*/i, '$1. ')
    .replace(/^APÊNDICE\s+([A-Z]):\s*/i, 'Ap. $1 - ');
}

function sectionDigest(section: Section) {
  const source = section.blocks.find((block) => block.type !== 'heading1');
  if (!source) return `${section.blocks.length} blocos de estudo`;
  const text = source.type === 'table' ? source.rows.flat().join(' ') : source.text;
  return text.replace(/\s+/g, ' ').slice(0, 118);
}

function ContentBlockView({ block, query }: { block: ContentBlock; query: string }) {
  if (block.type === 'table') {
    if (block.rows.length === 1 && block.rows[0].length === 1) {
      return (
        <article className="callout-block" id={block.id}>
          <Sparkles size={18} />
          <p>{renderHighlighted(block.rows[0][0], query)}</p>
        </article>
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
                  <td key={`${block.id}-c-${rowIndex}-${cellIndex}`}>
                    {renderHighlighted(cell, query)}
                  </td>
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
        <span aria-hidden="true" />
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

  return (
    <p className="paragraph-block" id={block.id}>
      {renderHighlighted(block.text, query)}
    </p>
  );
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
    (/^\s*(#|\$|sudo|air|hashcat|iw|ip|ping|grep|chmod|mkdir|cd)\b/im.test(text) ||
      text.includes('```'))
  );
}

function LiveLab({
  mode,
  onModeChange,
}: {
  mode: (typeof labModes)[number]['key'];
  onModeChange: (mode: (typeof labModes)[number]['key']) => void;
}) {
  const [rendererConfig, setRendererConfig] = useState<RendererConfig>(defaultRendererConfig);
  const [diagnostics, setDiagnostics] = useState<RendererDiagnostics | null>(null);

  function updateRendererConfig(update: Partial<RendererConfig>) {
    setRendererConfig((current) => ({ ...current, ...update }));
  }

  return (
    <section className="tool-panel live-lab">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Simulação</p>
          <h3>Rede viva</h3>
        </div>
        <Zap size={18} />
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
      <div className="renderer-config" aria-label="Configuração gráfica">
        <label>
          <span>Renderer</span>
          <select
            value={rendererConfig.renderer}
            onChange={(event) => updateRendererConfig({ renderer: event.target.value as RendererMode })}
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
            value={rendererConfig.fpsLimit}
            onChange={(event) => updateRendererConfig({ fpsLimit: Number(event.target.value) || 60 })}
            aria-label="Limite de FPS"
          />
        </label>
        <div className="renderer-toggles">
          <label>
            <input
              type="checkbox"
              checked={rendererConfig.vsync}
              onChange={(event) => updateRendererConfig({ vsync: event.target.checked })}
            />
            <span>VSync</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={rendererConfig.useHardwareAcceleration}
              onChange={(event) => updateRendererConfig({ useHardwareAcceleration: event.target.checked })}
            />
            <span>GPU</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={rendererConfig.debugOverlay}
              onChange={(event) => updateRendererConfig({ debugOverlay: event.target.checked })}
            />
            <span>Debug</span>
          </label>
        </div>
      </div>
      {rendererConfig.debugOverlay && (
        <RendererDiagnosticsPanel diagnostics={diagnostics} config={rendererConfig} />
      )}
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
  const active = diagnostics?.activeRenderer ?? 'none';
  const errors = diagnostics?.initializationErrors ?? [];
  const fallbacks = diagnostics?.fallbackEvents ?? [];

  return (
    <div className="renderer-diagnostics" aria-label="Diagnóstico gráfico">
      <div className="renderer-diagnostics-head">
        <span>{rendererModeLabels[config.renderer]}</span>
        <strong>{diagnostics?.rendererLabel ?? 'Inicializando renderer'}</strong>
      </div>
      <dl>
        <div>
          <dt>Ativo</dt>
          <dd>{active}</dd>
        </div>
        <div>
          <dt>GPU</dt>
          <dd>{diagnostics?.gpuName ?? 'detectando'}</dd>
        </div>
        <div>
          <dt>Driver</dt>
          <dd>{diagnostics?.driver ?? 'detectando'}</dd>
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
      {[...fallbacks, ...errors].slice(-3).map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
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
          // The factory should always reach software mode; this catches unexpected browser failures.
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

function CommandLab() {
  const [activeCommand, setActiveCommand] = useState(commandBank[0]);
  const [typed, setTyped] = useState('ip a');
  const matched = commandBank.find((item) => typed.trim().startsWith(item.command));
  const displayCommand = matched ?? activeCommand;

  return (
    <section className="tool-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Terminal</p>
          <h3>Treino mental</h3>
        </div>
        <Terminal size={18} />
      </div>
      <div className="command-grid">
        {commandBank.map((item) => (
          <button
            key={item.command}
            type="button"
            className={activeCommand.command === item.command ? 'is-active' : ''}
            onClick={() => {
              setActiveCommand(item);
              setTyped(item.command);
            }}
          >
            {item.command}
          </button>
        ))}
      </div>
      <div className="terminal-box">
        <label>
          <span>$</span>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-label="Comando de treino"
          />
        </label>
        <p>{displayCommand.response}</p>
        <small>{displayCommand.label}</small>
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
    <section className="tool-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Memória</p>
          <h3>Flashcards</h3>
        </div>
        <Layers3 size={18} />
      </div>
      <button className={`flashcard ${revealed ? 'is-revealed' : ''}`} onClick={() => setRevealed((v) => !v)}>
        <strong>{card.front}</strong>
        <span>{revealed ? card.back : '...'}</span>
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
    <section className="tool-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Modelo mental</p>
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
    <section className="tool-panel integrity-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Integridade</p>
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

export default App;
