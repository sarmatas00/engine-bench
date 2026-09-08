import * as Cesium from 'cesium';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeViewer, enuMatrix, whenTilesLoaded} from '@lib/cesium-setup';
import {loadGrid} from '@lib/grid';
import {COLORMAP_GLSL} from '@lib/colormap';

if (requireWebGL2()) {
  let shader: Cesium.CustomShader | undefined;
  const ui = mountChrome({
    num: '10', title: 'Cesium — volume rendering',
    expect: 'a translucent 3-D plume over the hot spot, red at the core fading to blue and transparent. This is the temperature field as a volume, not a surface.',
    claim: 'it is the only engine that can currently draw volume data like a wind or heat field in 3D. Not the base map, but a real candidate for a dedicated simulation view.',
    controls: [
      {kind: 'range', id: 'min', label: 'Scale min (°C)', min: 0, max: 20, step: 1, value: 10, onChange: v => shader?.setUniform('u_min', v)},
      {kind: 'range', id: 'max', label: 'Scale max (°C)', min: 20, max: 50, step: 1, value: 35, onChange: v => shader?.setUniform('u_max', v)}
    ]
  });
  const viewer = makeViewer(ui.canvasHost);

  loadGrid().then(grid => {
    const [nx, ny, nz] = grid.dims;
    const sx = grid.spacing[0] * (nx - 1) / 2, sy = grid.spacing[1] * (ny - 1) / 2, sz = grid.spacing[2] * (nz - 1) / 2;
    // BOX shape space is the unit cube [-1,1]^3; map it onto the grid's extent in the ENU frame.
    const shapeTransform = Cesium.Matrix4.multiply(enuMatrix(),
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
      uniforms: {u_min: {type: Cesium.UniformType.FLOAT, value: 10}, u_max: {type: Cesium.UniformType.FLOAT, value: 35}},
      fragmentShaderText: `
        ${COLORMAP_GLSL}
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
          float t = clamp((fsInput.metadata.temperature - u_min) / (u_max - u_min), 0.0, 1.0);
          material.diffuse = benchColormap(t);
          material.alpha = t * t * t * 0.35;
        }`
    });

    ui.probe('VoxelPrimitive + custom VoxelProvider over field.grid.f32 (64×64×32 float32, one level-0 tile). API marked experimental.');
    ui.probe('EXT_primitive_voxels lives on the CesiumGS 3d-tiles-next branch, as does EXT_structural_metadata.');
    ui.probe('depthTest off, alpha = t³·0.35: the hottest air is at ground level, inside the hill, and a t²·0.9 ramp saturates the ray long before it reaches the core.');

    // The raymarch costs about a second a frame on a software rasteriser, which starves the globe's
    // tile refinement, so let the terrain settle first and then drop the volume in on top of it.
    whenTilesLoaded(viewer, () => {
      const prim = viewer.scene.primitives.add(new Cesium.VoxelPrimitive({provider, customShader: shader}));
      prim.nearestSampling = false;
      prim.depthTest = false;
      // Registered before the first traversal update: it only tracks load progress while listened to.
      prim.initialTilesLoaded.addEventListener(() => {
        let frames = 0;                                    // let the loaded tile actually reach the screen
        const off = viewer.scene.postRender.addEventListener(() => { if (++frames > 2) { off(); ui.ready(); } });
      });
    });
  });
}
