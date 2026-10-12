import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import "@kitware/vtk.js/Rendering/Profiles/Volume";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import type { Map as MapLibreMap } from "maplibre-gl6";
import { sweref } from "./sweref";
import {
  OVERLAY_OPACITY,
  OVERLAY_TINT,
  opacityNodes,
  PANEL_START,
  type SceneMesh,
  type SpikeScene,
  VOLUME_STEP_M,
} from "./scene-data";

const STOPS: [number, number, number][] = [
  [33, 102, 172],
  [67, 200, 220],
  [120, 200, 80],
  [250, 220, 50],
  [200, 30, 30],
];

/** One scene mesh as a vtk.js actor: `color` for plain meshes, the mesh's own RGB for the heatmap. */
function meshActor(mesh: SceneMesh, color: [number, number, number]) {
  const poly = vtkPolyData.newInstance();
  poly.getPoints().setData(mesh.positions, 3);
  const cells = new Uint32Array(mesh.triangles * 4);
  for (let t = 0; t < mesh.triangles; t++) cells.set([3, 3 * t, 3 * t + 1, 3 * t + 2], 4 * t);
  poly.getPolys().setData(cells);
  poly.getPointData().setNormals(vtkDataArray.newInstance({ name: "normals", values: mesh.normals, numberOfComponents: 3 }));
  const mapper = vtkMapper.newInstance();
  mapper.setInputData(poly);
  if (mesh.colors) {
    // The heatmap's colours are final RGB, already through the shared colormap: no lookup table.
    poly.getPointData().setScalars(vtkDataArray.newInstance({ name: "rgb", values: mesh.colors, numberOfComponents: 3 }));
    mapper.setColorModeToDirectScalars();
  } else mapper.setScalarVisibility(false);
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setColor(...color);
  // A heatmap's colour is the data: mostly ambient, so faces at a grazing angle to the light don't go dark.
  // Back faces culled, as Three.js does by default: drawn, they speckled core's walls. Safe because core's winding
  // is consistent and outward (NOTES, "dtcc-core's city surface mesh on page 21").
  if (mesh.colors) actor.getProperty().set({ ambient: 0.6, diffuse: 0.4, backfaceCulling: true });
  return actor;
}

/** vtk.js's render window in `host`, with the spike's buildings and volume, matching three-scene.ts's look. */
function createVtkScene(host: HTMLElement, data: SpikeScene, background: [number, number, number, number]) {
  const view = vtkGenericRenderWindow.newInstance({ background, listenWindowResize: false });
  view.setContainer(host);
  const renderer = view.getRenderer();

  renderer.addActor(meshActor(data.buildings, [0.72, 0.77, 0.81]));
  if (data.overlay) {
    const overlay = meshActor(data.overlay, OVERLAY_TINT);
    // Translucent actors go through vtk.js's own transparency pass; culled back faces keep the shell readable.
    overlay.getProperty().set({ opacity: OVERLAY_OPACITY, backfaceCulling: true });
    renderer.addActor(overlay);
  }
  const camera = renderer.getActiveCamera();
  camera.setViewAngle(PANEL_START.fovDeg);
  // trap: delete() releases vtk.js's objects but not the WebGL context, which then lives until GC.
  const release = () => {
    const gl = (
      view.getApiSpecificRenderWindow() as unknown as { getContext(): WebGL2RenderingContext | null }
    ).getContext();
    view.delete();
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  };
  if (!data.field) return { view, renderer, camera, release };

  const { dims, origin, spacing, range, speed } = data.field;
  const image = vtkImageData.newInstance();
  image.setDimensions(dims);
  image.setOrigin(origin);
  image.setSpacing(spacing);
  image.getPointData().setScalars(vtkDataArray.newInstance({ name: "speed", values: speed, numberOfComponents: 1 }));
  const ctf = vtkColorTransferFunction.newInstance();
  STOPS.forEach(([r, g, b], i) =>
    ctf.addRGBPoint(range[0] + (i / (STOPS.length - 1)) * (range[1] - range[0]), r / 255, g / 255, b / 255),
  );
  const opacity = vtkPiecewiseFunction.newInstance();
  for (const [value, alpha] of opacityNodes(range)) opacity.addPoint(value, alpha);
  const volumeMapper = vtkVolumeMapper.newInstance();
  volumeMapper.setInputData(image);
  volumeMapper.setSampleDistance(VOLUME_STEP_M);
  const volume = vtkVolume.newInstance();
  volume.setMapper(volumeMapper);
  volume.getProperty().setRGBTransferFunction(0, ctf);
  volume.getProperty().setScalarOpacity(0, opacity);
  // Unit distance = step, so each sample carries exactly the transfer function's opacity, as three-scene.ts does.
  volume.getProperty().setScalarOpacityUnitDistance(0, VOLUME_STEP_M);
  renderer.addVolume(volume);
  return { view, renderer, camera, release };
}

