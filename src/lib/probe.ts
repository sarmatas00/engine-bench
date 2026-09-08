import type {Model} from '@luma.gl/engine';

/** Reports where a named vertex attribute is present on a live luma.gl Model. */
export function describeModel(model: Model, attr: string) {
  const layouts = (model.bufferLayout ?? []) as Array<{name: string; attributes?: Array<{attribute: string}>}>;
  const inBufferLayout = layouts.some(l => l.name === attr || (l.attributes ?? []).some(a => a.attribute === attr));
  const shaderAttrs = ((model as any).pipeline?.shaderLayout?.attributes ?? []) as Array<{name: string}>;
  const inShaderLayout = shaderAttrs.some(a => a.name === attr);
  const vs = String((model as any).props?.vs ?? (model as any).props?.source ?? '');
  const inVsSource = vs.includes(attr);
  return {inBufferLayout, inShaderLayout, inVsSource, accessors: 'model.bufferLayout[].name | .attributes[].attribute / model.pipeline.shaderLayout.attributes[].name / model.props.vs | .source'};
}
