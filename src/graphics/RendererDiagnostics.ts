import type { RendererMode } from './RendererConfig';

export type ActiveRenderer = 'directx' | 'opengl' | 'software' | 'none';

export type RendererDiagnostics = {
  requestedRenderer: RendererMode;
  activeRenderer: ActiveRenderer;
  rendererLabel: string;
  gpuName: string;
  driver: string;
  directXAvailable: boolean;
  openglAvailable: boolean;
  directXVersion: string;
  openglVersion: string;
  fpsAverage: number;
  graphicsMemoryMB: number | null;
  hardwareAcceleration: boolean;
  initializationErrors: string[];
  fallbackEvents: string[];
  timestamp: number;
};

export function createEmptyDiagnostics(requestedRenderer: RendererMode): RendererDiagnostics {
  return {
    requestedRenderer,
    activeRenderer: 'none',
    rendererLabel: 'Nenhum',
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

export function describeRendererError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
