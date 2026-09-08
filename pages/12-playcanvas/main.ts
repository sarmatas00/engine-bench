import * as pc from 'playcanvas';
import {mountChrome, requireWebGL2} from '@lib/chrome';

if (requireWebGL2()) {
  const ui = mountChrome({
    num: '12', title: 'PlayCanvas',
    expect: 'the baked temperature mesh, rendered well, in an arbitrary engine space. The list on the right is the point: nothing here can place it on the Earth.',
    claim: 'No geographic support anywhere in the engine. Its only mapping project is one person\'s side project — 32 commits, dormant about ten months, and tied to a paid Google service.'
  });
  const canvas = document.createElement('canvas');
  ui.canvasHost.prepend(canvas);

  const app = new pc.Application(canvas, {graphicsDeviceOptions: {antialias: true}});
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  const fit = () => app.resizeCanvas(ui.canvasHost.clientWidth, ui.canvasHost.clientHeight);
  window.addEventListener('resize', fit); fit();
  app.start();
  requestAnimationFrame(fit); // first size can be 0 before the host is laid out

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {clearColor: new pc.Color(0.93, 0.93, 0.92), farClip: 20000});
  camera.setPosition(0, 1400, 2400); camera.lookAt(0, 0, 0);
  app.root.addChild(camera);
  const light = new pc.Entity('light');
  light.addComponent('light', {type: 'directional', intensity: 1.2});
  light.setEulerAngles(50, 30, 0);
  app.root.addChild(light);

  const asset = new pc.Asset('field', 'container', {url: '/data/field-baked.glb'});
  asset.ready(() => {
    const entity = (asset.resource as pc.ContainerResource).instantiateRenderEntity();
    app.root.addChild(entity);
    // PlayCanvas 2.22.0's glTF/GLB container parser already sets diffuseVertexColor on materials
    // for primitives with COLOR_0 — verified by rendering with and without a manual override
    // (see NOTES.md); no page-local fix is needed.
    for (const [need, api] of [
      ['Place the mesh at lon 11.97, lat 57.70', 'no API — engine space is unitless, no CRS'],
      ['Draw a basemap under it', 'no API — no tile source, no imagery layer'],
      ['Load terrain tiles', 'no API — no terrain provider'],
      ['Reproject between EPSG codes', 'no API'],
      ['Community mapping plugin', 'one repo, 32 commits, dormant ~10 months, Google Maps Tiles API (paid)']
    ]) ui.probe(`${need.padEnd(42)} ${api}`);
    app.once('postrender', () => ui.ready());
  });
  app.assets.add(asset);
  app.assets.load(asset);
}
