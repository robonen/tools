import { get } from '../../collections';
import { isFunction, type Path, type PathToType, type Stringable, type Trim, type UnionToIntersection } from '../../types';

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
const TEMPLATE_PLACEHOLDER = /\{\s*([^{}]+?)\s*\}/gm;

/**
 * Removes the placeholder syntax from a template string.
 * 
 * @example
 * type Base = ClearPlaceholder<'{user.name}'>; // 'user.name'
 * type Unbalanced = ClearPlaceholder<'{user.name'>; // 'user.name'
 * type Spaces = ClearPlaceholder<'{ user.name }'>; // 'user.name'
 */
export type ClearPlaceholder<In extends string> =
  In extends `${string}{${infer Template}`
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
export type ExtractPlaceholders<In extends string> =
  In extends `${infer Before}}${infer After}`
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
export type GenerateTypes<T extends string, Target = string> = UnionToIntersection<PathToType<Path<T>, Target>>;

export function templateObject<
  T extends string,
  A extends GenerateTypes<ExtractPlaceholders<T>, TemplateValue>
>(template: T, args: A, fallback?: TemplateFallback) {
    return template.replace(TEMPLATE_PLACEHOLDER, (_, key) => {    
        const value = get(args, key)?.toString();
        return value !== undefined ? value : (isFunction(fallback) ? fallback(key) : '');
    });
}

templateObject('Hello {user.name}, your address {user.addresses.0.city}', {
  user: {
    name: 'John',
    addresses: [
      { city: 'Kolpa' },
    ],
  },
});
