<script lang="ts">
  import { params, pxPerDeg } from '$lib/stores';
  import type { Params } from '$lib/types';
  import { get } from 'svelte/store';

  let p: Params = get(params);
  $: p = $params;

  function clamp(v:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, v)); }

  function update<K extends keyof Params>(k: K, v: Params[K]){
    params.update(s => ({ ...s, [k]: v }));
  }

  function onPxPerDegInput(e: Event) {
    const target = e.target as HTMLInputElement;
    pxPerDeg.set(target.valueAsNumber);
  }

  function onSpatialFreqInput(e: Event) {
    const target = e.target as HTMLInputElement;
    update('spatialFreqCPD', target.valueAsNumber);
  }

  function onOrientationInput(e: Event) {
    const target = e.target as HTMLInputElement;
    update('orientationDeg', target.valueAsNumber);
  }

  function onTemporalInput(e: Event) {
    const target = e.target as HTMLInputElement;
    update('temporalHz', target.valueAsNumber);
  }

  function onPhaseInput(e: Event) {
    const target = e.target as HTMLInputElement;
    update('phaseRad', target.valueAsNumber);
  }

  function onContrastInput(e: Event) {
    const target = e.target as HTMLInputElement;
    update('contrast', target.valueAsNumber);
  }

  function onSigmaInput(e: Event) {
    const target = e.target as HTMLInputElement;
    update('sigmaDeg', target.valueAsNumber);
  }

  function onGammaInput(e: Event) {
    const target = e.target as HTMLInputElement;
    update('gamma', target.valueAsNumber);
  }
</script>

<div class="row"><label for="pxPerDeg">px/deg</label>
  <input id="pxPerDeg" type="number" value={$pxPerDeg} min="10" max="600" step="1" on:input={onPxPerDegInput} />
</div>
<div class="row"><label for="spatialFreqCPD">Spatial freq (CPD)</label>
  <input id="spatialFreqCPD" type="range" min="0.1" max="20" step="0.1" value={p.spatialFreqCPD} on:input={onSpatialFreqInput} />
  <span>{p.spatialFreqCPD.toFixed(1)}</span>
</div>
<div class="row"><label for="orientationDeg">Orientation (deg)</label>
  <input id="orientationDeg" type="range" min="0" max="180" step="1" value={p.orientationDeg} on:input={onOrientationInput} />
  <span>{p.orientationDeg.toFixed(0)}</span>
</div>
<div class="row"><label for="temporalHz">Temporal (Hz)</label>
  <input id="temporalHz" type="range" min="0" max="20" step="0.1" value={p.temporalHz} on:input={onTemporalInput} />
  <span>{p.temporalHz.toFixed(1)}</span>
</div>
<div class="row"><label for="phaseRad">Initial phase (rad)</label>
  <input id="phaseRad" type="range" min="-6.283" max="6.283" step="0.001" value={p.phaseRad} on:input={onPhaseInput} />
  <span>{p.phaseRad.toFixed(3)}</span>
</div>
<div class="row"><label for="contrast">Contrast (Michelson)</label>
  <input id="contrast" type="range" min="0" max="1" step="0.01" value={p.contrast} on:input={onContrastInput} />
  <span>{p.contrast.toFixed(2)}</span>
</div>
<div class="row"><label for="sigmaDeg">Gaussian σ (deg)</label>
  <input id="sigmaDeg" type="range" min="0.1" max="10" step="0.1" value={p.sigmaDeg} on:input={onSigmaInput} />
  <span>{p.sigmaDeg.toFixed(1)}</span>
</div>
<div class="row"><label for="gamma">Gamma compensation</label>
  <input id="gamma" type="range" min="1.0" max="3.0" step="0.05" value={p.gamma} on:input={onGammaInput} />
  <span>{p.gamma.toFixed(2)}</span>
</div>
<p class="hint">All computations occur in linear space; gamma is applied only on display.</p>
