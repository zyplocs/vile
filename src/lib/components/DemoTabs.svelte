<script lang="ts">
  import { demos, currentDemo } from '$lib/stores';
  function select(id: string){
    const d = demos.find(x => x.id === id);
    if (!d) return;
    currentDemo.set(d);
    if (typeof location !== 'undefined') location.hash = d.id;
  }
</script>

<div role="tablist" aria-label="Demos" class="row">
  {#each demos as d}
    <button
      role="tab"
      aria-selected={$currentDemo.id === d.id}
      class="tab{ $currentDemo.id === d.id ? ' active' : '' }"
      on:click={() => select(d.id)}
    >{d.name}</button>
  {/each}
</div>
