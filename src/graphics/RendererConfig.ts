export type RendererMode = 'auto' | 'directx' | 'opengl' | 'software';

export type RendererConfig = {
  renderer: RendererMode;
  vsync: boolean;
  fpsLimit: number;
  debugOverlay: boolean;
  useHardwareAcceleration: boolean;
};

export const defaultRendererConfig: RendererConfig = {
  renderer: 'auto',
  vsync: true,
  fpsLimit: 60,
  debugOverlay: false,
  useHardwareAcceleration: true,
};

export const rendererModeLabels: Record<RendererMode, string> = {
  auto: 'Automático',
  directx: 'DirectX',
  opengl: 'OpenGL',
  software: 'Fallback',
};
