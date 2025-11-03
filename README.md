# CPU Scheduling Visualizer

An interactive CPU Scheduling Algorithm Simulator built with HTML, CSS, and JavaScript.  
It allows users to visualize how different CPU scheduling algorithms execute processes over time through an animated Gantt Chart and step-by-step timeline simulation.

---

## Project Description

This project demonstrates the behavior of popular CPU scheduling algorithms in Operating Systems by providing a live simulation environment.  
Users can input custom process data, select an algorithm, and observe how processes are scheduled and executed on the CPU.

### Supported Scheduling Algorithms
- FCFS (First Come First Serve)
- SJF (Shortest Job First) — Preemptive and Non-Preemptive
- Priority Scheduling — Preemptive and Non-Preemptive
- Round Robin (RR) — with user-defined quantum
- Multilevel Queue (MLQ) — with configurable Foreground and Background queues

---

## Key Features

- Dynamic Input Table — Add, edit, or remove processes with arrival time, burst time, and priority.
- Algorithm Selector — Choose the scheduling algorithm and parameters (like quantum time).
- Animated Gantt Chart — Displays process execution over time, color-coded per process.
- Playback Controls:
  - Play / Pause animation
  - Step forward / backward
  - Jump to start / end
  - Adjustable animation speed
- Live Statistics:
  - Average Waiting Time  
  - Average Turnaround Time  
  - Makespan  
  - Throughput
- Simulation Trace Export — Download JSON logs of execution.
- Screenshot Export — Save Gantt chart as a PNG image.
- Responsive and Browser-Based — No installation required.

---

## One-Page Execution Guide

### Setup Instructions

1. Clone or download this project folder.
2. Open the folder in Visual Studio Code or any text editor.
3. Right-click on `index.html` → **Open with Live Server** (or open directly in a browser).
4. The simulator interface will appear on screen.

Tip: You can also drag and drop `index.html` into your browser window to run it locally.

---

### User Interface Guide

| Section | Description |
|----------|--------------|
| Process Table | Enter processes with fields: PID, Arrival Time, Burst Time, Priority. Use “Add Process” / “Clear” buttons to manage entries. |
| Algorithm Selector | Choose between FCFS, SJF, Priority, RR, and MLQ. |
| Quantum Field | Appears for Round Robin – specify the time quantum. |
| MLQ Options | Appears for Multilevel Queue – configure Foreground and Background quantum times. |
| Speed Slider | Adjusts simulation playback speed. |
| Run Simulation | Generates the Gantt chart and starts animation. |
| Controls | Play, Pause, Step Forward, Step Backward, Rewind, and Fast Forward. |
| Statistics Panel | Shows computed averages and CPU performance metrics. |
| Trace Output | Displays detailed step-by-step execution trace. |

---

### Animation and Visualization Features

- Color Coding: Each process is displayed in a unique color on the Gantt chart for clear distinction.  
- Playhead Line: A vertical line moves over the Gantt chart showing the current CPU execution time.  
- Gantt Chart Layout:
  - Horizontal axis → Time progression  
  - Colored blocks → Process execution intervals  
  - Labels above each block → Process ID and duration  
- Dynamic Updates: The chart animates as the simulation progresses, reflecting context switches and queue changes.

---

### Browser Requirements

| Browser | Minimum Version | Notes |
|----------|-----------------|-------|
| Google Chrome | 90+ | Fully supported |
| Mozilla Firefox | 88+ | Fully supported |
| Microsoft Edge | 91+ | Fully supported |
| Safari | 14+ | Partial support (animation timing may vary) |

Recommended: Use Chrome or Edge for the best performance and smooth Gantt animations.

---

## Project Structure

