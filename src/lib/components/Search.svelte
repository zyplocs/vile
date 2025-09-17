<script lang="ts">
  import { onMount } from 'svelte';

  type Difficulty = 'easy' | 'medium' | 'hard';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  // Controls
  let difficulty: Difficulty = 'medium';
  let items = 36;
  let targetShape: 'circle' | 'square' | 'triangle' | 'diamond' = 'circle';
  let seed = 0;
  let running = false;

  // Trial logging
  type Trial = {
    trial: number;
    n: number;
    target_shape: string;
    target_x: number;
    target_y: number;
    click_x: number;
    click_y: number;
    rt_ms: number;
    correct: boolean;
  };
  let trials: Trial[] = [];
  let trialIndex = 0;
  let trialStartAt = 0;

  // Internal target state for current array
  let targetX = 0, targetY = 0, targetSize = 0, targetShapeKey = 'circle';

  function clamp(v:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, v)); }
  function clampInt(v:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, Math.round(v))); }

  // Simple seeded RNG (LCG)
  function makeRNG(seedValue:number){
    let s = (Number(seedValue) >>> 0) || 1;
    return function(){
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }
  let rng = makeRNG(seed);

  const shapes = {
    circle: (x:number,y:number,size:number,color:string)=>{ if(!ctx) return; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x,y,size/2,0,Math.PI*2); ctx.fill(); },
    square: (x:number,y:number,size:number,color:string)=>{ if(!ctx) return; ctx.fillStyle = color; ctx.fillRect(x-size/2, y-size/2, size, size); },
    triangle: (x:number,y:number,size:number,color:string)=>{ if(!ctx) return; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y-size/2); ctx.lineTo(x+size/2, y+size/2); ctx.lineTo(x-size/2, y+size/2); ctx.closePath(); ctx.fill(); },
    diamond: (x:number,y:number,size:number,color:string)=>{ if(!ctx) return; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y-size/2); ctx.lineTo(x+size/2, y); ctx.lineTo(x, y+size/2); ctx.lineTo(x-size/2, y); ctx.closePath(); ctx.fill(); }
  } as const;
  const shapeKeys = Object.keys(shapes) as Array<keyof typeof shapes>;

  function pickDistractors(target: keyof typeof shapes){
    const others = shapeKeys.filter(s=>s!==target);
    if (difficulty === 'easy') return others.slice(0,1);
    if (difficulty === 'hard') return others;
    return others.slice(0,2);
  }

  function clear(){ if(!ctx||!canvas) return; ctx.clearRect(0,0,canvas.width, canvas.height); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width, canvas.height); }

  function drawArray(){
    if(!ctx||!canvas) return;
    const W = canvas.width, H = canvas.height;
    clear();

    const n = clampInt(items, 8, 144);
    const tgt = targetShape as keyof typeof shapes;
    const distractors = pickDistractors(tgt);

    const cols = Math.ceil(Math.sqrt(n * (W/H)));
    const rows = Math.ceil(n / cols);
    const padding = 20;
    const cellW = (W - 2*padding) / cols;
    const cellH = (H - 2*padding) / rows;
    const size = Math.max(10, Math.min(cellW, cellH) * 0.5);

    const targetCell = Math.floor(rng() * n);

    let idx = 0; targetX = 0; targetY = 0; targetSize = size; targetShapeKey = tgt;
    for (let r=0; r<rows; r++){
      for (let c=0; c<cols; c++){
        if (idx >= n) break;
        const cx = padding + c*cellW + cellW/2;
        const cy = padding + r*cellH + cellH/2;
        const jitterX = (rng() - 0.5) * cellW * 0.3;
        const jitterY = (rng() - 0.5) * cellH * 0.3;
        const x = clamp(cx + jitterX, padding + size/2, W - padding - size/2);
        const y = clamp(cy + jitterY, padding + size/2, H - padding - size/2);

        if (idx === targetCell){
          shapes[tgt](x, y, size, '#ef4444');
          targetX = x; targetY = y;
        } else {
          const ds = distractors[Math.floor(rng()*distractors.length)] || shapeKeys[0];
          shapes[ds](x, y, size, '#3b82f6');
        }
        idx++;
      }
    }

    return { n };
  }

  function start(){
    if (running) return;
    running = true; trials.length = 0; trialIndex = 0; rng = makeRNG(seed);
    const arr = drawArray();
    trialStartAt = performance.now();
  }

  function stop(){ running = false; }

  function onCanvasClick(e: MouseEvent){
    if (!running || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const rt = performance.now() - trialStartAt;
    const dx = x - targetX, dy = y - targetY;
    const hit = (dx*dx + dy*dy) <= (targetSize*targetSize)/4;
    trials.push({ trial: ++trialIndex, n: items, target_shape: targetShapeKey, target_x: targetX, target_y: targetY, click_x: x, click_y: y, rt_ms: Math.round(rt), correct: hit });
    // Next trial: redraw immediately with same settings
    const arr = drawArray();
    trialStartAt = performance.now();
  }

  function exportCSV(){
    const headers = ['trial','n','target_shape','target_x','target_y','click_x','click_y','rt_ms','correct'];
    const rows = [headers.join(',')];
    for (const t of trials){ rows.push([t.trial, t.n, t.target_shape, t.target_x, t.target_y, t.click_x, t.click_y, t.rt_ms, t.correct?1:0].join(',')); }
    const blob = new Blob([rows.join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.download = `visual_search_trials_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); a.remove();
  }

  function downloadPNG(){
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `visual_search_${canvas.width}x${canvas.height}.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a); a.click(); a.remove();
  }

  onMount(() => { ctx = canvas.getContext('2d'); });
</script>

<div class="grid">
  <div class="panel">
    <div class="row"><label for="diff">Difficulty</label>
      <select id="diff" bind:value={difficulty}>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
    <div class="row"><label for="nitems">Items (n)</label>
      <input id="nitems" type="number" min="8" max="144" step="1" bind:value={items} />
    </div>
    <div class="row"><label for="tshape">Target shape</label>
      <select id="tshape" bind:value={targetShape}>
        <option value="circle">circle</option>
        <option value="square">square</option>
        <option value="triangle">triangle</option>
        <option value="diamond">diamond</option>
      </select>
    </div>
    <div class="row"><label for="seed">Seed</label>
      <input id="seed" type="number" min="0" max="999999" step="1" bind:value={seed} />
    </div>
    <div class="row" style="gap:.5rem">
      <button class="primary" on:click={start} disabled={running}>Start</button>
      <button on:click={stop} disabled={!running}>Stop</button>
      <button on:click={exportCSV} disabled={!trials.length}>Export Trials CSV</button>
      <button on:click={downloadPNG}>Download PNG</button>
    </div>
  </div>
  <div class="canvasWrap">
    <canvas bind:this={canvas} width="880" height="495" on:click={onCanvasClick}></canvas>
  </div>
</div>
