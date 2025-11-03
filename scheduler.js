// scheduler.js
// Multi-algorithm scheduler simulator
// Usage: simulate(algorithm, processes, options)
// processes: [{pid, arrival, burst, priority?}]
// algorithm: 'RR'|'FCFS'|'SJF'|'PRIORITY'|'MLQ'
// options: { quantum, mlqFgQuantum, ... }

function deepCopy(o){ return JSON.parse(JSON.stringify(o)); }

export function simulate(algorithm, processes, options = {}) {
  const procsIn = processes.map(p => ({
    pid: String(p.pid),
    arrival: Number(p.arrival),
    burst: Number(p.burst),
    priority: p.priority !== undefined ? Number(p.priority) : 0
  }));

  switch (algorithm) {
    case 'RR':
      return simulateRR(procsIn, options.quantum ?? 4);
    case 'FCFS':
      return simulateFCFS(procsIn);
    case 'SJF':
      return simulateSJF(procsIn);
    case 'PRIORITY':
      return simulatePriority(procsIn);
    case 'MLQ':
      return simulateMLQ(procsIn, options.mlqFgQuantum ?? 2, options.mlqBgQuantum ?? 4);
    default:
      return simulateRR(procsIn, options.quantum ?? 4);
  }
}

/* ---------- Common helpers ---------- */

function makeProcessState(list) {
  return list.map(p => ({
    pid: p.pid,
    arrival: p.arrival,
    burst: p.burst,
    remaining: p.remaining,
    startTime: p.startTime,
    completionTime: p.completionTime,
    priority: p.priority
  }));
}

function snapshotState(time, cpu, procs, ready) {
  return {
    time,
    cpu,
    ready: [...ready],
    procs: makeProcessState(procs)
  };
}

function computeStats(procs) {
  const total = procs.length;
  const avgWaiting = procs.reduce((s,x)=>s + (x.turnaround - x.burst), 0) / total;
  const avgTurnaround = procs.reduce((s,x)=>s + x.turnaround, 0) / total;
  const makespan = Math.max(...procs.map(p=>p.completionTime)) - Math.min(...procs.map(p=>p.arrival));
  const lastTime = Math.max(...procs.map(p=>p.completionTime));
  const throughput = total / Math.max(1, lastTime);
  return { avgWaiting, avgTurnaround, makespan, throughput, processes: deepCopy(procs) };
}

/* ---------- RR ---------- */

function simulateRR(processes, quantum = 4) {
  // time-unit simulation like before
  const procs = processes.map(p => ({ ...p, remaining: p.burst, startTime: null, completionTime: null, enqueued:false }));
  procs.sort((a,b)=> a.arrival - b.arrival);
  let time = 0;
  let readyQueue = [];
  let history = [];
  const trace = [];
  const maxIter = 200000; let iter = 0;

  function enqueueArrivals() {
    for (const p of procs) {
      if (!p.enqueued && p.arrival <= time && p.remaining > 0) {
        readyQueue.push(p.pid);
        p.enqueued = true;
      }
    }
  }

  enqueueArrivals();

  while ((procs.some(p=>p.remaining>0) || readyQueue.length>0) && iter < maxIter) {
    iter++;
    enqueueArrivals();

    if (readyQueue.length === 0) {
      // idle
      const next = procs.find(p=>!p.enqueued && p.remaining>0);
      if (!next) break;
      const jumpTo = next.arrival;
      while (time < jumpTo) {
        history.push(snapshotState(time, null, procs, readyQueue));
        trace.push({time, cpu:null, ready:[...readyQueue], event:'idle'});
        time++;
      }
      enqueueArrivals();
      continue;
    }

    const pid = readyQueue.shift();
    const p = procs.find(x=>x.pid===pid);
    if (p.startTime === null) p.startTime = time;

    const run = Math.min(quantum, p.remaining);
    for (let t=0;t<run;t++) {
      p.remaining -= 1;
      history.push(snapshotState(time, pid, procs, readyQueue));
      trace.push({time, cpu:pid, ready:[...readyQueue], event:`exec(${pid})`});
      time++;
      enqueueArrivals();
    }
    if (p.remaining === 0) {
      p.completionTime = time;
    } else {
      readyQueue.push(pid);
    }
  }

  // finalize metrics
  for (const p of procs) {
    if (p.completionTime === null) p.completionTime = time;
    p.turnaround = p.completionTime - p.arrival;
    p.waiting = p.turnaround - p.burst;
    if (p.startTime === null) p.startTime = p.arrival; // edge
  }

  return { trace, historySnapshots: history, stats: computeStats(procs) };
}

/* ---------- FCFS ---------- (non-preemptive) */

