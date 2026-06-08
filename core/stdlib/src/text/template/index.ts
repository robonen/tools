import type { Collection, Path, PathToPartialType, Stringable, Trim, UnionToIntersection } from '../../types';
import { get } from '../../collections';
import { isFunction } from '../../types';

/**
 * Type of a value that will be used to replace a placeholder in a template.
 */
export type TemplateValue = Stringable | string;

/**
 * Type of a fallback value when a template key is not found.
 */
export type TemplateFallback = string | ((key: string) => string);

/**
 * Type of a template string with placeholders.
 */
const TEMPLATE_PLACEHOLDER = /\{([^{}]+)\}/g;

/**
 * Removes the placeholder syntax from a template string.
 *
 * @example
 * type Base = ClearPlaceholder<'{user.name}'>; // 'user.name'
 * type Unbalanced = ClearPlaceholder<'{user.name'>; // 'user.name'
 * type Spaces = ClearPlaceholder<'{ user.name }'>; // 'user.name'
 */
export type ClearPlaceholder<In extends string>
  = In extends `${string}{${infer Template}`
    ? ClearPlaceholder<Template>
    : In extends `${infer Template}}${string}`
      ? ClearPlaceholder<Template>
      : Trim<In>;

/**
 * Extracts all placeholders from a template string.
 *
 * @example
 * type Base = ExtractPlaceholders<'Hello {user.name}, {user.addresses.0.street}'>; // 'user.name' | 'user.addresses.0.street'
 */
export type ExtractPlaceholders<In extends string>
  = In extends `${infer Before}}${infer After}`
    ? Before extends `${string}{${infer Placeholder}`
      ? ClearPlaceholder<Placeholder> | ExtractPlaceholders<After>
      : ExtractPlaceholders<After>
    : never;

/**
 * Generates a type for a template string with placeholders.
 *
 * @example
 * type Base = GenerateTypes<'Hello {user.name}, your address {user.addresses.0.street}'>; // { user: { name: string; addresses: { 0: { street: string; }; }; }; }
 * type WithTarget = GenerateTypes<'Hello {user.age}', number>; // { user: { age: number; }; }
 */
export type GenerateTypes<T extends string, Target = string>
  // No placeholders (T is never) → impose no shape on the args object.
  = [T] extends [never]
    ? Collection
    : UnionToIntersection<PathToPartialType<Path<T>, Target>>;

/**
 * @name templateObject
 * @category Text
 * @description Replace `{path}` placeholders in a template string with values
 * resolved from `args` by dot-path. Placeholder keys are inferred from the
 * template, so `args` is type-checked and auto-completed against them.
 *
 * @param {string} template - Template string with `{path}` placeholders
 * @param {object} args - Source values, keyed by the placeholder paths
 * @param {string | ((key: string) => string)} [fallback] - Value (or factory) used when a placeholder cannot be resolved; defaults to an empty string
 * @returns {string} The interpolated string
 *
 * @example
 * templateObject('Hello, {name}!', { name: 'John' }); // 'Hello, John!'
 * templateObject('Hi {user.addresses.0.city}', { user: { addresses: [{ city: 'NY' }] } }); // 'Hi NY'
 * templateObject('Hello, {name}!', {}, 'Guest'); // 'Hello, Guest!'
 * templateObject('Hello, {name}!', {}, key => `<${key}>`); // 'Hello, <name>!'
 *
 * @since 0.0.4
 */
export function templateObject<
  T extends string,
  A extends GenerateTypes<ExtractPlaceholders<T>, TemplateValue> & Collection,
>(template: T, args: A, fallback?: TemplateFallback): string {
  return template.replaceAll(TEMPLATE_PLACEHOLDER, (_match, key: string) => {
    const value = get(args, key.trim());

    if (value !== null && value !== undefined)
      return String(value);

    if (isFunction<(key: string) => string>(fallback))
      return fallback(key);

    return fallback ?? '';
  });
}
