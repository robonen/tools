type Exist<T> = T extends undefined | null ? never : T;

type ExtractFromObject<O extends Record<PropertyKey, unknown>, K> =
  K extends keyof O
    ? O[K]
    : K extends keyof Exist<O>
      ? Exist<O>[K]
      : never;

type ExtractFromArray<A extends readonly any[], K> = any[] extends A
  ? A extends readonly (infer T)[]
    ? T | undefined
    : undefined
  : K extends keyof A
    ? A[K]
    : undefined;

type GetWithArray<O, K> = K extends []
  ? O
  : K extends [infer Key, ...infer Rest]
    ? O extends Record<PropertyKey, unknown>
      ? GetWithArray<ExtractFromObject<O, Key>, Rest>
      : O extends readonly any[]
        ? GetWithArray<ExtractFromArray<O, Key>, Rest>
        : never
    : never;

type Path<T> = T extends `${infer Key}.${infer Rest}`
  ? [Key, ...Path<Rest>]
    : T extends `${infer Key}`
      ? [Key]
      : [];

// Type that generate a type of a value by a path;
// e.g. ['a', 'b', 'c'] => { a: { b: { c: PropertyKey } } }
// e.g. ['a', 'b', 'c', 'd'] => { a: { b: { c: { d: PropertyKey } } } }
// e.g. ['a'] => { a: PropertyKey }
// e.g. ['a', '0'], => { a: [PropertyKey] }
// e.g. ['a', '0', 'b'] => { a: [{ b: PropertyKey }] }
// e.g. ['a', '0', 'b', '0'] => { a: [{ b: [PropertyKey] }] }
// e/g/ ['0', 'a'] => [{ a: PropertyKey }]
//
// Input: ['a', 'b', 'c'], constrain: PropertyKey
// Output: { a: { b: { c: PropertyKey } } }

export type UnionToIntersection<Union> = (
 Union extends unknown
		? (distributedUnion: Union) => void
		: never
) extends ((mergedIntersection: infer Intersection) => void)
	? Intersection & Union
	: never;


type PathToType<T extends string[]> = T extends [infer Head, ...infer Rest]
  ? Head extends string
    ? Head extends `${number}`
      ? Rest extends string[]
        ? PathToType<Rest>[]
        : never
      : Rest extends string[]
        ? { [K in Head & string]: PathToType<Rest> }
        : never
    : never
  : unknown;

export type Generate<T extends string> = UnionToIntersection<PathToType<Path<T>>>;
type Get<O, K> = GetWithArray<O, Path<K>>;

export function getByPath<O, K extends string>(obj: O, path: K): Get<O, K>;
export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let currentObj = obj;

  for (const key of keys) {
    const value = currentObj[key];

    if (value === undefined || value === null) return undefined;

    currentObj = value as Record<string, unknown>;
  }

  return currentObj;
}
