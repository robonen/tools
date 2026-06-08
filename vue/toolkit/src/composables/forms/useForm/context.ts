import { inject } from 'vue';
import { useContextFactory } from '@/composables/state/useContextFactory';
import type { FormContext } from './types';

// Reuse the toolkit's context factory for the unique key + provider rather than
// hand-rolling a Symbol + provide/inject.
const formContextFactory = /* #__PURE__ */ useContextFactory<FormContext>('VueToolsErrorForm');

/**
 * The shared injection key under which {@link useForm} provides its context.
 */
export const FORM_CONTEXT_KEY = formContextFactory.key;

/**
 * Provide a form context to descendant components (called by `useForm`).
 */
export const provideFormContext = formContextFactory.provide;

/**
 * Inject the nearest provided form context, or `null` when there is none.
 * (The factory's own `inject` throws when absent; fields need an optional one.)
 */
export function injectFormContext<TInput extends object = any, TOutput = TInput>(): FormContext<TInput, TOutput> | null {
  return inject(FORM_CONTEXT_KEY, null) as FormContext<TInput, TOutput> | null;
}
