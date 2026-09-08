#!/usr/bin/env bash
# Stage 2: solve urban heat inside the dtcc-sim container.
#
#   scripts/real/stage2_sim.sh
#
# The image is built from ~/Projects/dtcc/dtcc-sim:
#   DOCKER_PLATFORM=linux/amd64 docker compose build dtcc-sim
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
OUT="$REPO/public/data/real"
CACHE="$REPO/.cache/dtcc-container"
IMAGE="${DTCC_SIM_IMAGE:-dtcc-sim:local}"

if [ ! -f "$OUT/dataset.json" ]; then
  echo "stage2: $OUT/dataset.json is missing. Run stage 1 first:" >&2
  echo "        .venv/bin/python scripts/real/stage1_build.py" >&2
  exit 1
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "stage2: image $IMAGE not found. Build it:" >&2
  echo "        cd ../dtcc-sim && DOCKER_PLATFORM=linux/amd64 docker compose build dtcc-sim" >&2
  exit 1
fi

mkdir -p "$CACHE"
echo "stage2: solving in $IMAGE (linux/amd64 under emulation — expect several minutes)"
docker run --rm --platform linux/amd64 \
  -v "$OUT:/out" \
  -v "$HERE:/work:ro" \
  -v "$CACHE:/root/.cache" \
  "$IMAGE" python /work/solve.py

echo "stage2: done. Next:"
echo "        .venv/bin/python scripts/real/sample_field.py"