function simulateFCFS(processes) {
  const procs = processes.map(p => ({ ...p, remaining: p.burst, startTime: null, completionTime: null, enqueued:false }));
  procs.sort((a,b)=> a.arrival - b.arrival);
  let time = 0, history = [], trace = [], readyQueue = [], iter=0, maxIter=200000;

  function enqueueArrivals() {
    for (const p of procs) {
      if (!p.enqueued && p.arrival <= time && p.remaining > 0) {
        readyQueue.push(p.pid);
        p.enqueued = true;
      }
    }
  }

  enqueueArrivals();

  while ((procs.some(p=>p.remaining>0) || readyQueue.length>0) && iter<maxIter) {
    iter++;
    enqueueArrivals();
    if (readyQueue.length === 0) {
      const next = procs.find(p=>!p.enqueued && p.remaining>0);
      if (!next) break;
      // idle until next arrival
      const jumpTo = next.arrival;
      while (time < jumpTo) {
        history.push(snapshotState(time, null, procs, readyQueue));
        trace.push({time, cpu:null, ready:[...readyQueue], event:'idle'});
        time++;
      }
      enqueueArrivals();
      continue;
    }

    const pid = readyQueue.shift();
    const p = procs.find(x=>x.pid===pid);
    if (p.startTime === null) p.startTime = time;

    // run to completion
    while (p.remaining > 0) {
      p.remaining -= 1;
      history.push(snapshotState(time, pid, procs, readyQueue));
      trace.push({time, cpu:pid, ready:[...readyQueue], event:`exec(${pid})`});
      time++;
      enqueueArrivals();
    }
    p.completionTime = time;
  }

  for (const p of procs) {
    if (p.completionTime === null) p.completionTime = time;
    p.turnaround = p.completionTime - p.arrival;
    p.waiting = p.turnaround - p.burst;
    if (p.startTime === null) p.startTime = p.arrival;
  }

  return { trace, historySnapshots: history, stats: computeStats(procs) };
}

/* ---------- SJF (non-preemptive) ---------- */

function simulateSJF(processes) {
  const procs = processes.map(p => ({ ...p, remaining: p.burst, startTime: null, completionTime: null, enqueued:false }));
  let time = 0, history = [], trace = [], readyList = [], iter=0, maxIter=200000;

  function enqueueArrivals() {
    for (const p of procs) {
      if (!p.enqueued && p.arrival <= time && p.remaining > 0) {
        readyList.push(p);
        p.enqueued = true;
      }
    }
  }

  enqueueArrivals();
  while ((procs.some(p=>p.remaining>0) || readyList.length>0) && iter<maxIter) {
    iter++;
    enqueueArrivals();

    if (readyList.length === 0) {
      const next = procs.find(p=>!p.enqueued && p.remaining>0);
      if (!next) break;
      const jumpTo = next.arrival;
      while (time < jumpTo) {
        history.push(snapshotState(time, null, procs, []));
        trace.push({time, cpu:null, ready:[], event:'idle'});
        time++;
      }
      enqueueArrivals();
      continue;
    }

    // pick shortest job from readyList
    readyList.sort((a,b)=> a.remaining - b.remaining || a.arrival - b.arrival);
    const p = readyList.shift();
    const pid = p.pid;
    if (p.startTime === null) p.startTime = time;

    while (p.remaining > 0) {
      p.remaining -= 1;
      history.push(snapshotState(time, pid, procs, readyList.map(r=>r.pid)));
      trace.push({time, cpu:pid, ready: readyList.map(r=>r.pid), event:`exec(${pid})`});
      time++;
      enqueueArrivals();
    }
    p.completionTime = time;
  }

  for (const p of procs) {
    if (p.completionTime === null) p.completionTime = time;
    p.turnaround = p.completionTime - p.arrival;
    p.waiting = p.turnaround - p.burst;
    if (p.startTime === null) p.startTime = p.arrival;
  }

  return { trace, historySnapshots: history, stats: computeStats(procs) };
}

/* ---------- Priority (non-preemptive) ----------
   Lower numeric priority value => higher priority (0 highest)
*/
function simulatePriority(processes) {
  const procs = processes.map(p => ({ ...p, remaining: p.burst, startTime: null, completionTime: null, enqueued:false }));
  let time = 0, history = [], trace = [], readyList = [], iter=0, maxIter=200000;

  function enqueueArrivals() {
    for (const p of procs) {
      if (!p.enqueued && p.arrival <= time && p.remaining > 0) {
        readyList.push(p);
        p.enqueued = true;
      }
    }
  }

  enqueueArrivals();
  while ((procs.some(p=>p.remaining>0) || readyList.length>0) && iter<maxIter) {
    iter++;
    enqueueArrivals();

    if (readyList.length === 0) {
      const next = procs.find(p=>!p.enqueued && p.remaining>0);
      if (!next) break;
      const jumpTo = next.arrival;
      while (time < jumpTo) {
        history.push(snapshotState(time, null, procs, []));
        trace.push({time, cpu:null, ready:[], event:'idle'});
        time++;
      }
      enqueueArrivals();
      continue;
    }

    // pick highest priority (lowest numeric), tie-break arrival then burst
    readyList.sort((a,b)=> a.priority - b.priority || a.arrival - b.arrival || a.burst - b.burst);
    const p = readyList.shift();
    const pid = p.pid;
    if (p.startTime === null) p.startTime = time;

    while (p.remaining > 0) {
      p.remaining -= 1;
      history.push(snapshotState(time, pid, procs, readyList.map(r=>r.pid)));
      trace.push({time, cpu:pid, ready: readyList.map(r=>r.pid), event:`exec(${pid})`});
      time++;
      enqueueArrivals();
    }
    p.completionTime = time;
  }

  for (const p of procs) {
    if (p.completionTime === null) p.completionTime = time;
    p.turnaround = p.completionTime - p.arrival;
    p.waiting = p.turnaround - p.burst;
    if (p.startTime === null) p.startTime = p.arrival;
  }

  return { trace, historySnapshots: history, stats: computeStats(procs) };
}

