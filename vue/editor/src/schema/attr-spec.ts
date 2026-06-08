import type { AttrValue } from '../model';

/** Specification for a single attribute: default, requiredness, validation. */
export interface AttrSpec<V extends AttrValue = AttrValue> {
  readonly default?: V;
  readonly required?: boolean;
  readonly validate?: (value: unknown) => boolean;
}

/** Map of attribute name → {@link AttrSpec}. */
export type AttrsSpec = Readonly<Record<string, AttrSpec>>;
