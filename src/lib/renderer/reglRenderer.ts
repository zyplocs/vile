import reglFactory from 'regl';
import type { Renderer, Params, DemoId } from '$lib/types';

const VS = `
precision highp float;
attribute vec2 position;
varying vec2 v_uv;
void main(){
  v_uv = (position * 0.5) + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FS_SOLID = `
precision highp float;
varying vec2 v_uv;
uniform float u_gamma;
void main(){
  float l = 0.5;
  // linear to sRGB approx
  vec3 rgb = vec3(pow(l, 1.0 / u_gamma));
  gl_FragColor = vec4(rgb,1.0);
}`;

const FS_GABOR = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#extension GL_OES_standard_derivatives : enable
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_phase0;       // initial phase (rad)
uniform float u_temporalHz;   // Hz
uniform float u_freqPerPx;    // cycles per pixel (spatial)
uniform float u_theta;        // radians, orientation
uniform float u_contrast;     // Michelson 0..1
uniform float u_sigmaPx;      // Gaussian sigma (px)
uniform float u_gamma;
uniform float u_hiFi;         // 1.0 -> hi‑fi analytic filtering, 0.0 -> direct sample

// Rotate a vector by theta
vec2 rot(vec2 p, float th){
  float c = cos(th), s = sin(th);
  return vec2(c*p.x - s*p.y, s*p.x + c*p.y);
}

// Linear to sRGB via gamma approximation (display-comp)
vec3 toSRGB(vec3 lin, float gamma){
  return pow(lin, vec3(1.0 / gamma));
}

void main(){
  // pixel coordinates centered
  vec2 frag = v_uv * u_resolution;
  vec2 center = 0.5 * u_resolution;
  vec2 p = frag - center;
  // rotate
  vec2 pr = rot(p, u_theta);
  float x = pr.x;
  float y = pr.y;

  // Spatial term (sinusoid)
  float phase = u_phase0 + 6.28318530718 * u_temporalHz * u_time;
  float k = 6.28318530718 * u_freqPerPx; // radians per pixel
  float carrier = cos(k * x + phase);

  // HiFi: approximate pixel-footprint integration of cos(kx) with sinc attenuation
  // Average of cos over a pixel of width w is cos(kx) * sinc(k*w/2), where sinc(t)=sin(t)/t.
  // Use screen-space derivatives to estimate pixel footprint w in the rotated x-direction.
  if (u_hiFi > 0.5) {
    float w = fwidth(x);         // footprint in px along x
    float s = 0.5 * k * w;
    float atten = (s > 1e-5) ? (sin(s) / s) : 1.0;
    carrier *= atten;
  }

  // Gaussian envelope
  float g = exp(-0.5 * (x*x + y*y) / (u_sigmaPx*u_sigmaPx));

  float signal = g * carrier;

  // Michelson contrast around mid-gray 0.5 in linear light
  float L = 0.5 + 0.5 * u_contrast * signal;

  // Clamp to [0,1] to avoid out-of-gamut values
  L = clamp(L, 0.0, 1.0);

  vec3 rgb = vec3(L);
  rgb = toSRGB(rgb, u_gamma);
  gl_FragColor = vec4(rgb, 1.0);
}`;

function dpr() {
  return Math.max(1, Math.min(3, window.devicePixelRatio || 1));
}

function resizeCanvas(canvas: HTMLCanvasElement){
  const cssW = canvas.clientWidth || 1280;
  const cssH = canvas.clientHeight || 720;
  const scale = dpr();
  const w = Math.round(cssW * scale);
  const h = Math.round(cssH * scale);
  if (canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
  }
  return { w, h, scale };
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const regl = reglFactory({
    canvas,
    attributes: { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false },
    extensions: ['OES_standard_derivatives']
  });

  const quad = regl.buffer([[-1, -1],[1, -1],[-1, 1],[1, 1]]);
  const elements = regl.elements([[0,1,2],[2,1,3]]);

  let current: DemoId = 'gabor';
  // Time accounting with pause/resume support
  let baseTime = performance.now();
  let pausedAccum = 0;   // total paused time in ms
  let running = true;
  let rafId: number | null = null;
  let pxPerDeg = 60;
  let hiFi = false;
  let uniforms = {
    spatialFreqCPD: 3, orientationDeg: 0, temporalHz: 0, phaseRad: 0, contrast: 0.9, sigmaDeg: 1.0, gamma: 2.2
  };

  const drawSolid = regl({
    vert: VS,
    frag: FS_SOLID,
    attributes: { position: quad },
    elements,
    uniforms: {
      u_gamma: regl.prop('u_gamma')
    }
  });

  const drawGabor = regl({
    vert: VS,
    frag: FS_GABOR,
    attributes: { position: quad },
    elements,
    uniforms: {
      u_resolution: ({viewportWidth, viewportHeight}: any) => [viewportWidth, viewportHeight],
      // Elapsed time in seconds, stable across pause/resume
      u_time: () => ((pausedAccum + (running ? (performance.now() - baseTime) : 0)) / 1000),
      u_phase0: regl.prop('u_phase0'),
      u_temporalHz: regl.prop('u_temporalHz'),
      u_freqPerPx: regl.prop('u_freqPerPx'),
      u_theta: regl.prop('u_theta'),
      u_contrast: regl.prop('u_contrast'),
      u_sigmaPx: regl.prop('u_sigmaPx'),
      u_gamma: regl.prop('u_gamma'),
      u_hiFi: () => hiFi ? 1.0 : 0.0
    }
  });

  function frame(){
    if (!running) return;
    resizeCanvas(canvas);
    regl.poll();
    regl.clear({ color: [0,0,0,1] });
    if (current === 'solid'){
      drawSolid({ u_gamma: uniforms.gamma });
    } else {
      const sigmaPx = uniforms.sigmaDeg * pxPerDeg;
      const theta = uniforms.orientationDeg * Math.PI / 180;
      const freqPerPx = uniforms.spatialFreqCPD / pxPerDeg;
      drawGabor({
        u_phase0: uniforms.phaseRad,
        u_temporalHz: uniforms.temporalHz,
        u_freqPerPx: freqPerPx,
        u_theta: theta,
        u_contrast: uniforms.contrast,
        u_sigmaPx: Math.max(0.5, sigmaPx),
        u_gamma: uniforms.gamma
      });
    }
    rafId = requestAnimationFrame(frame);
  }
  // Kick off the loop
  rafId = requestAnimationFrame(frame);

  function pause(){
    if (!running) return;
    running = false;
    if (rafId != null) cancelAnimationFrame(rafId);
    pausedAccum += performance.now() - baseTime;
  }

  function resume(){
    if (running) return;
    running = true;
    baseTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  return {
    setDemo(id){ current = id; },
    updateParams(p: Params){ uniforms = { ...uniforms, ...p }; },
    setPxPerDeg(ppd: number){ pxPerDeg = ppd; },
    setHiFi(h: boolean){ hiFi = h; },
    pause,
    resume,
    destroy(){
      pause();
      regl.destroy();
    }
  };
}
