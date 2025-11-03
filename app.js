// app.js
import { simulate } from './scheduler.js';
import { Animator } from './animation.js';
import { uid, downloadJSON, saveDataURL } from './utils.js';

const canvas = document.getElementById('vis-canvas');
const animator = new Animator(canvas, 1000, 480);

// UI elems
const procTableBody = document.querySelector('#proc-table tbody');
const addProcBtn = document.getElementById('add-proc');
const clearProcsBtn = document.getElementById('clear-procs');
const loadSampleBtn = document.getElementById('load-sample');
const runSimBtn = document.getElementById('run-sim');
const algorithmSelect = document.getElementById('algorithm');
const quantumInput = document.getElementById('quantum');
const mlqOpts = document.getElementById('mlq-opts');
const mlqFgQuantum = document.getElementById('mlq-fg-quantum');
const mlqBgQuantum = document.getElementById('mlq-bg-quantum');
const speedSlider = document.getElementById('speed');

const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const stepF = document.getElementById('step-forward');
const stepB = document.getElementById('step-back');
const rewind = document.getElementById('rewind');
const fastfwd = document.getElementById('fastfwd');
const timeline = document.getElementById('timeline');

const exportScreenshot = document.getElementById('export-screenshot');
const exportTrace = document.getElementById('export-trace');

const traceOutput = document.getElementById('trace-output');

const statCt = document.getElementById('stat-ct');
const statWt = document.getElementById('stat-wt');
const statTt = document.getElementById('stat-tt');
const statTh = document.getElementById('stat-th');

let currentSimulation = null;

