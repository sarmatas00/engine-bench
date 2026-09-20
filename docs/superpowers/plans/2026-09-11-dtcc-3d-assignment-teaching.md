# DTCC Platform and 3D Stack Teaching Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the teach skill to create and deliver this learning workspace. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Enable Spyros to understand how the relevant DTCC repositories work and connect, how the full 3D pipeline turns raw geodata into simulated fields and rendered pixels, and, on that foundation, to explain the 3D-engine assignment, measured renderer limitations, dtcc-core#85 model changes, decision spike, and recommendation confidently without relying on the agent.

**Architecture:** The DTCC workspace root becomes a stateful teaching workspace. Twelve short HTML lessons, ordered by dependency (platform, pipeline, rendering foundations, then assignment evidence, spike, and rehearsal), share one printable stylesheet, reusable quiz and diagram components, one repository/pipeline reference, and one glossary. Each lesson uses primary sources, retrieval practice, and immediate feedback; learning records capture demonstrated understanding rather than passive completion.

**Tech Stack:** Semantic HTML, CSS, lightweight browser JavaScript for quizzes, ego-browser for primary-source research and lesson verification, read-only use of local DTCC clones and engine-bench artifacts for exercises.

**Spec:** docs/superpowers/specs/2026-09-11-scientific-visualization-decision-spike-design.md

## Global Constraints

- Revised 2026-09-15: all twelve lessons are prepared up front and studied asynchronously alongside spike implementation; progress is self-recorded in PROGRESS.md and reviewed on request. Lesson 12 teaches the talk track with explicit "pending measurement" slots; revise lesson 12 and the claim-to-evidence table once the core spike produces verified evidence and reply drafts.
- Follow /Users/sarmatas/.agents/skills/teach/SKILL.md and its format references (MISSION, RESOURCES, LEARNING-RECORD, GLOSSARY).
- Keep each lesson short and focused on one capability with one tangible win.
- Ground every claim in the local repository source, repository docs, or high-trust primary sources, and cite it in the lesson. Never teach DTCC internals from parametric knowledge; read the code first.
- Build storage strength through recall, spacing, and interleaving; later lessons open with retrieval questions from earlier ones.
- Quiz options must have equal word counts and, where practical, equal character counts.
- Do not mark a learning record complete until the user attempts its exercise. Adapt later lessons to observed gaps.
- Store teaching artifacts at /Users/sarmatas/Projects/dtcc/learning, outside all DTCC git clones.
- Exercises are read-only against shared state: never write into engine-bench/public/data, never run stage1_build.py or stage2_sim.sh against committed outputs, never change branches or revisions in the DTCC clones. Use a scratch directory and existing artifacts (heat.xdmf, field and mesh JSON/binaries) instead of rerunning the solver.
- The local .venv runs pre-#85 Core 5cf56fa until spike Task 1 Step 0. Teach post-#85 facts from Core 4c8d621 via `git show 4c8d621:<path>` and label which revision each exercise runs against.
- Include dtcc-core#85 closeout (Core 4c8d621): native `.dtcc` ModelFile v6, LinkML schema 0.9.0, float64 typed arrays, explicit field association, FieldSlice/StreamlineCollection explicitly unsupported, follow-up drafts F1-F4 unpublished.

---

### Task 1: Establish the learning workspace and mission

**Files:**
- Create: /Users/sarmatas/Projects/dtcc/MISSION.md
- Create: /Users/sarmatas/Projects/dtcc/RESOURCES.md
- Create: /Users/sarmatas/Projects/dtcc/NOTES.md
- Create: /Users/sarmatas/Projects/dtcc/assets/course.css
- Create: /Users/sarmatas/Projects/dtcc/assets/quiz.js and any reusable diagram helper

- [ ] **Step 1: Read the teach format references**

Read MISSION-FORMAT.md, RESOURCES-FORMAT.md, GLOSSARY-FORMAT.md, and LEARNING-RECORD-FORMAT.md from the teach skill directory before writing.

- [ ] **Step 2: Write the mission and confirm it with Spyros**

The mission is demonstrated when Spyros can, from memory:
- draw the platform map from raw data to pixels, naming the repository and data type at every hop;
- explain how Core builds a city model, how dtcc-mesher produces the surface mesh and its face markers, and how the TetGen wrapper produces the volume mesh Sim solves on;
- explain what a DTCC field is (values, unit, association) and how results travel (XDMF, `.dtcc` ModelFile, canonical packages through Upload and Atlas);
- explain EPSG:3006, local origins, and float64-to-float32 precision loss;
- explain how a browser draws opaque geometry, transparent geometry, and volumes, and why depth matters;
- explain slices, streamlines, isosurfaces, and volume rendering with transfer functions;
- give a two-minute assignment overview, explain each measured renderer limitation, distinguish evidence from hypothesis, and answer why the decision spike precedes a full prototype.

- [ ] **Step 3: Build the source register**

