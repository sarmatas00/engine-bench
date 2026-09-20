# VTK.wasm Feasibility Probe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this time-boxed probe. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Determine within four focused hours whether current VTK.wasm can load the decision spike's neutral artifacts and render one city-plus-scientific view in a single browser canvas.

**Architecture:** Work in an isolated temporary package so @kitware/vtk-wasm never enters the engine-bench dependency graph. Use the same manifest and binary URLs produced by the core decision-spike plan. Preserve only a minimal successful reproduction or a precise failure report.

**Tech Stack:** @kitware/vtk-wasm 3.0.4 baseline, TypeScript, Vite, WebAssembly, WebGL/WebGPU, ego-browser.

**Spec:** docs/superpowers/specs/2026-09-11-scientific-visualization-decision-spike-design.md

## Global Constraints

- Maximum four focused hours from the recorded start timestamp.
- Do not modify root package.json, bun.lock, main pages, or renderer selection.
- Do not use VTK.wasm to rescue a failed vtk.js or Three.js path.
- Success requires one canvas, the shared artifact contract, city geometry, and one volume or movable slice.
- Record initialization time, transferred runtime bytes, API maturity, browser support, and teardown behavior.
- A documented failure is a complete outcome.

---

### Task 1: Freeze the probe contract

**Files:**
- Create: spikes/vtk-wasm/README.md

**Interfaces:**
- Consumes: public/data/scientific/scientific-manifest.json and scientific.bin.
- Produces: start timestamp, environment, version, success gate, and stop deadline.

- [ ] **Step 1: Record exact environment and deadline**

Record macOS version, architecture, browser versions, Bun/Node versions, package version, rendering backend, start timestamp, and four-hour deadline.

- [ ] **Step 2: Record the success assertions**

The README must require: one VTK.wasm standalone session, one registered canvas, shared manifest validation, city geometry, volume or slice, a visible provenance label, a clean dispose, initialization duration, and transferred bytes.

- [ ] **Step 3: Commit the contract**

~~~bash
git add spikes/vtk-wasm/README.md
git commit -m "docs: define VTK.wasm feasibility gate"
~~~

### Task 2: Probe in an isolated package

**Files:**
- Work outside repo: a mktemp-created directory.
- Create on success only: spikes/vtk-wasm/probe.html
- Create on success only: spikes/vtk-wasm/probe.ts

**Interfaces:**
- Consumes: the core plan's hosted or locally served artifact URLs.
- Produces: runnable proof or exact failure evidence.

- [ ] **Step 1: Create the temporary package**

Use mktemp -d, install the exact VTK.wasm version, and follow the current Kitware TypeScript guide. Save install duration and package sizes in the README.

- [ ] **Step 2: Load and validate shared artifacts**

Reuse the core plan's manifest schema and reject version, hash, length, coordinate, or provenance mismatch before constructing VTK objects.

- [ ] **Step 3: Create the minimum scene**

Create one standalone session, register one canvas, add city PolyData, then add either the regular-grid volume or z slice. Render and exercise one camera interaction.

- [ ] **Step 4: Measure runtime behavior**

Capture Wasm fetch/compile/instantiate time, total bytes, first frame, steady interaction, WebGL/WebGPU result, console failures, and dispose behavior.

- [ ] **Step 5: Stop on the deadline**

If incomplete, stop immediately. Record the last successful call and exact error; do not redesign the core artifact contract or extend the time box.

### Task 3: Report the result

**Files:**
- Modify: spikes/vtk-wasm/README.md
- Modify: docs/scientific-visualization-measurements.md

- [ ] **Step 1: Write one of two explicit verdicts**

Use FEASIBLE FOR FURTHER EVALUATION only when every success assertion passes. Otherwise use NOT ESTABLISHED WITHIN TIME BOX and name the failed assertion.

- [ ] **Step 2: Verify reproducibility**

On success, run the copied minimal probe from a clean install and verify through ego-browser. On failure, rerun only the failing command once to confirm the error is stable.

- [ ] **Step 3: Commit**

~~~bash
git add spikes/vtk-wasm docs/scientific-visualization-measurements.md
git commit -m "docs: record VTK.wasm feasibility result"
~~~

## Verification

- One canvas and one VTK.wasm session.
- Shared manifest hash and coordinate frame verified.
- City plus volume or slice visible.
- No unhandled console or network failures.
- Teardown releases the session.
- Four-hour boundary honored.

