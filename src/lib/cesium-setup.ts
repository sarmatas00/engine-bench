import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {h, LON0, LAT0} from './scene';
import {lngLatToLocal} from './geo';

Cesium.Ion.defaultAccessToken = '';

const tilingScheme = new Cesium.GeographicTilingScheme();

export function makeTerrain(): Cesium.CustomHeightmapTerrainProvider {
  const W = 32, H = 32;
  return new Cesium.CustomHeightmapTerrainProvider({
    width: W, height: H, tilingScheme,
    callback: (x, y, level) => {
      const r = tilingScheme.tileXYToRectangle(x, y, level);
      const out = new Float32Array(W * H);
      for (let j = 0; j < H; j++) {
        const lat = Cesium.Math.toDegrees(r.north - ((r.north - r.south) * j) / (H - 1)); // row 0 = north
        for (let i = 0; i < W; i++) {
          const lon = Cesium.Math.toDegrees(r.west + ((r.east - r.west) * i) / (W - 1));
          const [lx, ly] = lngLatToLocal(lon, lat);
          out[j * W + i] = h(lx, ly);
        }
      }
      return out;
    }
  });
}

export function enuMatrix(): Cesium.Matrix4 {
  return Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(LON0, LAT0, 0));
}

export function makeViewer(host: HTMLElement): Cesium.Viewer {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;inset:0';
  host.prepend(el);
  const viewer = new Cesium.Viewer(el, {
    baseLayer: false, terrainProvider: makeTerrain(),
    animation: false, timeline: false, geocoder: false, baseLayerPicker: false, sceneModePicker: false,
    homeButton: false, navigationHelpButton: false, infoBox: false, selectionIndicator: false, fullscreenButton: false,
    requestRenderMode: false
  });
  viewer.imageryLayers.addImageryProvider(new Cesium.GridImageryProvider({cells: 8, color: Cesium.Color.GRAY.withAlpha(0.4)}));
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(LON0, LAT0 - 0.022, 1400),
    orientation: {heading: 0, pitch: Cesium.Math.toRadians(-32), roll: 0}
  });
  return viewer;
}

export function whenTilesLoaded(viewer: Cesium.Viewer, cb: () => void) {
  let frames = 0;
  const off = viewer.scene.postRender.addEventListener(() => {
    if (viewer.scene.globe.tilesLoaded && ++frames > 3) { off(); cb(); }
  });
}
