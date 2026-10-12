// The basemap's own 3D buildings for the Atlas demo area: OpenFreeMap's zoom-14 vector tiles (OpenMapTiles schema,
// OpenStreetMap data), the tiles page 21's MapLibre styles draw. Writes .cache/twin-demo/osm/buildings.geojson, one
// feature per building piece, lon/lat, with the tile's render_height / render_min_height.
//
//     bun scripts/twin-demo/fetch_osm_buildings.ts
//
// trap: a building that crosses a tile edge arrives as one clipped piece per tile. compare_osm.py only sums areas and
// area-weights heights, so pieces don't need joining.
import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import {mkdirSync, writeFileSync} from 'node:fs';

// Atlas's demo area in lon/lat with a 50 m margin (scripts/twin-demo/export_city_mesh.py's BOUNDS, EPSG:3006).
const BBOX = {west: 11.968644, south: 57.685528, east: 11.981358, north: 57.692465};
const Z = 14;
const tileX = (lon: number) => Math.floor(((lon + 180) / 360) * 2 ** Z);
const tileY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** Z);
};

const tilejson = await (await fetch('https://tiles.openfreemap.org/planet')).json();
const template: string = tilejson.tiles[0];
const features: object[] = [];
for (let x = tileX(BBOX.west); x <= tileX(BBOX.east); x++) {
  for (let y = tileY(BBOX.north); y <= tileY(BBOX.south); y++) {
    const url = template.replace('{z}', String(Z)).replace('{x}', String(x)).replace('{y}', String(y));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const layer = new VectorTile(new Pbf(new Uint8Array(await response.arrayBuffer()))).layers.building;
    for (let i = 0; i < (layer?.length ?? 0); i++) {
      const feature = layer!.feature(i).toGeoJSON(x, y, Z);
      features.push({...feature, properties: {...feature.properties, tile: `${Z}/${x}/${y}`}});
    }
    console.log(`${Z}/${x}/${y}: ${layer?.length ?? 0} building pieces`);
  }
}
mkdirSync('.cache/twin-demo/osm', {recursive: true});
writeFileSync('.cache/twin-demo/osm/buildings.geojson', JSON.stringify({
  type: 'FeatureCollection',
  source: template,
  attribution: tilejson.attribution,
  fetched_at: new Date().toISOString(),
  features,
}));
console.log(`fetch_osm_buildings: ${features.length} pieces from ${template}`);
