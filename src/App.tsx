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

function App() {
  const sections = useMemo(() => buildSections(data.blocks), []);
  const [activeSectionId, setActiveSectionId] = useState(() => sections[0]?.id ?? 'inicio');
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [completed, setCompleted] = useState<Set<string>>(() => readProgress());
  const [labMode, setLabMode] = useState<(typeof labModes)[number]['key']>('map');

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
  const nextSection = importantSections.find((section) => !completed.has(section.id)) ?? activeSection;

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
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Wifi size={22} />
          </div>
          <div>
            <p className="eyebrow">Laboratório autorizado</p>
            <h1>{data.metadata.title}</h1>
            <p>{data.metadata.subtitle}</p>
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

      <section className="academy-hero">
        <div className="hero-copy">
          <div className="academy-badge">
            <ShieldCheck size={16} />
            <span>SYWP lab book</span>
          </div>
          <h2>Segurança Wireless do zero ao relatório profissional</h2>
          <p>
            Uma trilha de estudo com cara de formação prática: base, rádio, ferramentas,
            defesa, prova e relatório sem sair do escopo autorizado.
          </p>
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
            <span>live scan</span>
            <span>authorized only</span>
          </div>
          <SignalCanvas mode={labMode} />
          <div className="hero-terminal">
            <code>$ scope --check lab-wireless</code>
            <span>escopo validado | evidência limpa | mitigação obrigatória</span>
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

      <section className="course-strip" aria-label="Trilhas de formação">
        {moduleSections.slice(0, 6).map((section) => (
          <button
            key={section.id}
            type="button"
            className={section.id === activeSection.id ? 'is-active' : ''}
            onClick={() => chooseSection(section.id)}
          >
            <span>{String(section.index).padStart(2, '0')}</span>
            <strong>{compactTitle(section.title)}</strong>
            <small>{completed.has(section.id) ? 'concluído' : `${section.blocks.length} blocos`}</small>
          </button>
        ))}
        <button type="button" className="course-card-report" onClick={() => chooseSection(reportSection?.id ?? activeSection.id)}>
          <span>final</span>
          <strong>Cheat sheet + relatório</strong>
          <small>entrega profissional</small>
        </button>
      </section>

      <div className="main-grid">
        <aside className="sidebar">
          <div className="sidebar-head">
            <p className="eyebrow">Trilha</p>
            <button
              className="icon-button small"
              type="button"
              title="Resetar progresso"
              onClick={() => setCompleted(new Set())}
            >
              <RotateCcw size={16} />
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
  return (
    <section className="tool-panel live-lab">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Simulação</p>
          <h3>Rede viva</h3>
        </div>
        <Zap size={18} />
      </div>
      <SignalCanvas mode={mode} />
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
    </section>
  );
}

function SignalCanvas({ mode }: { mode: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let frame = 0;
    let raf = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#11130f';
      context.fillRect(0, 0, width, height);

      const nodes = [
        { x: width * 0.18, y: height * 0.68, label: 'STA', color: '#4cc9f0' },
        { x: width * 0.5, y: height * 0.35, label: 'AP', color: '#35e08f' },
        { x: width * 0.82, y: height * 0.68, label: 'DEF', color: '#ffd166' },
      ];

      context.strokeStyle = 'rgba(245, 242, 232, 0.12)';
      context.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          context.beginPath();
          context.moveTo(nodes[i].x, nodes[i].y);
          context.lineTo(nodes[j].x, nodes[j].y);
          context.stroke();
        }
      }

      nodes.forEach((node, index) => {
        const pulse = 18 + Math.sin(frame / 20 + index) * 7;
        context.beginPath();
        context.arc(node.x, node.y, pulse, 0, Math.PI * 2);
        context.strokeStyle = `${node.color}55`;
        context.stroke();
        context.beginPath();
        context.arc(node.x, node.y, 10, 0, Math.PI * 2);
        context.fillStyle = node.color;
        context.fill();
        context.fillStyle = '#f5f2e8';
        context.font = '700 11px Inter, sans-serif';
        context.fillText(node.label, node.x - 12, node.y + 31);
      });

      const paths =
        mode === 'handshake'
          ? [
              [nodes[0], nodes[1], '#4cc9f0'],
              [nodes[1], nodes[0], '#35e08f'],
              [nodes[0], nodes[1], '#ffd166'],
              [nodes[1], nodes[0], '#ff6b6b'],
            ]
          : mode === 'defense'
            ? [
                [nodes[1], nodes[2], '#35e08f'],
                [nodes[2], nodes[1], '#ffd166'],
              ]
            : [
                [nodes[0], nodes[1], '#4cc9f0'],
                [nodes[1], nodes[2], '#35e08f'],
                [nodes[2], nodes[0], '#ffd166'],
              ];

      paths.forEach((path, index) => {
        const [from, to, color] = path as [{ x: number; y: number }, { x: number; y: number }, string];
        const t = ((frame + index * 32) % 120) / 120;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * -18;
        context.beginPath();
        context.arc(x, y, 4.8, 0, Math.PI * 2);
        context.fillStyle = color;
        context.shadowBlur = 14;
        context.shadowColor = color;
        context.fill();
        context.shadowBlur = 0;
      });

      frame += 1;
      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return <canvas ref={canvasRef} className="signal-canvas" aria-hidden="true" />;
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
