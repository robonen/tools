import type { Ref } from 'vue';
import type { ReferenceElement } from '@floating-ui/vue';
import type { Side } from './utils';
import { useContextFactory } from '@robonen/vue';

/**
 * Minimal shape a custom/virtual reference must satisfy to be positioned
 * against. Pass any object implementing this to `PopperAnchor`/`PopperContent`'s
 * `reference` prop to anchor against a point, range, or external element rather
 * than a rendered DOM node.
 */
export interface Measurable {
  getBoundingClientRect: () => DOMRect;
}

export interface PopperRootContext {
  anchor: Ref<ReferenceElement | undefined>;
  onAnchorChange: (element: ReferenceElement | undefined) => void;
}

export interface PopperContentContext {
  placedSide: Ref<Side>;
  onArrowChange: (arrow: HTMLElement | undefined) => void;
  arrowX: Ref<number>;
  arrowY: Ref<number>;
  shouldHideArrow: Ref<boolean>;
}

const rootCtx = useContextFactory<PopperRootContext>('PopperRootContext');
export const providePopperRootContext = rootCtx.provide;
export const usePopperRootContext = rootCtx.inject;

const contentCtx = useContextFactory<PopperContentContext>('PopperContentContext');
export const providePopperContentContext = contentCtx.provide;
export const usePopperContentContext = contentCtx.inject;
