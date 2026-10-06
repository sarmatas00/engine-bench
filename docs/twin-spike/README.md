# dtcc-twin 3D spike: on the map vs in a panel

The code and scripts behind NOTES.md "3D inside dtcc-twin" (2026-10-05). The spike itself lives in a dtcc-twin
working tree and is not committed there; this folder is what's needed to rebuild it.

| File | What it is |
|---|---|
| `dtcc-twin-spike.patch` | The Atlas changes: `/dev/3d` page, `features/spike-3d/`, three + vtk.js in `apps/atlas/package.json`. Applies to dtcc-twin `demo-atlas` at `1721d1f`. No lockfile, no scene data. |
| `extract_scene.py` | Writes the scene for the Atlas demo area from dtcc-core: LoD1 `buildings.json`, and the `smoke` field as `speed.f32` / `velocity.f32` / `field.json`. |
| `field.json` | The field metadata the measured run used, for reference. |
| `measure.ts` | Playwright harness: orbit smoothness per variant, remount and panel-drag GL/context counts. One JSON line per measurement. |

## Rebuild

```sh
git clone --branch demo-atlas https://github.com/dtcc-platform/dtcc-twin.git && cd dtcc-twin
git checkout 1721d1f
git apply ../engine-bench/docs/twin-spike/dtcc-twin-spike.patch
pnpm install                       # not --frozen-lockfile: the patch carries no lockfile
# vtk.js must be >= 7 days old (pnpm-workspace.yaml minimumReleaseAge); 37.3.1 was the newest allowed on 2026-10-05.

# Fixtures for the demo area. On Apple Silicon the README's command fails building fiona (no linux/arm64 wheel):
DOCKER_DEFAULT_PLATFORM=linux/amd64 pnpm --filter backend fixtures:engine

# The spike's scene, from the same pinned dtcc-core image the fixtures use:
mkdir -p apps/atlas/public/dev-3d
docker run --rm --platform linux/amd64 \
  -v $PWD/../engine-bench/docs/twin-spike/extract_scene.py:/extract.py \
  -v $PWD/apps/backend/fixtures/engine/area.json:/area.json \
  -v $PWD/apps/atlas/public/dev-3d:/out \
  -w /src/dtcc-core dtcc-engine-fixtures uv run --no-sync python /extract.py /out
```

Then the README's Postgres, `db:push`, `db:seed` and `pnpm dev`, and open <http://localhost:3000/dev/3d> as
`admin@example.com` / `password`. `?variant=` picks `map-only`, `three-map`, `vtk-map`, `three-panel` or
`vtk-panel`; `&basemap=liberty` switches to the style with MapLibre's own 3D buildings.

Measure (with Atlas running): `bun docs/twin-spike/measure.ts <rounds> <dpr>`.

Don't commit `public/dev-3d/` to dtcc-twin: the recorded data's redistribution terms are unreviewed, as for the
fixtures.
