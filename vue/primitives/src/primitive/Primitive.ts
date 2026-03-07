import type { Component, IntrinsicElementAttributes, SetupContext } from 'vue';
import { h } from 'vue';
import { Slot } from './Slot';

type FunctionalComponentContext = Omit<SetupContext, 'expose'>;

export interface PrimitiveProps {
  as?: keyof IntrinsicElementAttributes | Component;
}

export function Primitive(props: PrimitiveProps, ctx: FunctionalComponentContext) {
  return props.as === 'template'
    ? h(Slot, ctx.attrs, ctx.slots)
    : h(props.as!, ctx.attrs, ctx.slots);
}

Primitive.props = {
  as: {
    type: [String, Object],
    default: 'div' as const,
  },
};
