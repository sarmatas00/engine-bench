/**
 * VTK.wasm feasibility probe. See spikes/vtk-wasm/README.md for the gate.
 *
 * Every assertion below is written so that a FALSE result looks different from
 * a true one. Where the obvious check would pass for the wrong reason, the
 * anti-coincidence measure is named in a comment.
 */
import {loadAsync} from '@kitware/vtk-wasm';
import {loadScientificBundle} from '@repo/scientific-data';

type Status = 'pass' | 'fail' | 'not-reached';
const assertions: Record<string, {status: Status; evidence?: unknown; error?: string}> = {};
const result: Record<string, unknown> = {};
const timeline: Array<{mark: string; t: number}> = [];

const probe = {assertions, result, timeline, done: false, fatal: null as string | null};
(window as any).__probe = probe;

const mark = (name: string) => {
  const t = performance.now();
  timeline.push({mark: name, t});
  return t;
};
const setStatus = (s: string) => {
  const el = document.getElementById('status');
  if (el) el.textContent = s;
};
const pass = (id: string, evidence: unknown) => {
  assertions[id] = {status: 'pass', evidence};
};
const fail = (id: string, error: string, evidence?: unknown) => {
  assertions[id] = {status: 'fail', error, evidence};
};

for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11']) {
  assertions[id] = {status: 'not-reached'};
}

const RUNTIME_URL = '/vtk/vtk-wasm32-emscripten.tar.gz';
const CANVAS_KEY = '!probe-canvas';

function bounds3(a: Float32Array): number[] {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < a.length; i += 3) {
    if (a[i] < x0) x0 = a[i];
    if (a[i] > x1) x1 = a[i];
    if (a[i + 1] < y0) y0 = a[i + 1];
    if (a[i + 1] > y1) y1 = a[i + 1];
    if (a[i + 2] < z0) z0 = a[i + 2];
    if (a[i + 2] > z1) z1 = a[i + 2];
  }
  return [x0, y0, z0, x1, y1, z1];
}

