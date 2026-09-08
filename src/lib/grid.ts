export async function loadGrid() {
  const metaRes = await fetch('/data/field.grid.json');
  if (!metaRes.ok) throw new Error(`field.grid.json: ${metaRes.status}`);
  const meta = await metaRes.json();
  const dataRes = await fetch(meta.dataUrl);
  if (!dataRes.ok) throw new Error(`field.grid.f32: ${dataRes.status}`);
  const data = new Float32Array(await dataRes.arrayBuffer());
  const [nx, ny, nz] = meta.dims;
  if (data.length !== nx * ny * nz) throw new Error('grid size mismatch');
  return {...meta, data} as {dims: [number, number, number]; origin: [number, number, number]; spacing: [number, number, number]; min: number; max: number; data: Float32Array};
}
