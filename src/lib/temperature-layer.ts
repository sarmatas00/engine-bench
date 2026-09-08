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

/**
 * ScenegraphLayer that declares the glTF custom attribute `_TEMPERATURE` in its own shader and
 * colours the surface by it. Stock deck.gl 9.4 carries the attribute all the way to the model's
 * buffer layout and then drops it, because scenegraph-layer-vertex.glsl declares no such input.
 *
 * This leans on deck.gl's shader source strings, which carry no stability promise.
 */
export class TemperatureScenegraphLayer extends ScenegraphLayer<any, TemperatureLayerProps> {
  static layerName = 'TemperatureScenegraphLayer';
  static defaultProps = {...ScenegraphLayer.defaultProps, tMin: 10, tMax: 35, _lighting: 'flat' as const};

  getShaders() {
    const s = super.getShaders();
    const vs = String(s.vs)
      .replace('in vec3 positions;', 'in vec3 positions;\nin float _TEMPERATURE;\nout float vTemp;')
      .replace('void main(void) {', 'void main(void) {\n  vTemp = _TEMPERATURE;');
    const fs = String(s.fs)
      .replace('out vec4 fragColor;', `out vec4 fragColor;\nin float vTemp;\n${COLORMAP_GLSL}`)
      // The stock fragment shader has three fragColor assignments (PBR, textured flat, flat).
      // Only the last one runs here, and a regex would have hit the first — so anchor on it exactly.
      .replace('fragColor = vColor;', 'fragColor = vec4(benchColormap((vTemp - ramp.uMin) / (ramp.uMax - ramp.uMin)), 1.0);');
    if (vs === s.vs || fs === s.fs) throw new Error('shader anchors not found — re-read the deck.gl scenegraph shader sources');
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