function createRow(pid = uid('P'), arrival = 0, burst = 1, priority = 1) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="idx"></td>
    <td><input class="pid" value="${pid}" /></td>
    <td><input class="arrival" type="number" value="${arrival}" min="0" /></td>
    <td><input class="burst" type="number" value="${burst}" min="1" /></td>
    <td><input class="priority" type="number" value="${priority}" /></td>
    <td><button class="del">Delete</button></td>
  `;
  procTableBody.appendChild(tr);
  updateIndices();
  tr.querySelector('.del').addEventListener('click', ()=>{ tr.remove(); updateIndices(); });
}

function updateIndices() {
  [...procTableBody.querySelectorAll('tr')].forEach((tr, i) => {
    tr.querySelector('.idx').textContent = (i+1);
  });
}

addProcBtn.addEventListener('click', ()=> createRow());
clearProcsBtn.addEventListener('click', ()=> { procTableBody.innerHTML=''; });

loadSampleBtn.addEventListener('click', ()=> {
  procTableBody.innerHTML = '';
  // sample with different priorities to showcase MLQ / Priority
  createRow('P1', 0, 5, 0); // fg (for MLQ)
  createRow('P2', 1, 3, 1);
  createRow('P3', 2, 8, 0);
  createRow('P4', 3, 6, 2);
});

algorithmSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  // show/hide quantum / mlq options depending on algorithm
  document.getElementById('quantum-label').style.display = (val === 'RR') ? 'inline-block' : 'none';
  mlqOpts.style.display = (val === 'MLQ') ? 'inline-block' : 'none';
});

runSimBtn.addEventListener('click', ()=> {
  const algorithm = algorithmSelect.value;
  const procs = [];
  for (const tr of procTableBody.querySelectorAll('tr')) {
    const pid = tr.querySelector('.pid').value || uid('P');
    const arrival = Number(tr.querySelector('.arrival').value) || 0;
    const burst = Number(tr.querySelector('.burst').value) || 1;
    const priority = Number(tr.querySelector('.priority').value) || 0;
    procs.push({pid, arrival, burst, priority});
  }
  if (procs.length === 0) {
    alert('Add at least one process.');
    return;
  }

  // build options based on algorithm
  const opts = {};
  if (algorithm === 'RR') {
    opts.quantum = Number(quantumInput.value) || 4;
  } else if (algorithm === 'MLQ') {
    opts.mlqFgQuantum = Number(mlqFgQuantum.value) || 2;
    opts.mlqBgQuantum = mlqBgQuantum.value ? Number(mlqBgQuantum.value) : null;
  }

  const sim = simulate(algorithm, procs, opts);
  currentSimulation = {procs, algorithm, opts, sim};

  animator.loadHistory(sim.historySnapshots);
  animator.setSpeed(Number(speedSlider.value));
  timeline.max = Math.max(0, sim.historySnapshots.length - 1);
  timeline.value = 0;
  updateStats(sim.stats);
  showTrace(sim.trace);
  drawGanttChart(sim.trace); // <-- 🔥 Draw Gantt Chart after sim
});

function updateStats(stats) {
  statCt.textContent = stats.makespan.toFixed(2);
  statWt.textContent = stats.avgWaiting.toFixed(2);
  statTt.textContent = stats.avgTurnaround.toFixed(2);
  statTh.textContent = stats.throughput.toFixed(3);
}

function showTrace(trace) {
  if (!trace || trace.length === 0) {
    traceOutput.textContent = 'No trace';
    return;
  }
  const lines = trace.map(t => `t=${t.time} | CPU=${t.cpu ?? 'Idle'} | event=${t.event} | ready=[${t.ready.join(',')}]`);
  traceOutput.textContent = lines.join('\n');
}

// 🎨 Gantt Chart Drawer
function drawGanttChart(trace) {
  const canvas = document.getElementById("gantt-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barHeight = 30;
  const yStart = 50;
  const pxPerUnit = 30;

  const pids = [...new Set(trace.filter(t => t.cpu).map(t => t.cpu))];
  const colors = {};
  const colorPalette = [
    "#E57373", "#64B5F6", "#81C784", "#FFF176", "#BA68C8",
    "#4DB6AC", "#FFD54F", "#9575CD", "#4FC3F7", "#A1887F"
  ];
  pids.forEach((pid, i) => colors[pid] = colorPalette[i % colorPalette.length]);

  let x = 50;
  trace.forEach((t, i) => {
    if (t.cpu) {
      ctx.fillStyle = colors[t.cpu];
      ctx.fillRect(x, yStart, pxPerUnit, barHeight);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x, yStart, pxPerUnit, barHeight);
      ctx.fillStyle = "#000";
      ctx.font = "14px sans-serif";
      ctx.fillText(t.cpu, x + 8, yStart + 20);
    }
    x += pxPerUnit;
  });

  // time scale
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  let tMark = 0;
  x = 50;
  while (tMark <= trace.length) {
    ctx.fillText(tMark, x, yStart + barHeight + 15);
    x += pxPerUnit;
    tMark++;
  }

  // legend
  let lx = 50, ly = 15;
  pids.forEach(pid => {
    ctx.fillStyle = colors[pid];
    ctx.fillRect(lx, ly, 20, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText(pid, lx + 25, ly + 15);
    lx += 70;
  });
}

// playback bindings
playBtn.addEventListener('click', ()=> animator.play());
pauseBtn.addEventListener('click', ()=> animator.pause());
stepF.addEventListener('click', ()=> animator.stepForward());
stepB.addEventListener('click', ()=> animator.stepBackward());
rewind.addEventListener('click', ()=> animator.jumpTo(0));
fastfwd.addEventListener('click', ()=> {
  if (animator.history.length) animator.jumpTo(animator.history.length - 1);
});

animator.onFrameCallback = (index) => {
  timeline.value = index;
};

timeline.addEventListener('input', (e)=>{
  animator.pause();
  animator.jumpTo(Number(e.target.value));
});

speedSlider.addEventListener('input', (e)=> {
  const v = Number(e.target.value) || 1;
  animator.setSpeed(v);
});

exportScreenshot.addEventListener('click', ()=>{
  const dataURL = canvas.toDataURL('image/png');
  saveDataURL(dataURL, 'schedule_screenshot.png');
});

exportTrace.addEventListener('click', ()=>{
  if (!currentSimulation) {
    alert('No simulation to export. Run simulation first.');
    return;
  }
  const out = {
    config: { algorithm: currentSimulation.algorithm, opts: currentSimulation.opts, procs: currentSimulation.procs },
    trace: currentSimulation.sim.trace,
    stats: currentSimulation.sim.stats
  };
  downloadJSON(out, 'schedule_trace.json');
});

// initial sample rows
createRow('P1', 0, 5, 0);
createRow('P2', 1, 3, 1);
createRow('P3', 2, 8, 0);
createRow('P4', 3, 6, 2);
