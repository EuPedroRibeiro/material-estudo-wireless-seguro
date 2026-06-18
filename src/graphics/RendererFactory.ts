import type { RendererConfig, RendererMode } from './RendererConfig';
import { createEmptyDiagnostics, describeRendererError, type RendererDiagnostics } from './RendererDiagnostics';
import type { RendererInterface } from './RendererInterface';
import { DirectXRenderer } from './renderers/DirectXRenderer';
import { OpenGLRenderer } from './renderers/OpenGLRenderer';
import { SoftwareRenderer } from './renderers/SoftwareRenderer';

export type RendererInitialization = {
  renderer: RendererInterface;
  diagnostics: RendererDiagnostics;
};

const rendererOrder: Record<RendererMode, RendererMode[]> = {
  auto: ['directx', 'opengl', 'software'],
  directx: ['directx', 'opengl', 'software'],
  opengl: ['opengl', 'software'],
  software: ['software'],
};

export async function initializeRenderer(
  canvas: HTMLCanvasElement,
  config: RendererConfig,
): Promise<RendererInitialization> {
  const baseDiagnostics = await detectRendererCapabilities(config.renderer);
  const initializationErrors = [...baseDiagnostics.initializationErrors];
  const fallbackEvents = [...baseDiagnostics.fallbackEvents];
  const order = rendererOrder[config.renderer];

  for (const mode of order) {
    const renderer = createRenderer(mode);
    try {
      const diagnostics = await renderer.init(canvas, config, {
        ...baseDiagnostics,
        initializationErrors,
        fallbackEvents,
      });
      return {
        renderer,
        diagnostics: {
          ...diagnostics,
          initializationErrors: [...initializationErrors],
          fallbackEvents: [...fallbackEvents],
        },
      };
    } catch (error) {
      const message = `${renderer.label}: ${describeRendererError(error)}`;
      initializationErrors.push(message);
      renderer.dispose();

      const nextMode = order[order.indexOf(mode) + 1];
      if (nextMode) {
        fallbackEvents.push(`Fallback de ${mode} para ${nextMode}: ${message}`);
      }
    }
  }

  const software = new SoftwareRenderer();
  const diagnostics = await software.init(canvas, { ...config, renderer: 'software' }, {
    ...baseDiagnostics,
    initializationErrors,
    fallbackEvents,
  });
  return { renderer: software, diagnostics };
}

export async function detectRendererCapabilities(requestedRenderer: RendererMode): Promise<RendererDiagnostics> {
  const diagnostics = createEmptyDiagnostics(requestedRenderer);
  const errors: string[] = [];

  const directX = await detectWebGpu();
  const opengl = detectWebGl();

  if (directX.error) errors.push(directX.error);
  if (opengl.error) errors.push(opengl.error);

  return {
    ...diagnostics,
    directXAvailable: directX.available,
    directXVersion: directX.version,
    openglAvailable: opengl.available,
    openglVersion: opengl.version,
    gpuName: directX.gpuName || opengl.gpuName || diagnostics.gpuName,
    driver: directX.driver || opengl.driver || diagnostics.driver,
    hardwareAcceleration: directX.available || opengl.available,
    initializationErrors: errors,
    timestamp: Date.now(),
  };
}

function createRenderer(mode: RendererMode): RendererInterface {
  if (mode === 'directx') return new DirectXRenderer();
  if (mode === 'opengl') return new OpenGLRenderer();
  return new SoftwareRenderer();
}

async function detectWebGpu() {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) {
    return {
      available: false,
      version: 'Indisponível no navegador',
      gpuName: '',
      driver: '',
      error: 'WebGPU indisponível; DirectX nativo não é exposto para apps web.',
    };
  }

  try {
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
      return {
        available: false,
        version: 'Adaptador WebGPU não encontrado',
        gpuName: '',
        driver: '',
        error: 'Nenhum adaptador WebGPU encontrado.',
      };
    }

    const info = adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : adapter.info ?? {};
    return {
      available: true,
      version: 'Ponte WebGPU (classe DirectX)',
      gpuName: info.description || info.device || info.architecture || 'GPU WebGPU',
      driver: [info.vendor, info.architecture].filter(Boolean).join(' | '),
      error: '',
    };
  } catch (error) {
    return {
      available: false,
      version: 'Erro ao consultar WebGPU',
      gpuName: '',
      driver: '',
      error: `Falha ao detectar WebGPU: ${describeRendererError(error)}`,
    };
  }
}

function detectWebGl() {
  const canvas = document.createElement('canvas');
  const gl =
    canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ??
    canvas.getContext('webgl', { powerPreference: 'high-performance' });

  if (!gl) {
    return {
      available: false,
      version: 'Indisponível',
      gpuName: '',
      driver: '',
      error: 'WebGL/WebGL2 indisponível no navegador.',
    };
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpuName = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : 'GPU WebGL';
  const vendor = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR));
  const version = String(gl.getParameter(gl.VERSION));

  return {
    available: true,
    version,
    gpuName,
    driver: `${vendor} | ${version}`,
    error: '',
  };
}
