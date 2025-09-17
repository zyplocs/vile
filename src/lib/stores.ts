import { writable, derived } from 'svelte/store';
import type { Demo, Params } from './types';
import { browser } from '$app/environment';

export const demos = [
  { id: 'gabor', name: 'Gabor' },
  { id: 'solid', name: 'Solid' },
  { id: 'search', name: 'Visual Search' },
] satisfies Demo[];

function hashGet(): string | null {
  if (!browser) return null;
  const h = location.hash.replace(/^#/, '');
  return h || null;
}

const initialDemo = (() => {
  const byHash = hashGet();
  const found = demos.find((d) => d.id === (byHash as any));
  return found ?? demos[0];
})();

export const currentDemo = writable<Demo>(initialDemo);

if (browser) {
  window.addEventListener('hashchange', () => {
    const found = demos.find((d) => d.id === (hashGet() as any));
    if (found) currentDemo.set(found);
  });
}

export const hiFi = writable<boolean>(false);

// Visual-degree calibration (px per degree). Start with a safe default; user can calibrate.
export const pxPerDeg = writable<number>(60);

export const params = writable<Params>({
  spatialFreqCPD: 3,
  orientationDeg: 0,
  temporalHz: 0,
  phaseRad: 0,
  contrast: 0.9,
  sigmaDeg: 1.0,
  gamma: 2.2,
});

// Derived uniforms helper (kept for reference)
export const derivedUniforms = derived(
  [params, pxPerDeg],
  ([$p, $ppd]) => {
    const freqPerPx = $p.spatialFreqCPD / $ppd; // cycles per pixel
    return {
      ...$p,
      freqPerPx
    };
  }
);