/* ---------- Multilevel Queue (MLQ) ----------
   - Foreground queue: processes with priority === 0 (or assigned by caller)
     Served using Round Robin with fgQuantum.
   - Background queue: remaining processes, served FCFS (or background quantum if provided).
   - Processes do NOT migrate between queues in this simplified MLQ.
*/
function simulateMLQ(processes, fgQuantum = 2, bgQuantum = null) {
  // mark queue assignment by priority: 0 -> foreground; others -> background
  const procs = processes.map(p => ({ ...p, remaining: p.burst, startTime: null, completionTime: null, enqueued:false }));
  procs.sort((a,b)=> a.arrival - b.arrival);
  let time = 0, history = [], trace = [];
  let fgQueue = [], bgQueue = [];
  const maxIter = 200000; let iter=0;

  function enqueueArrivals() {
    for (const p of procs) {
      if (!p.enqueued && p.arrival <= time && p.remaining > 0) {
        if (p.priority === 0) fgQueue.push(p.pid);
        else bgQueue.push(p.pid);
        p.enqueued = true;
      }
    }
  }

  enqueueArrivals();

  while ((procs.some(p=>p.remaining>0) || fgQueue.length>0 || bgQueue.length>0) && iter<maxIter) {
    iter++;
    enqueueArrivals();

    if (fgQueue.length === 0 && bgQueue.length === 0) {
      const next = procs.find(p=>!p.enqueued && p.remaining>0);
      if (!next) break;
      const jumpTo = next.arrival;
      while (time < jumpTo) {
        history.push(snapshotState(time, null, procs, []));
        trace.push({time, cpu:null, ready:[], event:'idle'});
        time++;
      }
      enqueueArrivals();
      continue;
    }

    if (fgQueue.length > 0) {
      // Foreground RR
      const pid = fgQueue.shift();
      const p = procs.find(x=>x.pid===pid);
      if (p.startTime === null) p.startTime = time;
      const run = Math.min(fgQuantum, p.remaining);
      for (let t=0;t<run;t++) {
        p.remaining -= 1;
        history.push(snapshotState(time, pid, procs, [...fgQueue, ...bgQueue]));
        trace.push({time, cpu:pid, ready:[...fgQueue, ...bgQueue], event:`exec(${pid})`});
        time++;
        enqueueArrivals();
      }
      if (p.remaining === 0) p.completionTime = time;
      else fgQueue.push(pid);
    } else {
      // Background FCFS (run to completion or optional bgQuantum if provided)
      const pid = bgQueue.shift();
      const p = procs.find(x=>x.pid===pid);
      if (p.startTime === null) p.startTime = time;
      if (bgQuantum == null) {
        while (p.remaining > 0) {
          p.remaining -= 1;
          history.push(snapshotState(time, pid, procs, [...fgQueue, ...bgQueue]));
          trace.push({time, cpu:pid, ready:[...fgQueue, ...bgQueue], event:`exec(${pid})`});
          time++;
          enqueueArrivals();
        }
        p.completionTime = time;
      } else {
        const run = Math.min(bgQuantum, p.remaining);
        for (let t=0;t<run;t++) {
          p.remaining -= 1;
          history.push(snapshotState(time, pid, procs, [...fgQueue, ...bgQueue]));
          trace.push({time, cpu:pid, ready:[...fgQueue, ...bgQueue], event:`exec(${pid})`});
          time++;
          enqueueArrivals();
        }
        if (p.remaining === 0) p.completionTime = time;
        else bgQueue.push(pid);
      }
    }
  }

  for (const p of procs) {
    if (p.completionTime === null) p.completionTime = time;
    p.turnaround = p.completionTime - p.arrival;
    p.waiting = p.turnaround - p.burst;
    if (p.startTime === null) p.startTime = p.arrival;
  }

  return { trace, historySnapshots: history, stats: computeStats(procs) };
}