/** vtk.js in its own canvas inside `host`, with its trackball interactor. Returns the teardown. */
export function mountVtkPanel(host: HTMLElement, data: SpikeScene): () => void {
  const { view, renderer, camera, release } = createVtkScene(host, data, [0.957, 0.961, 0.969, 1]);
  camera.setPosition(...PANEL_START.position);
  camera.setFocalPoint(...PANEL_START.target);
  camera.setViewUp(0, 0, 1);
  renderer.resetCameraClippingRange();
  const resize = new ResizeObserver(() => {
    view.resize();
    view.getRenderWindow().render();
  });
  resize.observe(host);
  return () => {
    resize.disconnect();
    release();
  };
}

/**
 * vtk.js over the map: vtk.js can't draw into MapLibre's context, so it gets its own transparent canvas on top, its
 * camera rebuilt from the map's public camera state after every map frame. Returns the teardown.
 */
export function mountVtkOverlay(host: HTMLElement, map: MapLibreMap, data: SpikeScene): () => void {
  const { view, renderer, camera, release } = createVtkScene(host, data, [0, 0, 0, 0]);
  const toLocal = (lng: number, lat: number) => {
    const [x, y] = sweref.forward([lng, lat]) as [number, number];
    return [x - data.origin[0], y - data.origin[1]] as const;
  };
  const sync = () => {
    const { lng, lat } = map.getCenter();
    const [cx, cy] = toLocal(lng, lat);
    // True north in local metres: SWEREF's grid north is a couple of degrees off it here.
    const [nx0, ny0] = toLocal(lng, lat + 0.001);
    const nLength = Math.hypot(nx0 - cx, ny0 - cy);
    const north = [(nx0 - cx) / nLength, (ny0 - cy) / nLength] as const;
    const east = [north[1], -north[0]] as const;
    const bearing = (map.getBearing() * Math.PI) / 180,
      pitch = (map.getPitch() * Math.PI) / 180;
    const fov = map.getVerticalFieldOfView();
    // MapLibre's camera sits 0.5 / tan(fov / 2) canvas heights from the centre, in CSS pixels of 512-px tiles.
    const metresPerPixel = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** map.getZoom());
    const distance = (0.5 / Math.tan((fov * Math.PI) / 360)) * map.getCanvas().clientHeight * metresPerPixel;
    const ahead = [
      north[0] * Math.cos(bearing) + east[0] * Math.sin(bearing),
      north[1] * Math.cos(bearing) + east[1] * Math.sin(bearing),
    ];
    camera.setViewAngle(fov);
    camera.setFocalPoint(cx, cy, 0);
    camera.setPosition(
      cx - ahead[0]! * distance * Math.sin(pitch),
      cy - ahead[1]! * distance * Math.sin(pitch),
      distance * Math.cos(pitch),
    );
    camera.setViewUp(ahead[0]! * Math.cos(pitch), ahead[1]! * Math.cos(pitch), Math.sin(pitch));
    renderer.resetCameraClippingRange();
    view.getRenderWindow().render();
  };
  const resize = new ResizeObserver(() => {
    view.resize();
    sync();
  });
  resize.observe(host);
  map.on("render", sync);
  sync();
  return () => {
    map.off("render", sync);
    resize.disconnect();
    release();
  };
}
