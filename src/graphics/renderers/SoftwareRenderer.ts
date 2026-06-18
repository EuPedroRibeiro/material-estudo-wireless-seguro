import type { RendererConfig } from '../RendererConfig';
import type { RendererDiagnostics } from '../RendererDiagnostics';
import type { RenderFrameInput, RendererInterface } from '../RendererInterface';

type SceneNode = {
  x: number;
  y: number;
  label: string;
  color: string;
};

export class SoftwareRenderer implements RendererInterface {
  readonly id = 'software' as const;
  readonly label = 'Renderizador fallback (Canvas 2D)';

  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private diagnostics: RendererDiagnostics | null = null;
  private frameCount = 0;
  private firstFrame = 0;

  async init(
    canvas: HTMLCanvasElement,
    config: RendererConfig,
    baseDiagnostics: RendererDiagnostics,
  ): Promise<RendererDiagnostics> {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D não disponível para fallback software.');

    this.canvas = canvas;
    this.context = context;
    this.frameCount = 0;
    this.firstFrame = performance.now();
    this.diagnostics = {
      ...baseDiagnostics,
      requestedRenderer: config.renderer,
      activeRenderer: this.id,
      rendererLabel: this.label,
      gpuName: baseDiagnostics.gpuName === 'Não detectada' ? 'CPU / Canvas 2D' : baseDiagnostics.gpuName,
      driver: baseDiagnostics.driver === 'Não detectado' ? 'Navegador Canvas 2D' : baseDiagnostics.driver,
      hardwareAcceleration: false,
      timestamp: Date.now(),
    };

    return this.getDiagnostics();
  }

  resize(width: number, height: number) {
    if (!this.canvas) return;
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  render(input: RenderFrameInput) {
    const context = this.context;
    if (!context) return;

    const scale = input.pixelRatio || 1;
    const width = input.width / scale;
    const height = input.height / scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#050505';
    context.fillRect(0, 0, width, height);

    const nodes: SceneNode[] = [
      { x: width * 0.18, y: height * 0.68, label: 'STA', color: '#f5f5f0' },
      { x: width * 0.5, y: height * 0.35, label: 'AP', color: '#a8a8a8' },
      { x: width * 0.82, y: height * 0.68, label: 'DEF', color: '#ff1f2d' },
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
      const pulse = 18 + Math.sin(input.timeMs / 320 + index) * 7;
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

    getScenePaths(input.mode, nodes).forEach((path, index) => {
      const [from, to, color] = path;
      const t = ((input.timeMs / 11 + index * 32) % 120) / 120;
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

    this.updateFps(input.timeMs);
  }

  getDiagnostics() {
    return this.diagnostics ?? {
      requestedRenderer: 'software',
      activeRenderer: this.id,
      rendererLabel: this.label,
      gpuName: 'CPU / Canvas 2D',
      driver: 'Navegador Canvas 2D',
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

  dispose() {
    this.canvas = null;
    this.context = null;
  }

  private updateFps(timeMs: number) {
    if (!this.diagnostics) return;
    this.frameCount += 1;
    const elapsed = Math.max(1, timeMs - this.firstFrame);
    this.diagnostics = {
      ...this.diagnostics,
      fpsAverage: Math.round((this.frameCount / elapsed) * 1000),
      timestamp: Date.now(),
    };
  }
}

function getScenePaths(mode: string, nodes: SceneNode[]): [SceneNode, SceneNode, string][] {
  if (mode === 'handshake') {
    return [
      [nodes[0], nodes[1], '#f5f5f0'],
      [nodes[1], nodes[0], '#a8a8a8'],
      [nodes[0], nodes[1], '#ff1f2d'],
      [nodes[1], nodes[0], '#ff1f2d'],
    ];
  }

  if (mode === 'defense') {
    return [
      [nodes[1], nodes[2], '#a8a8a8'],
      [nodes[2], nodes[1], '#ff1f2d'],
    ];
  }

  return [
    [nodes[0], nodes[1], '#f5f5f0'],
    [nodes[1], nodes[2], '#a8a8a8'],
    [nodes[2], nodes[0], '#ff1f2d'],
  ];
}
