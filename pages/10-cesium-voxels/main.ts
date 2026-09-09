import * as Cesium from 'cesium';
import {mountChrome, requireWebGL2, noFieldForThisDataset} from '@lib/chrome';
import {makeViewer, enuMatrix, whenTilesLoaded} from '@lib/cesium-setup';
import {loadGrid} from '@lib/grid';
import {COLORMAP_GLSL} from '@lib/colormap';
import {loadScene, datasetChrome, reportGridFailure, scaleMinBounds, scaleMaxBounds} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  // The colour scale is the *volume's* own extent, not `scene.colourRange`. That range is the
  // 2nd/98th percentile of the field on the ground surface, and this page draws the air above it:
  // on the real tile the surface range stops at 18.75 degC while the grid runs to 32.5, so 65% of
  // the voxels clamped to the top stop and the plume rendered as a solid red block (see NOTES.md).
  // Loaded before the header so the sliders can present the range they actually drive; without a
  // field there is no grid file to fetch, so the gate below still runs first for that case.
  const grid = scene.hasField ? await loadGrid(scene).catch(reportGridFailure) : undefined;
  const [t0, t1] = grid ? [grid.min, grid.max] : scene.colourRange;
  let shader: Cesium.CustomShader | undefined;
  const ui = mountChrome({
    num: '10', title: 'Cesium — volume rendering',
    expect: !scene.hasField
      ? 'nothing — this dataset has no temperature field (stage 2 has not run), so there is no grid to ray-march. See the probe panel below for how to generate one.'
      : scene.dataset === 'real'
      ? 'the real 64×64×32 grid ray-marched as a volume over the tile: a broad translucent haze, yellow-green through most of its body, with amber patches where the air over the densest blocks is warmest and a soft cyan fringe where it fades out. The globe graticule and the hill silhouette show through it. The sliders carry this page’s own scale — the grid’s extent, 18.0–32.5 °C; the header’s 18.0–18.7 °C is the ground-surface range pages 07 and 08 colour against, and it does not describe the air. A diffusion solve over a 500 m box has no single sharp hot spot, so the warm body spreads across the built-up half of the tile rather than rising from one point.'
      : 'a translucent 3-D plume over the hot spot: a hot amber core fading through green and cyan to transparent. This is the temperature field as a volume, not a surface.',
    claim: 'it is the only engine that can currently draw volume data like a wind or heat field in 3D. Not the base map, but a real candidate for a dedicated simulation view.',
    decision: 'Why Cesium was reopened: it is the only engine here that draws volume data at all. That makes it a real candidate for a dedicated simulation view, and still not for the base map.',
    correction: '\'The only engine that can currently draw volume data\' is true but understates the assembly. There is no public way to hand it in-memory data: you hand-roll a 17-property provider object, both VoxelPrimitive and VoxelProvider are marked experimental and sit outside the deprecation policy, and the ray-march runs at roughly one frame per second under software rendering.',
    findings: [
      'Defect we found and fixed (Task 11): this page and page 11 were colouring the volume with the ground surface\'s colour range, which clamped 65% of voxels to the top stop and rendered a saturated red mass instead of a plume. Both now scale to the grid\'s own min and max. The fix also shifts the synthetic render, by at most 1 of 255 in any channel.',
      'The briefing\'s mental model of \'the hot core shows red\' needs two non-obvious things. depthTest must be off, because the hottest air in our field is at ground level, i.e. inside the hill. And the opacity ramp must be steeper than the obvious one: at alpha = t²·0.9 the ray saturates on the cool near side and the core never reaches the screen. Even at t³·0.35 the front-to-back composite dilutes the peak voxels with everything in front of them, so at any legible opacity the core reads amber, not the red the top of the scale implies.',
      'A diffusion solve over a 500 m box has no single sharp hot spot, so the warm body follows the built-up half of the tile rather than rising from one point. That is the solve, not the colour scale.',
    ],
    dataset: datasetChrome(scene),
    controls: [
      {kind: 'range', id: 'min', label: 'Scale min (°C)', ...scaleMinBounds(t0), step: 1, value: t0, onChange: v => shader?.setUniform('u_min', v)},
      {kind: 'range', id: 'max', label: 'Scale max (°C)', ...scaleMaxBounds(t1), step: 1, value: t1, onChange: v => shader?.setUniform('u_max', v)}
    ]
  });
  ui.setProbe('field', scene.hasField);
  if (!grid) { noFieldForThisDataset(ui, scene.name); return; }
  const viewer = makeViewer(ui.canvasHost, scene);

  const [nx, ny, nz] = grid.dims;
  const sx = grid.spacing[0] * (nx - 1) / 2, sy = grid.spacing[1] * (ny - 1) / 2, sz = grid.spacing[2] * (nz - 1) / 2;
  // BOX shape space is the unit cube [-1,1]^3; map it onto the grid's extent in the ENU frame.
  const shapeTransform = Cesium.Matrix4.multiply(enuMatrix(scene),
    Cesium.Matrix4.multiply(Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(grid.origin[0] + sx, grid.origin[1] + sy, grid.origin[2] + sz)),
      Cesium.Matrix4.fromScale(new Cesium.Cartesian3(sx, sy, sz)), new Cesium.Matrix4()), new Cesium.Matrix4());

  const provider = {
    shape: Cesium.VoxelShapeType.BOX,
    dimensions: new Cesium.Cartesian3(nx, ny, nz),
    names: ['temperature'],
    types: [Cesium.MetadataType.SCALAR],
    componentTypes: [Cesium.MetadataComponentType.FLOAT32],
    minimumValues: [[grid.min]], maximumValues: [[grid.max]],
    globalTransform: Cesium.Matrix4.IDENTITY, shapeTransform,
    minBounds: new Cesium.Cartesian3(-1, -1, -1), maxBounds: new Cesium.Cartesian3(1, 1, 1),
    paddingBefore: Cesium.Cartesian3.ZERO, paddingAfter: Cesium.Cartesian3.ZERO,
    maximumTileCount: 1, availableLevels: 1,
    requestData: ({tileLevel}: {tileLevel: number}) =>
      tileLevel === 0 ? Promise.resolve(Cesium.VoxelContent.fromMetadataArray([grid.data])) : undefined
  } as unknown as Cesium.VoxelProvider;

  shader = new Cesium.CustomShader({
    uniforms: {u_min: {type: Cesium.UniformType.FLOAT, value: t0}, u_max: {type: Cesium.UniformType.FLOAT, value: t1}},
    fragmentShaderText: `
      ${COLORMAP_GLSL}
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        float t = clamp((fsInput.metadata.temperature - u_min) / max(u_max - u_min, 1e-3), 0.0, 1.0);
        material.diffuse = benchColormap(t);
        material.alpha = t * t * t * 0.35;
      }`
  });

  ui.probe('VoxelPrimitive + custom VoxelProvider over field.grid.f32 (64×64×32 float32, one level-0 tile). API marked experimental.');
  ui.probe('EXT_primitive_voxels lives on the CesiumGS 3d-tiles-next branch, as does EXT_structural_metadata.');
  ui.probe('alpha = t³·0.35, not t²·0.9: front-to-back, the cool near side saturates the ray long before it reaches the core.');
  ui.probe('depthTest off: the hottest air is at ground level, inside the hill. Orbit behind the ridge and the plume shows through the hillside.');

  // The raymarch costs about a second a frame on a software rasteriser, which starves the globe's
  // tile refinement, so let the terrain settle first and then drop the volume in on top of it.
  whenTilesLoaded(viewer, () => {
    const prim = viewer.scene.primitives.add(new Cesium.VoxelPrimitive({provider, customShader: shader}));
    prim.nearestSampling = false;   // the default; kept explicit to document trilinear filtering
    prim.depthTest = false;
    // Registered before the first traversal update: it only tracks load progress while listened to.
    prim.initialTilesLoaded.addEventListener(() => {
      let frames = 0;                                    // let the loaded tile actually reach the screen
      const off = viewer.scene.postRender.addEventListener(() => { if (++frames > 2) { off(); ui.ready(); } });
    });
  });
})();
