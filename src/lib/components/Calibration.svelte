<script lang="ts">
  import { pxPerDeg } from '$lib/stores';
  let inches = 2.0;
  function setByRuler(px: number, inches: number){
    const ppi = px / inches;
    // For precise experiments compute px/deg from PPI and viewing distance separately.
    // This component shows a CSS ruler; use it alongside a real ruler to calibrate browser zoom.
  }
</script>

<div class="panel">
  <h3>Display calibration</h3>
  <p>Use the px/deg control to match your setup. If you know your monitor PPI and viewing distance, compute px/deg = PPI × (distance × tan(1°)).</p>
  <div style="padding:.5rem 0">
    <div style="width:2in; height:4px; background:currentColor"></div>
    <div class="hint">Above bar is 2 inches on-screen (CSS inches). Adjust browser zoom to match a real ruler if desired.</div>
  </div>
</div>
