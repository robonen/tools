import { type Collection, type Path } from '../../types';

export type ExtractFromObject<O extends Record<PropertyKey, unknown>, K> =
  K extends keyof O
    ? O[K]
    : K extends keyof NonNullable<O>
      ? NonNullable<O>[K]
      : never;

export type ExtractFromArray<A extends readonly any[], K> =
  any[] extends A
    ? A extends readonly (infer T)[]
      ? T | undefined
      : undefined
    : K extends keyof A
      ? A[K]
      : undefined;

export type ExtractFromCollection<O, K> =
  K extends []
  ? O
  : K extends [infer Key, ...infer Rest]
    ? O extends Record<PropertyKey, unknown>
      ? ExtractFromCollection<ExtractFromObject<O, Key>, Rest>
      : O extends readonly any[]
        ? ExtractFromCollection<ExtractFromArray<O, Key>, Rest>
        : never
    : never;

type Get<O, K> = ExtractFromCollection<O, Path<K>>;


export function get<O extends Collection, K extends string>(obj: O, path: K) {
  return path.split('.').reduce((acc, key) => (acc as any)?.[key], obj) as Get<O, K> | undefined;
}
