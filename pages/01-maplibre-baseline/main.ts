import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {registerProtocols, benchStyle, DEM_SOURCE, initialView} from '@lib/tiles';
import {loadScene, datasetChrome} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  let map: maplibregl.Map;
  const ui = mountChrome({
    num: '01', title: 'MapLibre baseline',
    expect: scene.dataset === 'real'
      ? 'every real building footprint on the tile extruded onto the hillside, each standing on the ground where the DEM puts it; toggle terrain and they stay on the ground.'
      : 'six extruded blocks standing on the hillside; toggle terrain and they stay on the ground.',
    claim: "MapLibre's own source, src/webgl/render_to_texture.ts, lists the only layer types it will drape over terrain: background, fill, line, raster, hillshade, color-relief.",
    decision: 'Control page. MapLibre\'s own layer types drape correctly, so any failure from page 02 onward is the external engine, not the map. Supports the recommendation to keep MapLibre as the base map.',
    findings: [
      'Real tile census: 215 LOD0 footprints in footprints.geojson — what this page draws — meshing to 103 welded building groups in the LOD1 surface mesh, which is what pages 02/03/05/06/09 draw. It was 217 before the post-#85 Core upgrade: the DTCC server still returns 217, but Core now drops two of them, both with no lidar roof points, because an empty point-cloud geometry drags their bounding box to the projected origin and the outside-terrain filter rejects it. Neither contributed mesh faces, so no count below changed. See NOTES.md.',
      'fill-extrusion drapes correctly on real data: every footprint stands where the DEM puts it, and toggling Terrain moves the whole city with the ground.',
      'Framing confirmed: zoom = 14.2 + log2(EXTENT / extent) = 16.2 frames the real 500 m tile the way 14.2 frames the synthetic 2000 m one. The design spec\'s parenthetical 15.2 would have been a full zoom level too wide.',
    ],
    dataset: datasetChrome(scene),
    controls: [{kind: 'toggle', id: 'terrain', label: 'Terrain', value: true, onChange: v => map.setTerrain(v ? {source: DEM_SOURCE, exaggeration: 1} : null)}]
  });
  registerProtocols(scene);
  const el = document.createElement('div'); ui.canvasHost.prepend(el);
  map = new maplibregl.Map({container: el, style: benchStyle(), ...initialView(scene), maxPitch: 85});
  map.on('load', async () => {
    map.addSource('blocks', {type: 'geojson', data: await scene.footprints()});
    map.addLayer({id: 'blocks', type: 'fill-extrusion', source: 'blocks',
      paint: {'fill-extrusion-color': '#d9534f', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.95}});
    map.setTerrain({source: DEM_SOURCE, exaggeration: 1});
    ui.probe('fill-extrusion is a MapLibre layer: it is positioned by MapLibre itself, so it follows the DEM.');
    map.once('idle', () => ui.ready());
  });
})();
