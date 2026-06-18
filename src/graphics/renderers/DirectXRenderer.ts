import type { RendererConfig } from '../RendererConfig';
import type { RendererDiagnostics } from '../RendererDiagnostics';
import type { RenderFrameInput, RendererInterface } from '../RendererInterface';

type GpuAdapterLike = {
  requestDevice: () => Promise<any>;
  requestAdapterInfo?: () => Promise<{ vendor?: string; architecture?: string; device?: string; description?: string }>;
  info?: { vendor?: string; architecture?: string; device?: string; description?: string };
};

const gpuBufferUsage = () => (globalThis as any).GPUBufferUsage;

export class DirectXRenderer implements RendererInterface {
  readonly id = 'directx' as const;
  readonly label = 'Renderizador DirectX (ponte WebGPU)';

  private device: any = null;
  private context: any = null;
  private linePipeline: any = null;
  private triPipeline: any = null;
  private lineBuffer: any = null;
  private triBuffer: any = null;
  private format = 'bgra8unorm';
  private diagnostics: RendererDiagnostics | null = null;
  private frameCount = 0;
  private firstFrame = 0;

  async init(
    canvas: HTMLCanvasElement,
    config: RendererConfig,
    baseDiagnostics: RendererDiagnostics,
  ): Promise<RendererDiagnostics> {
    if (!config.useHardwareAcceleration) {
      throw new Error('Aceleração por hardware desativada na configuração.');
    }

    const gpu = (navigator as Navigator & { gpu?: any }).gpu;
    if (!gpu) {
      throw new Error('WebGPU não disponível; DirectX nativo não é acessível em apps web.');
    }

    const adapter: GpuAdapterLike | null = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('Nenhum adaptador WebGPU encontrado.');

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu') as any;
    if (!context) throw new Error('Contexto WebGPU indisponível para o canvas.');

    this.device = device;
    this.context = context;
    this.format = gpu.getPreferredCanvasFormat?.() ?? 'bgra8unorm';
    context.configure({
      device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createPipelines();
    this.createBuffers();
    this.frameCount = 0;
    this.firstFrame = performance.now();

    const adapterInfo = await readAdapterInfo(adapter);
    const gpuName = adapterInfo.description || adapterInfo.device || adapterInfo.architecture || baseDiagnostics.gpuName;
    const driver = [adapterInfo.vendor, adapterInfo.architecture].filter(Boolean).join(' | ');

    this.diagnostics = {
      ...baseDiagnostics,
      requestedRenderer: config.renderer,
      activeRenderer: this.id,
      rendererLabel: this.label,
      gpuName: gpuName || 'GPU WebGPU',
      driver: driver || 'Adaptador WebGPU do navegador',
      directXAvailable: true,
      directXVersion: 'Ponte WebGPU (classe DirectX, não nativo)',
      hardwareAcceleration: true,
      timestamp: Date.now(),
    };

    return this.getDiagnostics();
  }

  resize() {
    // WebGPU acompanha o tamanho do canvas diretamente.
  }

  render(input: RenderFrameInput) {
    if (!this.device || !this.context || !this.linePipeline || !this.triPipeline || !this.lineBuffer || !this.triBuffer) {
      return;
    }

    const lineData = buildLineVertices();
    const triData = buildQuadVertices(input.mode, input.timeMs);
    this.device.queue.writeBuffer(this.lineBuffer, 0, lineData);
    this.device.queue.writeBuffer(this.triBuffer, 0, triData);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.02, g: 0.02, b: 0.02, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    pass.setPipeline(this.linePipeline);
    pass.setVertexBuffer(0, this.lineBuffer);
    pass.draw(lineData.length / 5);
    pass.setPipeline(this.triPipeline);
    pass.setVertexBuffer(0, this.triBuffer);
    pass.draw(triData.length / 5);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
    this.updateFps(input.timeMs);
  }

  getDiagnostics() {
    if (!this.diagnostics) throw new Error('Renderizador DirectX ainda não foi inicializado.');
    return this.diagnostics;
  }

  dispose() {
    this.lineBuffer?.destroy?.();
    this.triBuffer?.destroy?.();
    this.device = null;
    this.context = null;
    this.linePipeline = null;
    this.triPipeline = null;
    this.lineBuffer = null;
    this.triBuffer = null;
  }

  private createPipelines() {
    const shader = this.device.createShaderModule({
      code: `
        struct VertexInput {
          @location(0) position: vec2<f32>,
          @location(1) color: vec3<f32>,
        };

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) color: vec3<f32>,
        };

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
          var output: VertexOutput;
          output.position = vec4<f32>(input.position, 0.0, 1.0);
          output.color = input.color;
          return output;
        }

        @fragment
        fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
          return vec4<f32>(input.color, 1.0);
        }
      `,
    });

    const vertex = {
      module: shader,
      entryPoint: 'vs_main',
      buffers: [
        {
          arrayStride: 5 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 2 * Float32Array.BYTES_PER_ELEMENT, format: 'float32x3' },
          ],
        },
      ],
    };

    const fragment = {
      module: shader,
      entryPoint: 'fs_main',
      targets: [{ format: this.format }],
    };

    this.linePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex,
      fragment,
      primitive: { topology: 'line-list' },
    });

    this.triPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex,
      fragment,
      primitive: { topology: 'triangle-list' },
    });
  }

  private createBuffers() {
    const usage = gpuBufferUsage().VERTEX | gpuBufferUsage().COPY_DST;
    this.lineBuffer = this.device.createBuffer({ size: 6 * 5 * 4, usage });
    this.triBuffer = this.device.createBuffer({ size: 24 * 5 * 4, usage });
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

async function readAdapterInfo(adapter: GpuAdapterLike) {
  if (adapter.requestAdapterInfo) return adapter.requestAdapterInfo();
  return adapter.info ?? {};
}

function buildLineVertices() {
  return new Float32Array([
    -0.64, -0.36, 0.28, 0.31, 0.32,
    0, 0.36, 0.28, 0.31, 0.32,
    0, 0.36, 0.28, 0.31, 0.32,
    0.64, -0.36, 0.28, 0.31, 0.32,
    0.64, -0.36, 0.28, 0.31, 0.32,
    -0.64, -0.36, 0.28, 0.31, 0.32,
  ]);
}

function buildQuadVertices(mode: string, timeMs: number) {
  const quads = [
    ...makeQuad(-0.64, -0.36, 0.055, [0.94, 0.94, 0.9]),
    ...makeQuad(0, 0.36, 0.055, [0.66, 0.66, 0.66]),
    ...makeQuad(0.64, -0.36, 0.055, [1, 0.12, 0.18]),
    ...makePacketQuad(mode, timeMs),
  ];

  return new Float32Array(quads);
}

function makePacketQuad(mode: string, timeMs: number) {
  const points = [
    [-0.64, -0.36],
    [0, 0.36],
    [0.64, -0.36],
  ];
  const [fromIndex, toIndex] = mode === 'defense' ? [1, 2] : mode === 'handshake' ? [0, 1] : [2, 0];
  const from = points[fromIndex];
  const to = points[toIndex];
  const t = ((timeMs / 11) % 120) / 120;
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.12;
  return makeQuad(x, y, 0.028, [1, 0.12, 0.18]);
}

function makeQuad(x: number, y: number, size: number, color: number[]) {
  const [r, g, b] = color;
  return [
    x - size, y - size, r, g, b,
    x + size, y - size, r, g, b,
    x + size, y + size, r, g, b,
    x - size, y - size, r, g, b,
    x + size, y + size, r, g, b,
    x - size, y + size, r, g, b,
  ];
}
