"""Pure helpers shared by the engine-bench real-data pipeline.

No network, no dtcc imports: everything here is a numpy/JSON transform so the
unit tests run in a second and Stage 1, Stage 2 and the tests agree on one
definition of the file formats.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

# Mapbox Terrain-RGB, same constants the bench tiles use
# (src/lib/dataset.ts encodeTerrainRgbPixel: v = (h + 10000) / 0.1).
TERRAIN_RGB_BASE = 10000.0
TERRAIN_RGB_SCALE = 0.1

_NP_DTYPES = {"f32": np.float32, "u32": np.uint32, "u8": np.uint8}
_ITEM_SIZE = {"f32": 4, "u32": 4, "u8": 1}

# The keys write_mesh_pair owns. Caller metadata is merged into the same json object,
# so these have to stay off limits or a caller could redescribe the binary layout.
_RESERVED_METADATA_KEYS = ("bin", "vertexCount", "indexCount", "byteLength", "arrays")


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


def pack_array_bundle(arrays: list[tuple[str, np.ndarray, str, int]]) -> tuple[bytes, list[dict]]:
    """Return a four-byte-aligned blob and its typed array specifications.

    arrays: [(name, values, 'f32'|'u32'|'u8', components)], packed in declaration
    order. Every offset and the total length are padded to a multiple of 4 so a
    Uint32Array view over the buffer is always legal on the JS side.

    This is the one place that decides byte layout. Everything about the on-disk
    encoding -- type conversion, padding, offsets, duplicate names, which types
    exist -- lives here so a second writer cannot drift from the first.
    """
    blob = bytearray()
    specs = []
    seen = set()
    for name, values, kind, components in arrays:
        if kind not in _NP_DTYPES:
            raise ValueError(f"{name}: unsupported array type {kind!r}, "
                             f"expected one of {sorted(_NP_DTYPES)}")
        if name in seen:
            raise ValueError(f"{name}: duplicate array name")
        seen.add(name)
        values = np.ascontiguousarray(values, dtype=_NP_DTYPES[kind]).reshape(-1)
        while len(blob) % 4:
            blob.append(0)
        specs.append({"name": name, "type": kind, "components": int(components),
                      "offset": len(blob), "length": int(values.size)})
        blob += values.tobytes()
    while len(blob) % 4:
        blob.append(0)
    return bytes(blob), specs


def write_mesh_pair(out_dir, name: str, *, positions, normals, indices,
                    extra=None, cell_extra=None, metadata=None) -> dict:
    """Write <name>.mesh.json + <name>.mesh.bin and return the json dict.

    positions/normals: (N, 3) float. indices: (M, 3) or (M*3,) integer.
    extra: {array_name: (values, 'f32'|'u32'|'u8', components)}, one value per vertex.
    cell_extra: the same, but one value per *triangle* -- this is how a per-face
    property such as which object a triangle belongs to survives to the browser.
    metadata: extra top-level json keys (e.g. the object table the cell indices
    point into). Byte layout is delegated entirely to pack_array_bundle.
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
    triangles = indices.size // 3

    planned = [("positions", positions, "f32", 3), ("normals", normals, "f32", 3),
               ("indices", indices, "u32", 1)]
    for key, (values, kind, components) in (extra or {}).items():
        size = np.asarray(values).size
        if size != len(positions) * components:
            raise ValueError(f"{name}.{key}: {size} values for {len(positions)} vertices x {components}")
        planned.append((key, values, kind, components))
    for key, (values, kind, components) in (cell_extra or {}).items():
        size = np.asarray(values).size
        if size != triangles * components:
            raise ValueError(f"{name}.{key}: {size} values for {triangles} triangles x {components}")
        planned.append((key, values, kind, components))

    blob, arrays = pack_array_bundle(planned)

    meta = {"bin": f"{name}.mesh.bin", "vertexCount": int(len(positions)),
            "indexCount": int(indices.size), "byteLength": len(blob), "arrays": arrays}
    for key, value in (metadata or {}).items():
        if key in _RESERVED_METADATA_KEYS:
            raise ValueError(f"{name}: metadata key {key!r} describes the mesh format "
                             f"and cannot be overridden")
        meta[key] = value
    (out_dir / f"{name}.mesh.bin").write_bytes(blob)
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


def distribution_revision(name: str) -> str:
    """Best available revision string for an installed distribution.

    `dtcc_core.__version__` does not exist on the pinned build, so a naive
    getattr records the literal "unknown" as the provenance of the round-trip
    measurement. pip records what was actually installed in direct_url.json:
    a git commit for a VCS install, a path for an editable one (whose git HEAD
    we then resolve). Falls back to the declared version.
    """
    import subprocess
    from importlib.metadata import distribution, PackageNotFoundError

    try:
        dist = distribution(name)
    except PackageNotFoundError:
        return "not installed"
    except Exception:
        # This runs after the multi-minute FEM solve but before heat.meta.json
        # is written; provenance must never be able to fail the run.
        return "unknown"
    try:
        raw = dist.read_text("direct_url.json")
        if raw:
            info = json.loads(raw)
            commit = info.get("vcs_info", {}).get("commit_id")
            if commit:
                return commit
            if info.get("dir_info", {}).get("editable") and info.get("url", "").startswith("file://"):
                path = info["url"][len("file://"):]
                head = subprocess.run(["git", "-C", path, "rev-parse", "HEAD"],
                                      capture_output=True, text=True, timeout=10)
                if head.returncode == 0:
                    return head.stdout.strip()
    except Exception:
        pass
    return dist.version or "unknown"


def identity_mapping_hash(mapping) -> str:
    """Stable sha256 over one observed source-index -> DTCC-id mapping."""
    payload = json.dumps([[int(k), str(v)] for k, v in sorted(mapping.items())],
                         separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def audit_identity_stability(first, second) -> dict:
    """Compare two observed source-index -> DTCC-id mappings of the same source data.

    Observational, never fatal. DTCC object IDs are only ever *observed* to be
    stable across loads, never guaranteed, so drift is a verdict the renderer
    pages report rather than an error that stops the pipeline. Both hashes are
    recorded either way: when the IDs do drift they are the only evidence left
    of what the two loads actually saw.
    """
    first_hash = identity_mapping_hash(first)
    second_hash = identity_mapping_hash(second)
    return {
        "identityStability": ("stable_observed_two_loads" if first_hash == second_hash
                              else "unstable_observed"),
        "firstLoadHash": first_hash,
        "secondLoadHash": second_hash,
        "auditedAt": datetime.now(timezone.utc).isoformat(),
    }


def load_dataset_json(out_dir) -> dict:
    return json.loads((Path(out_dir) / "dataset.json").read_text())


def patch_dataset_json(out_dir, **updates) -> dict:
    """Shallow-merge updates into dataset.json and write it back."""
    path = Path(out_dir) / "dataset.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    data.update(updates)
    path.write_text(json.dumps(data, indent=2) + "\n")
    return data
