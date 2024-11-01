import { getByPath, type Generate } from '../../collections';
import { isFunction } from '../../types';

/**
 * Type of a value that will be used to replace a placeholder in a template.
 */
type StringPrimitive = string | number | bigint | null | undefined;

/**
 * Type of a fallback value when a template key is not found.
 */
type TemplateFallback = string | ((key: string) => string);

/**
 * Type of an object that will be used to replace placeholders in a template.
 */
type TemplateArgsObject = StringPrimitive[] | { [key: string]: TemplateArgsObject | StringPrimitive };

/**
 * Type of a template string with placeholders.
 */
const TEMPLATE_PLACEHOLDER = /{([^{}]+)}/gm;

/**
 * Removes the placeholder syntax from a template string.
 * 
 * @example
 * type Base = ClearPlaceholder<'{user.name}'>; // 'user.name'
 * type Unbalanced = ClearPlaceholder<'{user.name'>; // 'user.name'
 */
export type ClearPlaceholder<T extends string> =
  T extends `${string}{${infer Template}`
    ? ClearPlaceholder<Template>
    : T extends `${infer Template}}${string}`
      ? ClearPlaceholder<Template>
      : T;

/**
 * Extracts all placeholders from a template string.
 * 
 * @example
 * type Base = ExtractPlaceholders<'Hello {user.name}, {user.addresses.0.street}'>; // 'user.name' | 'user.addresses.0.street'
 */
export type ExtractPlaceholders<T extends string> =
  T extends `${infer Before}}${infer After}`
    ? Before extends `${string}{${infer Placeholder}`
      ? ClearPlaceholder<Placeholder> | ExtractPlaceholders<After>
      : ExtractPlaceholders<After>
    : never;

export function templateObject<T extends string, A extends Generate<ExtractPlaceholders<T>>>(template: T, args: A, fallback?: TemplateFallback): string {
    return template.replace(TEMPLATE_PLACEHOLDER, (_, key) => {    
        const value = getByPath(args, key) as string;
        return value !== undefined ? value : (isFunction(fallback) ? fallback(key) : '');
    });
}

// templateObject('Hello {user.name}, your address {user.addresses.0.street}', {
//   user: {
//     name: 'John',
//     addresses: [
//       { city: 'New York', street: '5th Avenue' },
//     ],
//   },
// });