async function main() {
  const canvas = document.getElementById('probe-canvas') as HTMLCanvasElement;
  canvas.width = 1200;
  canvas.height = 800;

  // ---------------------------------------------------------------- artifacts
  setStatus('validating shared artifacts');
  const tArtifactStart = mark('artifact-load-start');
  const bundle = await loadScientificBundle();
  const tValidated = mark('artifact-validated');
  result.artifactLoadMs = +(tValidated - tArtifactStart).toFixed(1);

  const m = bundle.manifest;
  const frameOk =
    m.schemaVersion === 1 &&
    m.coordinateFrame.crs === 'EPSG:3006' &&
    m.coordinateFrame.origin[0] === 318619 &&
    m.coordinateFrame.origin[1] === 6399140;
  result.manifest = {
    schemaVersion: m.schemaVersion,
    crs: m.coordinateFrame.crs,
    origin: m.coordinateFrame.origin,
    z0: m.coordinateFrame.z0,
    localBounds: m.coordinateFrame.localBounds,
    binarySha256: m.binary.sha256,
    binaryByteLength: m.binary.byteLength,
    dtccCoreRevision: (m as any).cases.smoke.dtccCoreRevision,
    dataCategory: (m as any).cases.smoke.dataCategory,
    dependencyCount: m.dependencies.length,
  };
  if (!frameOk) {
    fail('A3', `coordinate frame mismatch: ${JSON.stringify(result.manifest)}`);
    throw new Error('coordinate frame mismatch');
  }

  // ------------------------------------------------------------ VTK runtime
  setStatus('fetching + compiling VTK.wasm runtime');
  // t0 is taken BEFORE the first byte of the runtime is requested (A8). Nothing
  // between this mark and loadAsync touches the network.
  const tWasmStart = mark('wasm-load-start');
  const runtime = await loadAsync({
    url: RUNTIME_URL,
    urlIsGzip: true,
    rendering: 'webgl',
    print: (t: string) => timeline.push({mark: `stdout: ${t}`, t: performance.now()}),
    printErr: (t: string) => timeline.push({mark: `stderr: ${t}`, t: performance.now()}),
  });
  const tWasmReady = mark('wasm-runtime-ready');

  const session = runtime.createStandaloneSession();
  const tSession = mark('session-created');

  // A1: a session object exists is not evidence. Call something only a live
  // session can answer, and record the value.
  const liveProbeObject = session.vtk.vtkConeSource();
  const liveProbeId = (liveProbeObject as any).$id;
  const liveProbeStr = String(liveProbeObject.toString()).split('\n')[0];
  const tFirstVtkObject = timeline[timeline.length - 1]?.t ?? mark('first-vtk-object');
  mark('first-vtk-object');
  liveProbeObject.$delete();
  if (typeof liveProbeId === 'number' && liveProbeId > 0 && /vtkConeSource/.test(liveProbeStr)) {
    pass('A1', {
      sessionDisposedFlag: session.disposed,
      liveCallResult: liveProbeStr,
      objectId: liveProbeId,
      runtimeId: runtime.id,
      isAsync: runtime.isAsync(),
    });
  } else {
    fail('A1', `live-session call returned ${JSON.stringify(liveProbeStr)} id=${liveProbeId}`);
  }

  // A3: validation must complete before the first VTK object exists.
  const firstVtkMark = timeline.find((e) => e.mark === 'first-vtk-object')!.t;
  if (tValidated < firstVtkMark) {
    pass('A3', {
      validatedAtMs: +tValidated.toFixed(1),
      firstVtkObjectAtMs: +firstVtkMark.toFixed(1),
      orderedCorrectly: true,
      verifiedFiles: m.dependencies.length + 1,
      binarySha256: m.binary.sha256,
      note: 'negative control result recorded under result.negativeControl',
    });
  } else {
    fail('A3', `first VTK object at ${firstVtkMark} preceded validation at ${tValidated}`);
  }

  // ----------------------------------------------------------------- canvas
  const registeredKey = session.registerCanvas(CANVAS_KEY, canvas);
  const targets = (runtime as any).module?.specialHTMLTargets;
  const registeredNode = targets ? targets[CANVAS_KEY] : undefined;
  const canvasCount = document.querySelectorAll('canvas').length;
  if (canvasCount === 1 && registeredNode === canvas && registeredKey === CANVAS_KEY) {
    pass('A2', {
      canvasesInDocument: canvasCount,
      registeredKey,
      registeredNodeIsTheCanvas: true,
      canvasSize: [canvas.width, canvas.height],
    });
  } else {
    fail('A2', `canvasCount=${canvasCount} registeredNodeIsTheCanvas=${registeredNode === canvas}`);
  }

  // ------------------------------------------------------------------ scene
  setStatus('building scene');
  const vtk = session.vtk as any;
  const tai = session.typedArrayInterface;

  function polyData(positions: Float32Array, indices: Uint32Array, scalars?: Float32Array) {
    const points = vtk.vtkPoints();
    points.setData(tai.toVTKAoSArray(positions, 3, 'Points'));
    const nTri = indices.length / 3;
    const offsets = new Int32Array(nTri + 1);
    for (let i = 0; i <= nTri; i++) offsets[i] = i * 3;
    const conn = new Int32Array(indices.length);
    conn.set(indices);
    const cells = vtk.vtkCellArray();
    const ok = cells.setData(
      tai.toVTKAoSArray(offsets, 1, 'Offsets'),
      tai.toVTKAoSArray(conn, 1, 'Connectivity'),
    );
    if (ok === false) throw new Error('vtkCellArray.setData returned false');
    const pd = vtk.vtkPolyData();
    pd.setPoints(points);
    pd.setPolys(cells);
    if (scalars) pd.getPointData().setScalars(tai.toVTKAoSArray(scalars, 1, 'scalars'));
    return pd;
  }

  const renderer = vtk.vtkRenderer();
  renderer.setBackground(0.055, 0.07, 0.1);
  const renderWindow = vtk.vtkRenderWindow();
  renderWindow.addRenderer(renderer);
  renderWindow.setCanvasSelector(CANVAS_KEY);
  renderWindow.setSize(canvas.width, canvas.height);
  result.renderWindowClass = String(renderWindow.toString()).split('\n')[0].trim();

  // -- city geometry, straight off the hash-verified arrays (A4)
  const b = bundle.city.buildings;
  const g = bundle.city.terrain;
  const buildingsPD = polyData(b.positions, b.indices);
  const terrainPD = polyData(g.positions, g.indices);

  const mkActor = (pd: any, rgb: number[], opacity: number) => {
    const mapper = vtk.vtkPolyDataMapper();
    mapper.setInputData(pd);
    mapper.setScalarVisibility(false);
    const actor = vtk.vtkActor();
    actor.setMapper(mapper);
    actor.getProperty().setColor(rgb[0], rgb[1], rgb[2]);
    actor.getProperty().setOpacity(opacity);
    renderer.addActor(actor);
    return {actor, mapper};
  };
  const buildingsActor = mkActor(buildingsPD, [0.78, 0.80, 0.85], 1.0);
  const terrainActor = mkActor(terrainPD, [0.24, 0.30, 0.26], 1.0);

  const srcBounds = bounds3(b.positions);
  const vtkBuildingBounds = buildingsActor.actor.getBounds();
  const nPointsVtk = buildingsPD.getNumberOfPoints();
  const nCellsVtk = buildingsPD.getNumberOfCells();
  const boundsAgree = srcBounds.every(
    (v, i) => Math.abs(v - (vtkBuildingBounds as number[])[[0, 2, 4, 1, 3, 5][i]]) < 1e-3,
  );
  const countsAgree = nPointsVtk === b.positions.length / 3 && nCellsVtk === b.indices.length / 3;
  result.city = {
    buildings: {
      sourceVertices: b.positions.length / 3,
      sourceTriangles: b.indices.length / 3,
      vtkPoints: nPointsVtk,
      vtkCells: nCellsVtk,
      sourceBounds: srcBounds.map((v) => +v.toFixed(3)),
      vtkActorBounds: (vtkBuildingBounds as number[]).map((v) => +v.toFixed(3)),
      firstTriple: [b.positions[0], b.positions[1], b.positions[2]],
      lastTriple: [
        b.positions[b.positions.length - 3],
        b.positions[b.positions.length - 2],
        b.positions[b.positions.length - 1],
      ],
    },
    terrain: {
      sourceVertices: g.positions.length / 3,
      sourceTriangles: g.indices.length / 3,
      vtkPoints: terrainPD.getNumberOfPoints(),
      vtkCells: terrainPD.getNumberOfCells(),
    },
  };
  if (countsAgree && boundsAgree) {
    pass('A4', result.city);
  } else {
    fail('A4', `counts agree=${countsAgree} bounds agree=${boundsAgree}`, result.city);
  }

  // -- the scientific field: the smoke case as a volume (A5)
  const grid = bundle.smoke.grid;
  const image = vtk.vtkImageData();
  image.setDimensions(grid.dims[0], grid.dims[1], grid.dims[2]);
  image.setOrigin(grid.origin[0], grid.origin[1], grid.origin[2]);
  image.setSpacing(grid.spacing[0], grid.spacing[1], grid.spacing[2]);
  const speedArray = tai.toVTKAoSArray(grid.speed, 1, 'grid_speed');
  image.getPointData().setScalars(speedArray);
  const speedRange = speedArray.getRange();

  const ctf = vtk.vtkColorTransferFunction();
  const otf = vtk.vtkPiecewiseFunction();
  const [smin, smax] = speedRange as number[];
  ctf.addRGBPoint(smin, 0.13, 0.22, 0.55);
  ctf.addRGBPoint(smin + (smax - smin) * 0.5, 0.25, 0.72, 0.62);
  ctf.addRGBPoint(smax, 0.98, 0.79, 0.22);
  otf.addPoint(smin, 0.0);
  otf.addPoint(smin + (smax - smin) * 0.25, 0.04);
  otf.addPoint(smax, 0.5);

  const volumeProperty = vtk.vtkVolumeProperty();
  volumeProperty.setColor(ctf);
  volumeProperty.setScalarOpacity(otf);
  volumeProperty.setInterpolationTypeToLinear();
  volumeProperty.shadeOff();

  const volumeMapper = vtk.vtkSmartVolumeMapper();
  volumeMapper.setInputData(image);
  volumeMapper.setBlendModeToComposite();

  const volume = vtk.vtkVolume();
  volume.setMapper(volumeMapper);
  volume.setProperty(volumeProperty);
  renderer.addVolume(volume);

  const volumeBounds = volume.getBounds() as number[];
  const lb = m.coordinateFrame.localBounds;
  const nonDegenerate =
    volumeBounds[1] - volumeBounds[0] > 1 &&
    volumeBounds[3] - volumeBounds[2] > 1 &&
    volumeBounds[5] - volumeBounds[4] > 1;
  const insideLocalBounds =
    volumeBounds[0] >= lb[0] - 1e-3 && volumeBounds[1] <= lb[3] + 1e-3 &&
    volumeBounds[2] >= lb[1] - 1e-3 && volumeBounds[3] <= lb[4] + 1e-3 &&
    volumeBounds[4] >= lb[2] - 1e-3 && volumeBounds[5] <= lb[5] + 1e-3;
  result.volume = {
    dims: grid.dims,
    origin: grid.origin,
    spacing: grid.spacing,
    association: grid.association,
    vtkPoints: image.getNumberOfPoints(),
    sourceValues: grid.speed.length,
    scalarRangeFromVtk: (speedRange as number[]).map((v) => +v.toFixed(6)),
    scalarRangeFromSource: [Math.min(...grid.speed), Math.max(...grid.speed)].map((v) => +v.toFixed(6)),
    vtkVolumeBounds: volumeBounds.map((v) => +v.toFixed(3)),
    manifestLocalBounds: lb,
    nonDegenerate,
    insideLocalBounds,
  };
  if (image.getNumberOfPoints() === grid.speed.length && nonDegenerate && insideLocalBounds) {
    pass('A5', result.volume);
  } else {
    fail('A5', `points=${image.getNumberOfPoints()} nonDegenerate=${nonDegenerate} inside=${insideLocalBounds}`, result.volume);
  }

  // ------------------------------------------------------------ provenance
  const label = document.getElementById('provenance')!;
  label.textContent = [
    `VTK.wasm probe - ${(m as any).cases.smoke.dataCategory} smoke case`,
    `CRS ${m.coordinateFrame.crs}  origin ${m.coordinateFrame.origin.join(', ')}  z0 ${m.coordinateFrame.z0.toFixed(4)}`,
    `dtcc-core ${(m as any).cases.smoke.dtccCoreRevision}`,
    `scientific.bin ${m.binary.byteLength} B  sha256 ${m.binary.sha256}`,
  ].join('\n');
  const labelText = label.textContent || '';
  const labelVisible = label.getBoundingClientRect().height > 0 && getComputedStyle(label).visibility !== 'hidden';
  const revPrefix = String((m as any).cases.smoke.dtccCoreRevision).slice(0, 12);
  const shaPrefix = m.binary.sha256.slice(0, 12);
  if (labelVisible && labelText.includes(revPrefix) && labelText.includes(shaPrefix)) {
    pass('A6', {
      textContent: labelText,
      revisionPrefixFound: revPrefix,
      shaPrefixFound: shaPrefix,
      boundingRect: label.getBoundingClientRect().toJSON(),
    });
  } else {
    fail('A6', `visible=${labelVisible} containsRevision=${labelText.includes(revPrefix)} containsSha=${labelText.includes(shaPrefix)}`);
  }

  // --------------------------------------------------------------- interact
  setStatus('rendering');
  const interactor = vtk.vtkRenderWindowInteractor();
  interactor.setCanvasSelector(CANVAS_KEY);
  interactor.setRenderWindow(renderWindow);
  const style = vtk.vtkInteractorStyleTrackballCamera();
  interactor.setInteractorStyle(style);
  interactor.initialize();

  const camera = renderer.getActiveCamera();
  renderer.resetCamera();
  camera.elevation(-35);
  camera.orthogonalizeViewUp();
  renderer.resetCameraClippingRange();

  const tRenderStart = mark('first-render-start');
  renderWindow.render();
  const tRenderEnd = mark('first-render-end');

  // A11: read the pixels back in the same task as the render.
  const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGL2RenderingContext | null;
  let pixelEvidence: any = {error: 'no WebGL context reachable from the canvas'};
  if (gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const w = canvas.width, h = canvas.height;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const colours = new Set<number>();
    let nonBackground = 0;
    const bg = [Math.round(0.055 * 255), Math.round(0.07 * 255), Math.round(0.1 * 255)];
    for (let i = 0; i < px.length; i += 4) {
      colours.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
      if (Math.abs(px[i] - bg[0]) > 6 || Math.abs(px[i + 1] - bg[1]) > 6 || Math.abs(px[i + 2] - bg[2]) > 6) nonBackground++;
    }
    pixelEvidence = {
      canvasPixels: w * h,
      distinctColours: colours.size,
      nonBackgroundPixels: nonBackground,
      nonBackgroundFraction: +(nonBackground / (w * h)).toFixed(4),
      glVersion: gl.getParameter(gl.VERSION),
      glRenderer: (() => {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter((ext as any).UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      })(),
      contextLost: gl.isContextLost(),
    };
  }
  const propsRendered = renderer.getNumberOfPropsRendered();
  result.firstFrame = {
    ...pixelEvidence,
    propsRendered,
    renderMs: +(tRenderEnd - tRenderStart).toFixed(1),
  };
  if (pixelEvidence.distinctColours > 1 && pixelEvidence.nonBackgroundPixels > 0 && propsRendered >= 3) {
    pass('A11', result.firstFrame);
  } else {
    fail('A11', `distinctColours=${pixelEvidence.distinctColours} nonBackground=${pixelEvidence.nonBackgroundPixels} propsRendered=${propsRendered}`, result.firstFrame);
  }

  // one camera interaction, plus a steady-state interaction measurement
  const posBefore = (camera.getPosition() as number[]).slice();
  const frames: number[] = [];
  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    camera.azimuth(2);
    renderer.resetCameraClippingRange();
    renderWindow.render();
    frames.push(performance.now() - t0);
  }
  const posAfter = (camera.getPosition() as number[]).slice();
  frames.sort((x, y) => x - y);
  result.interaction = {
    cameraMoved: posBefore.some((v, i) => Math.abs(v - posAfter[i]) > 1e-6),
    cameraBefore: posBefore.map((v) => +v.toFixed(2)),
    cameraAfter: posAfter.map((v) => +v.toFixed(2)),
    frames: frames.length,
    medianFrameMs: +frames[Math.floor(frames.length / 2)].toFixed(2),
    p95FrameMs: +frames[Math.floor(frames.length * 0.95)].toFixed(2),
    minFrameMs: +frames[0].toFixed(2),
    maxFrameMs: +frames[frames.length - 1].toFixed(2),
  };

  // ------------------------------------------------------- timings + bytes
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const runtimeEntries = entries
    .filter((e) => e.name.includes('/vtk/'))
    .map((e) => ({
      url: e.name.replace(location.origin, ''),
      transferSize: e.transferSize,
      encodedBodySize: e.encodedBodySize,
      decodedBodySize: e.decodedBodySize,
      durationMs: +e.duration.toFixed(1),
    }));
  const artifactEntries = entries
    .filter((e) => e.name.includes('/data/'))
    .map((e) => ({
      url: e.name.replace(location.origin, ''),
      transferSize: e.transferSize,
      encodedBodySize: e.encodedBodySize,
      durationMs: +e.duration.toFixed(1),
    }));
  const runtimeTransferred = runtimeEntries.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0);
  const runtimeDecoded = runtimeEntries.reduce((s, e) => s + (e.decodedBodySize || 0), 0);
  const runtimeFetchMs = runtimeEntries.reduce((s, e) => s + e.durationMs, 0);

  result.init = {
    // Includes fetch AND decompress AND compile AND instantiate: t0 is before
    // the first runtime byte is requested.
    runtimeLoadTotalMs: +(tWasmReady - tWasmStart).toFixed(1),
    runtimeFetchMsFromResourceTiming: +runtimeFetchMs.toFixed(1),
    decompressCompileInstantiateMs: +(tWasmReady - tWasmStart - runtimeFetchMs).toFixed(1),
    createStandaloneSessionMs: +(tSession - tWasmReady).toFixed(1),
    firstFrameFromWasmStartMs: +(tRenderEnd - tWasmStart).toFixed(1),
    artifactLoadAndVerifyMs: result.artifactLoadMs,
  };
  result.bytes = {
    runtimeTransferredBytes: runtimeTransferred,
    runtimeDecodedBytes: runtimeDecoded,
    runtimeRequests: runtimeEntries,
    artifactTransferredBytes: artifactEntries.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0),
    artifactRequests: artifactEntries,
  };
  result.backend = {
    renderWindowClass: result.renderWindowClass,
    vtkRenderingBackend: (() => { try { return renderWindow.getRenderingBackend(); } catch (e) { return `error: ${(e as Error).message}`; } })(),
    glVersionFromLiveContext: (result.firstFrame as any).glVersion,
    glRendererFromLiveContext: (result.firstFrame as any).glRenderer,
    requestedRendering: 'webgl',
    wasmHeapBytes: ((runtime as any).module?.HEAPU8?.byteLength) ?? null,
  };
  if (runtimeTransferred > 0) {
    pass('A9', result.bytes);
  } else {
    fail('A9', 'no runtime resource-timing entries with a transfer size');
  }
  if ((result.init as any).runtimeLoadTotalMs > 0 && runtimeFetchMs > 0) {
    pass('A8', result.init);
  } else {
    fail('A8', `runtimeLoadTotalMs=${(result.init as any).runtimeLoadTotalMs} fetchMs=${runtimeFetchMs}`);
  }

  // ------------------------------------------------ negative control for A3
  setStatus('running the negative control');
  (window as any).__corruptScientificBin = true;
  let control: any;
  try {
    await loadScientificBundle();
    control = {rejected: false, error: null};
  } catch (e) {
    control = {rejected: true, error: (e as Error).message};
  }
  (window as any).__corruptScientificBin = false;
  result.negativeControl = control;
  if (!control.rejected) {
    fail('A3', 'the loader accepted a scientific.bin with one byte flipped: its hash check is not load-bearing', control);
  } else if (assertions.A3.status === 'pass') {
    assertions.A3.evidence = {...(assertions.A3.evidence as object), negativeControl: control};
  }

  // ------------------------------------------------------------- teardown
  setStatus('disposing');
  const heapBefore = ((runtime as any).module?.HEAPU8?.byteLength) ?? null;
  const preDisposeCall = String(renderWindow.toString()).split('\n')[0].trim();
  session.dispose();
  const heapAfter = ((runtime as any).module?.HEAPU8?.byteLength) ?? null;

  let newObjectError: string | null = null;
  try {
    const x = session.vtk.vtkConeSource();
    newObjectError = `NO THROW - returned id ${(x as any).$id}`;
  } catch (e) {
    newObjectError = (e as Error).message;
  }
  let staleProxyError: string | null = null;
  try {
    const s = renderWindow.toString();
    staleProxyError = `NO THROW - returned ${String(s).split('\n')[0]}`;
  } catch (e) {
    staleProxyError = (e as Error).message;
  }
  const targetsAfter = (runtime as any).module?.specialHTMLTargets;
  const teardown = {
    disposedFlag: session.disposed,
    preDisposeCall,
    newObjectAfterDispose: newObjectError,
    staleProxyAfterDispose: staleProxyError,
    canvasStillInSpecialHTMLTargets: targetsAfter ? CANVAS_KEY in targetsAfter : null,
    canvasStillInDocument: document.body.contains(canvas),
    wasmHeapBytesBefore: heapBefore,
    wasmHeapBytesAfter: heapAfter,
    glContextLost: gl ? gl.isContextLost() : null,
    note: 'Emscripten cannot return heap to the OS before reload; the session-release evidence is that calls through the session now throw.',
  };
  result.teardown = teardown;
  const releasedForReal =
    session.disposed === true &&
    !String(newObjectError).startsWith('NO THROW') &&
    !String(staleProxyError).startsWith('NO THROW');
  if (releasedForReal) {
    pass('A7', teardown);
  } else {
    fail('A7', `disposed=${session.disposed} newObject=${newObjectError} staleProxy=${staleProxyError}`, teardown);
  }

  // ------------------------------------------------------ console / network
  const errors = (window as any).__probeErrors as any[];
  const net = (window as any).__probeNet as any[];
  const badResponses = net.filter((r) => !r.ok);
  result.console = {errorCount: errors.length, errors: errors.slice(0, 25)};
  result.network = {
    requestCount: net.length,
    failedCount: badResponses.length,
    failed: badResponses.slice(0, 25),
    reachedTerminalState: true,
  };
  if (errors.length === 0 && badResponses.length === 0) {
    pass('A10', {...(result.console as object), ...(result.network as object)});
  } else {
    fail('A10', `console errors=${errors.length} failed responses=${badResponses.length}`, {
      errors: errors.slice(0, 25),
      failed: badResponses.slice(0, 25),
    });
  }

  setStatus('probe complete');
}

main()
  .then(() => {
    probe.done = true;
  })
  .catch((e) => {
    probe.fatal = `${(e as Error).name}: ${(e as Error).message}\n${(e as Error).stack}`;
    probe.done = true;
    setStatus(`FAILED: ${(e as Error).message}`);
  });
