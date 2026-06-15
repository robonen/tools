import type { MarkSpec } from '../schema';
import type { InputRuleSpec } from './input-rule';

/** Presentational/discovery metadata for a mark (toolbar label, shortcut hint). */
export interface MarkMeta {
  readonly title: string;
  readonly icon?: string;
  readonly hotkey?: string;
}

/**
 * A mark definition: schema contribution (attrs, exclusivity, rank, toDOM,
 * parseDOM) + metadata. Marks are data-only — the view renders/parses them via
 * the spec, which is what makes them fully modular through the registry.
 */
export interface MarkDefinition {
  readonly type: string;
  readonly spec: MarkSpec;
  readonly meta?: MarkMeta;
  readonly inputRules?: readonly InputRuleSpec[];
}

/** Identity factory that narrows a mark definition's literal type (cf. `definePlugin`). */
export function defineMark<const D extends MarkDefinition>(def: D): D {
  return def;
}
