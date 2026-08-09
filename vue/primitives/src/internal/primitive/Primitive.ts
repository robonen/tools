import type { AllowedComponentProps, Component, IntrinsicElementAttributes, SetupContext, VNodeProps } from 'vue';
import { h } from 'vue';
import { renderSlotChild } from './Slot';

type FunctionalComponentContext = Omit<SetupContext, 'expose'>;

type Booleanish = boolean | 'true' | 'false';

/**
 * Global DOM attributes any part accepts and forwards, through `$attrs`, to the
 * element it renders. They are deliberately kept out of the runtime props (the
 * `@vue-ignore` marker on the heritage clause below stops the SFC compiler from
 * lifting them out of `$attrs`), so this only teaches `strictTemplates` that
 * they are valid — the runtime behaviour is unchanged.
 */
export interface PrimitiveAttributes {
  id?: string;
  role?: string;
  title?: string;
  tabindex?: number | string;
  lang?: string;
  dir?: string;
  hidden?: Booleanish | 'until-found' | '';
  inert?: Booleanish;
  autofocus?: Booleanish;
  draggable?: Booleanish;
  spellcheck?: Booleanish;
  translate?: 'yes' | 'no';
  nonce?: string;
  part?: string;
  slot?: string;
  [key: `data-${string}` | `aria-${string}`]: unknown;
}

export interface PrimitiveProps extends /* @vue-ignore */ PrimitiveAttributes {
  as?: keyof IntrinsicElementAttributes | Component;
}

export function Primitive(props: PrimitiveProps & VNodeProps & AllowedComponentProps & Record<string, unknown>, ctx: FunctionalComponentContext) {
  const as = props.as;

  return as === 'template'
    ? renderSlotChild(ctx.slots, ctx.attrs)
    : h(as!, ctx.attrs, ctx.slots);
}

Primitive.inheritAttrs = false;

Primitive.props = {
  as: {
    type: [String, Object],
    default: 'div' as const,
  },
};
