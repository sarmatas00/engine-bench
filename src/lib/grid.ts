export async function loadGrid() {
  const meta = await (await fetch('/data/field.grid.json')).json();
  const buf = await (await fetch(meta.dataUrl)).arrayBuffer();
  return {...meta, data: new Float32Array(buf)} as {dims: [number, number, number]; origin: [number, number, number]; spacing: [number, number, number]; min: number; max: number; data: Float32Array};
}
