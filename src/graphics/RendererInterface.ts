import type { RendererConfig } from './RendererConfig';
import type { ActiveRenderer, RendererDiagnostics } from './RendererDiagnostics';

export type RenderFrameInput = {
  timeMs: number;
  deltaMs: number;
  mode: string;
  width: number;
  height: number;
  pixelRatio: number;
};

export interface RendererInterface {
  readonly id: ActiveRenderer;
  readonly label: string;
  init(
    canvas: HTMLCanvasElement,
    config: RendererConfig,
    baseDiagnostics: RendererDiagnostics,
  ): Promise<RendererDiagnostics>;
  resize(width: number, height: number, pixelRatio: number): void;
  render(input: RenderFrameInput): void;
  getDiagnostics(): RendererDiagnostics;
  dispose(): void;
}
