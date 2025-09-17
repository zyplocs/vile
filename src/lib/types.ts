export type DemoId = 'gabor' | 'solid' | 'search';
export interface Params {
  spatialFreqCPD: number; // cycles per degree
  orientationDeg: number; // degrees
  temporalHz: number;     // Hz
  phaseRad: number;       // radians
  contrast: number;       // 0..1 Michelson (linear)
  sigmaDeg: number;       // Gaussian sigma in degrees
  gamma: number;          // simple gamma comp (display approximate)
}

export interface Demo {
  id: DemoId;
  name: string;
}

export interface Renderer {
  setDemo(id: DemoId): void;
  updateParams(p: Params): void;
  setPxPerDeg(pxPerDeg: number): void;
  setHiFi(hi: boolean): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
