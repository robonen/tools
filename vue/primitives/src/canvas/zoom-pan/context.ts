import { useContextFactory } from '@robonen/vue';
import type { ViewportContext } from './types';

const viewport = useContextFactory<ViewportContext>('ViewportContext');

/** Provide the {@link ViewportContext} to descendants of `ViewportRoot`. */
export const provideViewportContext = viewport.provide;

/** Inject the {@link ViewportContext}. Throws when no `ViewportRoot` ancestor. */
export const useViewportContext = viewport.inject;
