import { describe, expect, it } from "bun:test";
import { buildScene, parseObj } from "../../src/lib/twin-demo/scene-data";

const origin: [number, number] = [319683, 6398110.5];

describe("parseObj", () => {
  it("takes the origin off in float64, before anything becomes float32", () => {
    // FAILS IF: the northing goes through float32 first, where 6398111.25 snaps to 6398111.0 (0.5 m steps).
    const { positions } = parseObj("v 319683.03 6398111.25 40.5\nv 0 0 0\nv 1 1 1\nf 1 2 3\n", origin);
    expect(Math.fround(positions[1]!)).toBeCloseTo(0.75, 6);
    expect(Math.fround(positions[0]!)).toBeCloseTo(0.03, 5);
  });

  it("reads 1-based faces, including the v/vt/vn form", () => {
    expect([...parseObj("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1/1/1 2/2/2 3/3/3\n", [0, 0]).faces]).toEqual([0, 1, 2]);
  });

  it("refuses faces that aren't triangles", () => {
    expect(() => parseObj("v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n", [0, 0])).toThrow("4 corners");
  });
});

describe("buildScene with core's mesh", () => {
  const buildings = { crs: "EPSG:3006" as const, bounds: [0, 0, 2, 2] as [number, number, number, number], buildings: [] };
  const meta = { crs: "EPSG:3006" as const, vertices: 3, triangles: 1, buildings: 0, speed_range: [0, 2] as [number, number], source: "" };

  it("flattens each vertex by its ground height and colours it by its speed", () => {
    const coreMesh = {
      obj: "v 1 1 50\nv 2 1 50\nv 1 2 60\nf 1 2 3\n",
      ground: new Float32Array([50, 50, 50]),
      speed: new Float32Array([0, 1, 2]),
      meta,
    };
    const scene = buildScene(buildings, null, null, coreMesh);
    expect(scene.field).toBeNull();
    expect([...scene.buildings.positions]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 10]);
    // The shared ramp's ends: blue at 0, red at the top of the range.
    expect([...scene.buildings.colors!.slice(0, 3)]).toEqual([33, 102, 172]);
    expect([...scene.buildings.colors!.slice(6, 9)]).toEqual([200, 30, 30]);
  });

  it("in the both view keeps the boxes solid and draws core's mesh as an untinted overlay", () => {
    const boxes = { ...buildings, buildings: [{ ring: [[0, 0], [1, 0], [1, 1], [0, 1]] as [number, number][], height: 5 }] };
    const coreMesh = { obj: "v 1 1 50\nv 2 1 50\nv 1 2 60\nf 1 2 3\n", ground: new Float32Array([50, 50, 50]), speed: new Float32Array(3), meta };
    const scene = buildScene(boxes, null, null, coreMesh, true);
    // FAILS IF: "both" stops showing the boxes, or the overlay keeps heatmap colours (it is one tint, to compare shape).
    expect(scene.buildings.colors).toBeNull();
    expect(scene.buildings.triangles).toBe(2 + 4 * 2);
    expect(scene.overlay?.triangles).toBe(1);
    // FAILS IF: the overlay keeps core's terrain, a see-through sheet that tints every box under it.
    const ground = { ...coreMesh, obj: "v 1 1 50\nv 2 1 50\nv 1 2 50\nf 1 2 3\n" };
    expect(buildScene(boxes, null, null, ground, true).overlay?.triangles).toBe(0);
    expect(buildScene(boxes, null, null, ground).buildings.triangles).toBe(1);
    expect(scene.overlay?.colors).toBeNull();
    expect(buildScene(boxes, null, null, coreMesh).overlay).toBeNull();
  });

  it("refuses sidecars that don't match the OBJ's vertex count", () => {
    const coreMesh = { obj: "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n", ground: new Float32Array(2), speed: new Float32Array(3), meta };
    expect(() => buildScene(buildings, null, null, coreMesh)).toThrow("2 ground");
  });
});
