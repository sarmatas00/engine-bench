import * as Cesium from 'cesium';
import {mountChrome, requireWebGL2, noFieldForThisDataset} from '@lib/chrome';
import {makeViewer, enuMatrix, whenTilesLoaded} from '@lib/cesium-setup';
import {loadGrid} from '@lib/grid';
import {COLORMAP_GLSL} from '@lib/colormap';
import {loadScene, datasetChrome, scaleMinBounds, scaleMaxBounds} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  const [t0, t1] = scene.colourRange;
  let shader: Cesium.CustomShader | undefined;
  const ui = mountChrome({
    num: '10', title: 'Cesium — volume rendering',
    expect: scene.dataset === 'real'
      ? 'the real 64×64×32 grid ray-marched as a volume — but at the default scale it is a solid red-orange mass, not a plume. The scale it starts on is the header range, which the pipeline measures on the *ground* mesh (18.0–18.7 °C); the air in this grid runs to 32.5 °C, so about two thirds of the voxels clamp to the top of the ramp at full opacity. Drag Scale max to about 33 and the same data reads as the translucent green-and-amber haze this page is meant to show. It is the field as a volume either way; only the scale changes.'
      : 'a translucent 3-D plume over the hot spot: a hot amber core fading through green and cyan to transparent. This is the temperature field as a volume, not a surface.',
    claim: 'it is the only engine that can currently draw volume data like a wind or heat field in 3D. Not the base map, but a real candidate for a dedicated simulation view.',
    dataset: datasetChrome(scene),
    controls: [
      {kind: 'range', id: 'min', label: 'Scale min (°C)', ...scaleMinBounds(scene), step: 1, value: t0, onChange: v => shader?.setUniform('u_min', v)},
      {kind: 'range', id: 'max', label: 'Scale max (°C)', ...scaleMaxBounds(scene), step: 1, value: t1, onChange: v => shader?.setUniform('u_max', v)}
    ]
  });
  ui.setProbe('field', scene.hasField);
  if (!scene.hasField) { noFieldForThisDataset(ui, scene.name); return; }
  const viewer = makeViewer(ui.canvasHost, scene);

  loadGrid(scene).then(grid => {
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
  });
})();