Include, annotated with what each source establishes:
- Local DTCC clones: READMEs, docs, and key source for dtcc-core (builder, meshing backends, model, io, datasets, proto, docs/design at 4c8d621), dtcc-mesher, dtcc-tetgen-wrapper, dtcc-sim, dtcc-upload, dtcc-atlas, dtcc-data, dtcc-viewer, dtcc-web, dtcc-tangible-twin, dtcc-agent, and engine-bench (pages, scripts/real, NOTES.md, dataset.json).
- DTCC platform documentation (https://platform.dtcc.chalmers.se/) and the GitHub issue threads: dtcc-twin#1, dtcc-core#85, dtcc-sim#7.
- The meeting transcript in /Users/sarmatas/Projects/dtcc/meetings.
- Primary sources to verify before citing: Shewchuk's Triangle documentation, the TetGen manual, the EPSG registry entry for 3006, WebGL2 specification or WebGL2 Fundamentals, Three.js documentation, vtk.js documentation, the VTK textbook sections on visualization algorithms, VTK.wasm documentation, XDMF documentation.
- The final spike measurement report, added once it exists.

- [ ] **Step 4: Create the shared components**

Create the printable stylesheet (restrained Tufte-like layout, readable line lengths, print styles, accessible contrast, visible citations, mobile-safe fallback), one reusable quiz component with immediate feedback, and a diagram helper reused by pipeline and rendering lessons.

### Task 2: Create the repository, pipeline, and terminology references

**Files:**
- Create: /Users/sarmatas/Projects/dtcc/reference/dtcc-platform-and-3d-pipeline.html
- Create: /Users/sarmatas/Projects/dtcc/reference/glossary.html

- [ ] **Step 1: Build the repository map from source**

Cover dtcc-core, dtcc-mesher, dtcc-tetgen-wrapper, dtcc-sim, dtcc-data, dtcc-upload, dtcc-atlas, dtcc-viewer, dtcc-web, dtcc-tangible-twin, dtcc-agent, dtcc-twin (no local clone; issue-level only), and engine-bench. For each, state responsibility, inputs, outputs, consumers, how it is run, current pinned revisions and dependency edges (for example Core pins dtcc-mesher 7ada8a8; Sim pins Core), current relevance to the 3D work, and post-#85 changes.

- [ ] **Step 2: Build the pipeline diagram**

One end-to-end diagram: raw geodata, city model, terrain raster, surface mesh with markers, volume mesh, simulation fields, XDMF or `.dtcc`, canonical package, browser artifacts, GPU buffers, pixels. Annotate each hop with its repository, function or file, data type, and coordinate frame and precision.

- [ ] **Step 3: Build the glossary**

Follow GLOSSARY-FORMAT.md. Define at least: canonical model, ModelFile, LinkML schema, canonical package, CRS, EPSG:3006, local origin, float32/float64 precision, point cloud, footprint, LOD, raster/DEM, constrained Delaunay triangulation, mesh quality, face marker, surface mesh, volume mesh, tetrahedron, unstructured grid, regular grid, scalar/vector field, field association, XDMF, vertex buffer, index buffer, shader, depth buffer, alpha blending, draping, picking, slice, streamline, isosurface, ray marching, volume rendering, transfer function, occlusion, provenance, adapter, WebGL, WebGPU, and Wasm. Every lesson adheres to it.

- [ ] **Step 4: Add meeting lookup tables**

Include claim-to-evidence, issue-to-decision, and limitation-to-mitigation mappings designed for rapid review before a meeting.

### Task 3: Create twelve short lessons

**Files:**
- Create: lessons/0001-map-the-dtcc-platform.html
- Create: lessons/0002-build-a-city-model-from-raw-data.html
- Create: lessons/0003-generate-the-surface-mesh.html
- Create: lessons/0004-generate-the-volume-mesh.html
- Create: lessons/0005-read-simulation-results.html
- Create: lessons/0006-understand-the-model-after-issue-85.html
- Create: lessons/0007-keep-coordinates-precise.html
- Create: lessons/0008-how-a-browser-draws-3d.html
- Create: lessons/0009-scientific-visualization-techniques.html
- Create: lessons/0010-understand-the-renderer-limitations.html
- Create: lessons/0011-explain-the-scientific-visualization-spike.html
- Create: lessons/0012-rehearse-the-meeting-conversation.html

Build each lesson only after reading the relevant source; lessons after 0001 open with retrieval questions from earlier lessons.

- [ ] **Step 1: Lesson 1, platform map**

Who produces and consumes what across Data, Core, Mesher, TetGen wrapper, Sim, Upload, Atlas, Viewer, Web, Tangible Twin, Agent, Twin, and engine-bench; the assignment history and why GitHub issues became the work queue. Win condition: draw the platform map from memory and name each edge's data type.

- [ ] **Step 2: Lesson 2, raw data to a city model**

Point clouds, footprints, terrain rasters, building heights, and Core's builder, traced through engine-bench stage1_build.py and dtcc_core.builder. Exercise: inspect a city built in a scratch directory or the committed dataset.json and identify buildings, terrain, bounds, and CRS. Win condition: narrate the builder steps and what each consumes.

- [ ] **Step 3: Lesson 3, surface meshing**

dtcc-mesher's constrained Delaunay triangulation and quality refinement, Core's meshing backends, and face markers (-2 ground, -1 halo, >= 0 building index) and why the spike preserves them as building identity. Exercise: load committed buildings/ground mesh artifacts and count faces per marker class. Win condition: explain how a triangle maps back to a building.

- [ ] **Step 4: Lesson 4, volume meshing**

The TetGen wrapper, tetrahedral cells, VolumeMesh, and why simulation needs volumes, not surfaces. Exercise: read heat.xdmf metadata (50,729 vertices, 182,331 cells) and relate vertices and cells to the mesh. Win condition: explain surface-to-volume meshing and what a cell is.

- [ ] **Step 5: Lesson 5, simulation results**

dtcc-sim's urban heat and wind workflows, fields (values, unit, dimension, association), XDMF output, and how engine-bench samples the heat field onto a regular grid. Exercise: compare field value ranges and units in field.json against the solver output. Win condition: explain vertex versus cell association and why resampling can change values.

- [ ] **Step 6: Lesson 6, the model after #85**

`DTCC.ModelFile` v6 and `.dtcc`, LinkML schema 0.9.0, typed float64 arrays, what round-trips and what fails explicitly (FieldSlice, StreamlineCollection), canonical packages through Upload and Atlas, Tangible Twin's consumption, and unpublished follow-ups F1-F4. Exercise: read dtcc.proto and model-inventory.md at 4c8d621 and classify five model types as supported or unsupported with the reason. Win condition: explain why the spike's manifest is local evidence, not a platform contract.

- [ ] **Step 7: Lesson 7, coordinates and precision**

EPSG:3006, projected metres, local origins and rebasing, float32 spacing near a northing of 6.4 million, and why the spike uses a 5 cm alignment gate. Exercise: compute float32 error for a real Gothenburg coordinate with and without rebasing. Win condition: explain why GPUs need a local origin.

- [ ] **Step 8: Lesson 8, how a browser draws 3D**

WebGL2 vertex and index buffers, vertex and fragment shaders, the depth buffer, draw order, alpha blending and why transparency is order-dependent, and GPU picking. Win condition: predict what goes wrong when a transparent volume is drawn without city depth.

- [ ] **Step 9: Lesson 9, scientific visualization techniques**

Slices, streamlines, isosurfaces, ray-marched volume rendering, transfer functions, and how vtk.js and Three.js each provide or lack them. Win condition: choose the right technique for a given DTCC question and name its renderer cost.

- [ ] **Step 10: Lesson 10, renderer evidence**

MapLibre custom-layer terrain behavior, deck.gl/Three.js attachment, shader value loss, baked colors, picking, vtk.js regular-grid volume, and the meaning of the ELEMENTS counterexample, using engine-bench pages and NOTES.md. Win condition: explain each limitation without overstating it.

- [ ] **Step 11: Lesson 11, the decision spike**

Shared inputs, single-canvas depth, Three.js versus vtk.js, correctness gates, performance measurements, maintenance burden, the post-#85 revision upgrade, and VTK.wasm's bounded role. Win condition: defend why the spike can return neither.

- [ ] **Step 12: Lesson 12, meeting rehearsal**

Reconstruct the issue comments and Anders's feedback, including #85. Provide objection handling, a two-minute talk track, a five-minute deep version, and an exercise where Spyros answers likely developer questions (including platform and pipeline questions from lessons 1-9) before revealing model answers. Mark measurement-dependent claims as pending until spike Task 9.

### Task 4: Verify and run the feedback loop

**Files:**
- Create after each practiced lesson: learning-records/NNNN-<lesson-name>.md

- [ ] **Step 1: Render and inspect every HTML artifact**

Open each lesson and reference document, verify navigation, typography, printing, citations, diagrams, quiz behavior, and no console errors.

- [ ] **Step 2: Deliver lessons in order**

All lessons are available from learning/index.html. The learner self-paces, one lesson per sitting, and records attempts in PROGRESS.md; review and adapt remaining lessons when asked.

- [ ] **Step 3: Give immediate feedback**

Correct factual gaps, distinguish weak recall from conceptual misunderstanding, and adapt the next lesson's difficulty.

- [ ] **Step 4: Write learning records**

Record demonstrated knowledge, misconceptions, questions, and the next retrieval date using the skill format. Do not infer mastery from reading time.

- [ ] **Step 5: Revise lesson 12 after spike evidence**

After spike Task 9, replace pending slots with verified measurements and update the claim-to-evidence table.

## Verification

- Mission is measurable and covers platform, pipeline, rendering, and meeting capability.
- Every DTCC-internal claim cites local source or repository docs at a named revision.
- Every lesson links the reference, the glossary, and one primary source.
- Every lesson has an active exercise, a retrieval opener after lesson 1, and a follow-up invitation.
- No exercise mutated engine-bench data or DTCC clone revisions.
- Reference pages print cleanly.
- Quiz choices do not reveal answers through length or formatting.
- Learning records reflect observed performance.
