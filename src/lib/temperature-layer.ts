import {ScenegraphLayer} from '@deck.gl/mesh-layers';
import type {ShaderModule} from '@luma.gl/shadertools';
import {COLORMAP_GLSL} from './colormap';

// A tiny shader module carrying the colour-scale range as a uniform block (deck.gl 9 style).
// luma.gl 9.4 binds the block under `${module.name}Uniforms` (model.js setShaderInputs), so the
// GLSL block must be named `rampUniforms` and laid out std140 — that is what ShaderBlockWriter packs.
const rampModule: ShaderModule<{uMin: number; uMax: number}> = {
  name: 'ramp',
  fs: /* glsl */ `layout(std140) uniform rampUniforms {
  float uMin;
  float uMax;
} ramp;`,
  uniformTypes: {uMin: 'f32', uMax: 'f32'},
  defaultUniforms: {uMin: 10, uMax: 35}
};

export type TemperatureLayerProps = {tMin: number; tMax: number};

/** String-replace that refuses to be a no-op, so a moved deck.gl anchor fails loudly per anchor. */
function must(src: string, from: string | RegExp, to: string, what: string): string {
  const out = src.replace(from, to);
  if (out === src) throw new Error(`shader anchor not found: ${what}`);
  return out;
}

/**
 * ScenegraphLayer that declares the glTF custom attribute `_TEMPERATURE` in its own shader and
 * colours the surface by it. Stock deck.gl 9.4 carries the attribute all the way to the model's
 * buffer layout and then drops it, because scenegraph-layer-vertex.glsl declares no such input.
 *
 * This leans on deck.gl's shader source strings, which carry no stability promise.
 *
 * Two preprocessor assumptions. The patch rewrites the `fragColor = vColor;` branch of
 * scenegraph-layer-fragment.glsl, which the preprocessor drops if `LIGHTING_PBR` is defined
 * (`_lighting: 'pbr'`) or if the glTF supplies UVs and a base-colour texture
 * (`HAS_UV && HAS_BASECOLORMAP`) — under either, the anchors still apply but the patched line never
 * runs and the surface renders uncoloured with no error. `defaultProps` pins `_lighting: 'flat'`, and
 * the bench's field.glb has neither UVs nor a texture.
 *
 * Only the GLSL is patched: the WGSL `source` that ScenegraphLayer.getShaders() returns is passed
 * through untouched, which is safe because page 07 gates on WebGL2.
 */
export class TemperatureScenegraphLayer extends ScenegraphLayer<any, TemperatureLayerProps> {
  static layerName = 'TemperatureScenegraphLayer';
  static defaultProps = {...ScenegraphLayer.defaultProps, tMin: 10, tMax: 35, _lighting: 'flat' as const};

  getShaders() {
    const s = super.getShaders();
    let vs = String(s.vs);
    vs = must(vs, 'in vec3 positions;', 'in vec3 positions;\nin float _TEMPERATURE;\nout float vTemp;', 'vs attribute declaration');
    vs = must(vs, 'void main(void) {', 'void main(void) {\n  vTemp = _TEMPERATURE;', 'vs main() opener');

    let fs = String(s.fs);
    fs = must(fs, 'out vec4 fragColor;', `out vec4 fragColor;\nin float vTemp;\n${COLORMAP_GLSL}`, 'fs varying + colormap declaration');
    // The stock fragment shader has three fragColor assignments (PBR, textured flat, flat).
    // Only the last one runs here, and a regex would have hit the first — so anchor on it exactly.
    fs = must(fs, 'fragColor = vColor;', 'fragColor = vec4(benchColormap((vTemp - ramp.uMin) / (ramp.uMax - ramp.uMin)), 1.0);', 'fs flat-branch colour assignment');

    // Post-condition: the anchors above can each apply and still leave the ramp unwired. Without this,
    // a partial patch declares vTemp/benchColormap, keeps _TEMPERATURE an active attribute (so the
    // probe reads inShaderLayout=true) and renders a stock white mesh — a green assertion over a lie.
    if (!/fragColor = vec4\(benchColormap\(/.test(fs)) throw new Error('ramp assignment missing from patched fragment shader');
    return {...s, vs, fs, modules: [...(s.modules ?? []), rampModule]};
  }

  draw(params: any) {
    const {tMin, tMax} = this.props;
    for (const model of ((this.state as any).models ?? []) as any[]) {
      model.shaderInputs.setProps({ramp: {uMin: tMin, uMax: tMax}});
    }
    super.draw(params);
  }
}
