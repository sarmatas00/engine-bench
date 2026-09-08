"""Pure helpers shared by the engine-bench real-data pipeline.

No network, no dtcc imports: everything here is a numpy/JSON transform so the
unit tests run in a second and Stage 1, Stage 2 and the tests agree on one
definition of the file formats.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

# Mapbox Terrain-RGB, same constants the bench tiles use
# (src/lib/dataset.ts encodeTerrainRgbPixel: v = (h + 10000) / 0.1).
TERRAIN_RGB_BASE = 10000.0
TERRAIN_RGB_SCALE = 0.1

_NP_DTYPES = {"f32": np.float32, "u32": np.uint32, "u8": np.uint8}
_ITEM_SIZE = {"f32": 4, "u32": 4, "u8": 1}


def encode_terrain_rgb(heights: np.ndarray) -> np.ndarray:
    """Heights in metres above the local zero -> (H, W, 3) uint8 Terrain-RGB."""
    v = np.rint((np.asarray(heights, dtype=np.float64) + TERRAIN_RGB_BASE) / TERRAIN_RGB_SCALE)
    v = np.clip(v, 0, 2**24 - 1).astype(np.int64)
    rgb = np.empty(v.shape + (3,), dtype=np.uint8)
    rgb[..., 0] = (v >> 16) & 255
    rgb[..., 1] = (v >> 8) & 255
    rgb[..., 2] = v & 255
    return rgb


def decode_terrain_rgb(rgb: np.ndarray) -> np.ndarray:
    """Inverse of encode_terrain_rgb. Returns metres above the local zero."""
    rgb = np.asarray(rgb, dtype=np.int64)
    v = (rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]
    return v * TERRAIN_RGB_SCALE - TERRAIN_RGB_BASE


def basemap_rgb(heights: np.ndarray) -> np.ndarray:
    """Contour/band basemap, the same rules as src/lib/dataset.ts basemapColour()."""
    e = np.asarray(heights, dtype=np.float64)
    rgb = np.empty(e.shape + (3,), dtype=np.int16)
    rgb[..., 0] = 235
    rgb[..., 1] = 235
    rgb[..., 2] = 230
    high = e > 60
    rgb[high] = np.array([215, 205, 190], dtype=np.int16)
    contour = np.abs(np.mod(np.mod(e, 10.0) + 10.0, 10.0) - 5.0) > 4.6
    rgb[contour] -= 60
    return np.clip(rgb, 0, 255).astype(np.uint8)


def write_mesh_pair(out_dir, name: str, *, positions, normals, indices, extra=None) -> dict:
    """Write <name>.mesh.json + <name>.mesh.bin and return the json dict.

    positions/normals: (N, 3) float. indices: (M, 3) or (M*3,) integer.
    extra: {array_name: (values, 'f32'|'u8', components)}, one value per vertex.
    Arrays are concatenated in declaration order; every offset is 4-byte aligned
    and the total length is padded to a multiple of 4 so a Uint32Array view over
    the buffer is always legal on the JS side.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    positions = np.ascontiguousarray(positions, dtype=np.float32).reshape(-1, 3)
    normals = np.ascontiguousarray(normals, dtype=np.float32).reshape(-1, 3)
    indices = np.ascontiguousarray(indices, dtype=np.uint32).reshape(-1)
    if len(normals) != len(positions):
        raise ValueError(f"{name}: {len(positions)} positions but {len(normals)} normals")
    if indices.size % 3:
        raise ValueError(f"{name}: index count {indices.size} is not a multiple of 3")
    if indices.size and int(indices.max()) >= len(positions):
        raise ValueError(f"{name}: index {int(indices.max())} out of range for {len(positions)} vertices")

    planned = [("positions", positions, "f32", 3), ("normals", normals, "f32", 3),
               ("indices", indices, "u32", 1)]
    for key, (values, kind, components) in (extra or {}).items():
        values = np.ascontiguousarray(values, dtype=_NP_DTYPES[kind]).reshape(-1)
        if values.size != len(positions) * components:
            raise ValueError(f"{name}.{key}: {values.size} values for {len(positions)} vertices x {components}")
        planned.append((key, values, kind, components))

    blob = bytearray()
    arrays = []
    for key, values, kind, components in planned:
        while len(blob) % 4:
            blob.append(0)
        arrays.append({"name": key, "type": kind, "components": components,
                       "offset": len(blob), "length": int(values.size)})
        blob += np.ascontiguousarray(values, dtype=_NP_DTYPES[kind]).tobytes()
    while len(blob) % 4:
        blob.append(0)

    meta = {"bin": f"{name}.mesh.bin", "vertexCount": int(len(positions)),
            "indexCount": int(indices.size), "byteLength": len(blob), "arrays": arrays}
    (out_dir / f"{name}.mesh.bin").write_bytes(bytes(blob))
    (out_dir / f"{name}.mesh.json").write_text(json.dumps(meta, indent=2) + "\n")
    return meta


def read_mesh_pair(out_dir, name: str) -> dict:
    """Inverse of write_mesh_pair. Returns {array_name: flat numpy array}."""
    out_dir = Path(out_dir)
    meta = json.loads((out_dir / f"{name}.mesh.json").read_text())
    blob = (out_dir / meta["bin"]).read_bytes()
    if len(blob) != meta["byteLength"]:
        raise ValueError(f"{name}: byteLength {meta['byteLength']} but {len(blob)} bytes on disk")
    out = {}
    for spec in meta["arrays"]:
        size = spec["length"] * _ITEM_SIZE[spec["type"]]
        chunk = blob[spec["offset"]: spec["offset"] + size]
        out[spec["name"]] = np.frombuffer(chunk, dtype=_NP_DTYPES[spec["type"]]).copy()
    return out


def load_dataset_json(out_dir) -> dict:
    return json.loads((Path(out_dir) / "dataset.json").read_text())


def patch_dataset_json(out_dir, **updates) -> dict:
    """Shallow-merge updates into dataset.json and write it back."""
    path = Path(out_dir) / "dataset.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    data.update(updates)
    path.write_text(json.dumps(data, indent=2) + "\n")
    return data
