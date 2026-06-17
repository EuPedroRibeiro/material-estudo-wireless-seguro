import type { RendererConfig } from '../RendererConfig';
import type { RendererDiagnostics } from '../RendererDiagnostics';
import type { RenderFrameInput, RendererInterface } from '../RendererInterface';

type WebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

const nodePositions = [
  [-0.64, -0.36, 0.3, 0.78, 0.94],
  [0, 0.36, 0.21, 0.88, 0.56],
  [0.64, -0.36, 1, 0.82, 0.4],
];

export class OpenGLRenderer implements RendererInterface {
  readonly id = 'opengl' as const;
  readonly label = 'OpenGL Renderer (WebGL)';

  private gl: WebGLContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
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

    const gl =
      canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' }) ??
      canvas.getContext('webgl', { antialias: true, powerPreference: 'high-performance' });

    if (!gl) throw new Error('WebGL/WebGL2 não disponível neste navegador.');

    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Falha ao criar buffer WebGL.');

    this.gl = gl;
    this.program = program;
    this.buffer = buffer;
    this.frameCount = 0;
    this.firstFrame = performance.now();

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuName = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : baseDiagnostics.gpuName;
    const vendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL))
      : String(gl.getParameter(gl.VENDOR));
    const version = String(gl.getParameter(gl.VERSION));

    this.diagnostics = {
      ...baseDiagnostics,
      requestedRenderer: config.renderer,
      activeRenderer: this.id,
      rendererLabel: this.label,
      gpuName: gpuName || 'GPU WebGL',
      driver: `${vendor} | ${version}`,
      openglAvailable: true,
      openglVersion: version,
      hardwareAcceleration: true,
      timestamp: Date.now(),
    };

    return this.getDiagnostics();
  }

  resize(width: number, height: number) {
    const gl = this.gl;
    if (!gl) return;
    gl.canvas.width = width;
    gl.canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  render(input: RenderFrameInput) {
    const gl = this.gl;
    const program = this.program;
    const buffer = this.buffer;
    if (!gl || !program || !buffer) return;

    const vertices = buildSceneVertices(input.mode, input.timeMs);
    gl.viewport(0, 0, input.width, input.height);
    gl.clearColor(0.067, 0.075, 0.059, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
    const position = gl.getAttribLocation(program, 'a_position');
    const color = gl.getAttribLocation(program, 'a_color');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(color, 3, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    const alpha = gl.getUniformLocation(program, 'u_alpha');
    gl.uniform1f(alpha, 0.36);
    gl.drawArrays(gl.LINE_LOOP, 0, 3);
    gl.uniform1f(alpha, 1);
    gl.drawArrays(gl.POINTS, 0, 4);

    this.updateFps(input.timeMs);
  }

  getDiagnostics() {
    if (!this.diagnostics) throw new Error('Renderer OpenGL ainda não foi inicializado.');
    return this.diagnostics;
  }

  dispose() {
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    if (this.gl && this.buffer) this.gl.deleteBuffer(this.buffer);
    this.gl = null;
    this.program = null;
    this.buffer = null;
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

function buildSceneVertices(mode: string, timeMs: number) {
  const path = getPacketPath(mode);
  const t = ((timeMs / 11) % 120) / 120;
  const from = nodePositions[path[0]];
  const to = nodePositions[path[1]];
  const packetX = from[0] + (to[0] - from[0]) * t;
  const packetY = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.12;

  return new Float32Array([
    ...nodePositions[0],
    ...nodePositions[1],
    ...nodePositions[2],
    packetX,
    packetY,
    0.95,
    0.78,
    0.26,
  ]);
}

function getPacketPath(mode: string) {
  if (mode === 'defense') return [1, 2];
  if (mode === 'handshake') return [0, 1];
  return [2, 0];
}

function createProgram(gl: WebGLContext) {
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec2 a_position;
      attribute vec3 a_color;
      varying vec3 v_color;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = 14.0;
        v_color = a_color;
      }
    `,
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      varying vec3 v_color;
      uniform float u_alpha;

      void main() {
        gl_FragColor = vec4(v_color, u_alpha);
      }
    `,
  );

  const program = gl.createProgram();
  if (!program) throw new Error('Falha ao criar programa WebGL.');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Erro desconhecido ao linkar WebGL.';
    throw new Error(message);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

function compileShader(gl: WebGLContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Falha ao criar shader WebGL.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Erro desconhecido ao compilar shader.';
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}
