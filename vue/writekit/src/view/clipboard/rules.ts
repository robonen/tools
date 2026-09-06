import type { Attrs, Mark } from '../../model';
import type { BlockDefinition, MarkDefinition, Registry } from '../../registry';
import type { ParseRule } from '../../schema';

interface Compiled<D> {
  readonly def: D;
  readonly rule: ParseRule;
}

/** A registry's `parseDOM` rules, flattened and ordered by priority once. */
export interface CompiledRules {
  readonly blocks: ReadonlyArray<Compiled<BlockDefinition>>;
  readonly marks: ReadonlyArray<Compiled<MarkDefinition>>;
}

export interface BlockHit {
  readonly def: BlockDefinition;
  readonly attrs: Attrs | undefined;
}

const cache = new WeakMap<Registry, CompiledRules>();

function compile<D extends { readonly spec: { readonly parseDOM?: readonly ParseRule[] } }>(defs: readonly D[]): Array<Compiled<D>> {
  const out: Array<Compiled<D>> = [];

  for (const def of defs) {
    for (const rule of def.spec.parseDOM ?? [])
      out.push({ def, rule });
  }

  // Stable: equal priorities keep registration order.
  return out.sort((a, b) => (b.rule.priority ?? 0) - (a.rule.priority ?? 0));
}

/** The compiled rules of a registry — built on first use, one set per registry. */
export function compiledRules(registry: Registry): CompiledRules {
  let rules = cache.get(registry);

  if (!rules) {
    rules = { blocks: compile(registry.listBlocks()), marks: compile(registry.listMarks()) };
    cache.set(registry, rules);
  }

  return rules;
}

/**
 * Test one rule against an element. `tag` is a selector; `style` names a CSS
 * property the element's inline style must set (`font-weight` for the spans
 * word processors paste instead of `<b>`). `getAttrs` refines or rejects.
 * Returns the attrs to apply (`undefined` = none) or `null` for no match.
 */
function apply(el: HTMLElement, rule: ParseRule): Attrs | undefined | null {
  if (rule.tag && !el.matches(rule.tag))
    return null;
  if (rule.style && !el.style.getPropertyValue(rule.style))
    return null;
  if (!rule.tag && !rule.style)
    return null;

  if (!rule.getAttrs)
    return rule.attrs;

  const got = rule.getAttrs(el);
  if (got === false || got === null)
    return null;

  return { ...(rule.attrs ?? {}), ...got };
}

/** The first block rule an element satisfies, in priority order. */
export function matchBlock(el: HTMLElement, rules: CompiledRules): BlockHit | null {
  for (const { def, rule } of rules.blocks) {
    const attrs = apply(el, rule);
    if (attrs !== null)
      return { def, attrs };
  }

  return null;
}

/** The marks an element contributes: for each mark type, its first satisfied rule. */
export function matchMarks(el: HTMLElement, rules: CompiledRules): Mark[] {
  const marks: Mark[] = [];
  const seen = new Set<string>();

  for (const { def, rule } of rules.marks) {
    if (seen.has(def.type))
      continue;

    const attrs = apply(el, rule);
    if (attrs === null)
      continue;

    seen.add(def.type);
    marks.push(attrs && Object.keys(attrs).length > 0 ? { type: def.type, attrs } : { type: def.type });
  }

  return marks;
}
