# DTCC 3D Assignment Teaching Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the teach skill to create and deliver this learning workspace. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Enable Spyros to explain the DTCC 3D-engine assignment, repository relationships, measured limitations, issue discussions, decision spike, and recommendation confidently in meetings without relying on the agent.

**Architecture:** The DTCC workspace root becomes a stateful teaching workspace. Four short HTML lessons share one printable stylesheet and one reference map. Each lesson uses primary sources, retrieval practice, and immediate feedback; learning records capture demonstrated understanding rather than passive completion.

**Tech Stack:** Semantic HTML, CSS, lightweight browser JavaScript for quizzes, ego-browser for primary-source research and lesson verification.

**Spec:** docs/superpowers/specs/2026-09-11-scientific-visualization-decision-spike-design.md

## Global Constraints

- Begin only after the core decision spike produces verified evidence and reply drafts.
- Follow /Users/sarmatas/.agents/skills/teach/SKILL.md and its format references.
- Keep lessons short and focused on one meeting capability each.
- Use high-trust primary sources and cite claims in every lesson.
- Build storage strength through recall, spacing, and interleaving.
- Quiz options must have equal word counts and, where practical, equal character counts.
- Do not mark a learning record complete until the user attempts its exercise.
- Store teaching artifacts at /Users/sarmatas/Projects/dtcc, outside all DTCC git clones.

---

### Task 1: Establish the learning workspace and mission

**Files:**
- Create: /Users/sarmatas/Projects/dtcc/MISSION.md
- Create: /Users/sarmatas/Projects/dtcc/RESOURCES.md
- Create: /Users/sarmatas/Projects/dtcc/NOTES.md
- Create: /Users/sarmatas/Projects/dtcc/assets/course.css

- [ ] **Step 1: Read the teach format references**

Read MISSION-FORMAT.md, RESOURCES-FORMAT.md, and LEARNING-RECORD-FORMAT.md from the teach skill directory before writing.

- [ ] **Step 2: Write the mission**

The mission is demonstrated when Spyros can give a two-minute assignment overview, draw the repo/data flow, explain each measured renderer limitation, distinguish evidence from hypothesis, and answer why the decision spike precedes a full prototype.

- [ ] **Step 3: Build the source register**

Include DTCC repository docs, the meeting transcript, engine-bench pages and NOTES.md, all related issue comments, Three.js documentation, vtk.js documentation, VTK.wasm documentation, and the final measurement report. Annotate what each source establishes.

- [ ] **Step 4: Create the shared printable stylesheet**

Use a restrained Tufte-like layout, readable line lengths, print styles, accessible contrast, visible citations, diagrams, quiz feedback, and mobile-safe fallback.

### Task 2: Create the repository and terminology reference

**Files:**
- Create: /Users/sarmatas/Projects/dtcc/reference/dtcc-3d-and-repository-map.html

- [ ] **Step 1: Build the repository map**

Cover dtcc-core, dtcc-sim, dtcc-agent, dtcc-twin, dtcc-viewer, dtcc-atlas, dtcc-web, dtcc-data, dtcc-upload, and engine-bench. For each, state responsibility, inputs, outputs, consumers, current relevance, and known dependency constraints.

- [ ] **Step 2: Build the glossary**

Define canonical model, CRS, local origin, mesh, unstructured grid, regular grid, scalar/vector field, shader, draping, picking, slice, streamline, isosurface, volume rendering, transfer function, occlusion, provenance, adapter, WebGL, WebGPU, and Wasm.

- [ ] **Step 3: Add meeting lookup tables**

Include claim-to-evidence, issue-to-decision, and limitation-to-mitigation mappings designed for rapid review before a meeting.

### Task 3: Create four short lessons

**Files:**
- Create: lessons/0001-explain-the-dtcc-3d-assignment.html
- Create: lessons/0002-understand-the-renderer-limitations.html
- Create: lessons/0003-explain-the-scientific-visualization-spike.html
- Create: lessons/0004-rehearse-the-meeting-conversation.html

- [ ] **Step 1: Lesson 1, assignment and repository flow**

Teach the assignment history, why GitHub issues became the work queue, what was parked, and how data flows from Core/Sim through artifacts to a browser renderer. Win condition: draw and narrate the flow from memory.

- [ ] **Step 2: Lesson 2, renderer evidence**

Teach MapLibre custom-layer terrain behavior, deck.gl/Three.js attachment, shader value loss, baked colors, picking, vtk.js regular-grid volume, and the meaning of the ELEMENTS counterexample. Win condition: explain each limitation without overstating it.

- [ ] **Step 3: Lesson 3, the decision spike**

Teach shared inputs, single-canvas depth, Three.js versus vtk.js, correctness gates, performance measurements, maintenance burden, and VTK.wasm's bounded role. Win condition: defend why the spike can return neither.

- [ ] **Step 4: Lesson 4, meeting rehearsal**

Reconstruct the issue comments and Anders's feedback. Provide objection handling, a two-minute talk track, a five-minute deep version, and an exercise where Spyros answers likely developer questions before revealing model answers.

### Task 4: Verify and begin the feedback loop

**Files:**
- Create after user practice: learning-records/0001-assignment-baseline.md

- [ ] **Step 1: Render and inspect every HTML artifact**

Open each lesson and the reference document, verify navigation, typography, printing, citations, diagrams, quiz behavior, and no console errors.

- [ ] **Step 2: Open lesson 1 for the user**

Ask Spyros to complete the recall exercise and provide the two-minute explanation.

- [ ] **Step 3: Give immediate feedback**

Correct factual gaps, distinguish weak recall from conceptual misunderstanding, and adapt the next lesson's difficulty.

- [ ] **Step 4: Write the baseline learning record**

Record demonstrated knowledge, misconceptions, questions, and the next retrieval date using the skill format. Do not infer mastery from reading time.

## Verification

- Mission is measurable and tied to meetings.
- Every lesson links the reference and one primary source.
- Every lesson has an active exercise and follow-up invitation.
- Reference pages print cleanly.
- Quiz choices do not reveal answers through length or formatting.
- Learning record reflects observed performance.

