import type { AllowedComponentProps, Component, IntrinsicElementAttributes, SetupContext, VNodeProps } from 'vue';
import { h, mergeProps } from 'vue';
import { Slot } from './Slot';

type FunctionalComponentContext = Omit<SetupContext, 'expose'>;

export interface PrimitiveProps {
  as?: keyof IntrinsicElementAttributes | Component;
}

export function Primitive(props: PrimitiveProps & VNodeProps & AllowedComponentProps & Record<string, unknown>, ctx: FunctionalComponentContext) {
  const { as, ...delegatedProps } = props;

  return as === 'template'
    ? h(Slot, mergeProps(ctx.attrs, delegatedProps), ctx.slots)
    : h(as!, mergeProps(ctx.attrs, delegatedProps), ctx.slots);
}

Primitive.props = {
  as: {
    type: [String, Object],
    default: 'div' as const,
  },
};
