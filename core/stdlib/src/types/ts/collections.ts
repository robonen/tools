/**
 * A collection definition
 */
export type Collection = Record<PropertyKey, any> | any[];

/**
 * Parse a collection path string into an array of keys
 */
export type Path<T> =
  T extends `${infer Key}.${infer Rest}`
    ? [Key, ...Path<Rest>]
      : T extends `${infer Key}`
        ? [Key]
        : [];

/**
 * Convert a collection path array into a Target type
 */
export type PathToType<T extends string[], Target = unknown> =
  T extends [infer Head, ...infer Rest]
    ? Head extends `${number}`
      ? Rest extends string[]
        ? PathToType<Rest, Target>[]
        : never
      : Rest extends string[]
        ? { [K in Head & string]: PathToType<Rest, Target> }
        : never
    : Target;
