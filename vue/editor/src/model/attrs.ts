/**
 * Attribute values are JSON-serializable so documents round-trip losslessly and
 * a CRDT adapter can map them onto its own primitives without special-casing.
 */
export type AttrValue
  = | string
    | number
    | boolean
    | null
    | readonly AttrValue[]
    | { readonly [key: string]: AttrValue };

export type Attrs = Readonly<Record<string, AttrValue>>;

/**
 * Structural equality for two attribute values. Order-insensitive for object
 * keys, deep for arrays/objects. Used by mark/attr deduplication and tests.
 */
export function attrValueEq(a: AttrValue | undefined, b: AttrValue | undefined): boolean {
  if (a === b)
    return true;

  if (a === null || b === null || a === undefined || b === undefined)
    return a === b;

  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);

  if (aArr || bArr) {
    if (!aArr || !bArr || a.length !== b.length)
      return false;

    return a.every((v, i) => attrValueEq(v, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object')
    return attrsEq(a as Attrs, b as Attrs);

  return false;
}

/**
 * Structural equality for attribute bags. `undefined` and `{}` are equivalent
 * so `{ type: 'bold' }` equals `{ type: 'bold', attrs: {} }`.
 */
export function attrsEq(a?: Attrs, b?: Attrs): boolean {
  if (a === b)
    return true;

  const aKeys = a ? Object.keys(a) : [];
  const bKeys = b ? Object.keys(b) : [];

  if (aKeys.length !== bKeys.length)
    return false;

  return aKeys.every(key => attrValueEq(a![key], b?.[key]));
}
