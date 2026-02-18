<script lang="ts">
  import { onMount } from 'svelte';
  import DemoTabs from '$lib/components/DemoTabs.svelte';
  import Controls from '$lib/components/Controls.svelte';
  import Calibration from '$lib/components/Calibration.svelte';
  import Search from '$lib/components/Search.svelte';
  import { currentDemo, params, pxPerDeg, hiFi } from '$lib/stores';
  import type { Renderer } from '$lib/types';

  let canvas: HTMLCanvasElement;
  let renderer: Renderer | null = null;

  onMount(() => {
    const vis = () => {
      if (!renderer) return;
      if (document.hidden) renderer.pause();
      else renderer.resume();
    };

    (async () => {
      const { createRenderer } = await import('$lib/renderer/reglRenderer');
      renderer = createRenderer(canvas);
      // Initialize from current store values
      const d = $currentDemo;
      renderer.setDemo(d.id);
      renderer.updateParams($params);
      renderer.setPxPerDeg($pxPerDeg);
      renderer.setHiFi($hiFi);

      document.addEventListener('visibilitychange', vis);
    })();

    return () => {
      document.removeEventListener('visibilitychange', vis);
      renderer?.destroy();
    };
  });

  $: if (renderer) renderer.updateParams($params);
  $: if (renderer) renderer.setPxPerDeg($pxPerDeg);
  $: if (renderer) renderer.setHiFi($hiFi);
  $: if (renderer) renderer.setDemo($currentDemo.id);
  $: if (renderer) { if ($currentDemo.id === 'search') renderer.pause(); else renderer.resume(); }
</script>

<div class="row" style="align-items:center; gap:.5rem">
  <DemoTabs />
  <div style="margin-left:auto"></div>
  <label class="row" for="hiFiToggle" style="gap:.5rem; align-items:center">
    <input id="hiFiToggle" type="checkbox" bind:checked={$hiFi} /> High-fidelity
  </label>
</div>

<div class="grid" hidden={$currentDemo.id === 'search'} aria-hidden={$currentDemo.id === 'search'}>
  <div class="panel">
    <Controls />
    <Calibration />
  </div>
  <div class="canvasWrap">
    <canvas bind:this={canvas} width="1280" height="720"></canvas>
  </div>
</div>

{#if $currentDemo.id === 'search'}
  <Search />
{/if}
