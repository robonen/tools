import type { ComponentObjectPropsOptions, DefineComponent, Slot } from 'vue';
import { camelize, defineComponent, shallowRef } from 'vue';

/** Map of slot name -> slot props object (or `undefined` for prop-less slots) */
type SlotPropsMap = Record<string, Record<string, any> | undefined>;

/** Turn a {@link SlotPropsMap} into a record of typed `Slot`s */
type GenerateSlotsFromSlotMap<T extends SlotPropsMap>
  = { [K in keyof T]: Slot<T[K]> };

export type DefineTemplateComponent<Bindings extends Record<string, any>, Slots extends SlotPropsMap>
  = DefineComponent & (new () => {
    $slots: {
      default: (_: Bindings & { $slots: GenerateSlotsFromSlotMap<Slots> }) => any;
    };
  });

export type ReuseTemplateComponent<Bindings extends Record<string, any>, Slots extends SlotPropsMap>
  = DefineComponent<Bindings> & (new () => { $slots: GenerateSlotsFromSlotMap<Slots> });

/**
 * The pair returned by {@link createReusableTemplate}. Usable both as a tuple
 * (`const [Define, Reuse] = ...`) and as an object (`const { define, reuse } = ...`).
 */
export type ReusableTemplatePair<Bindings extends Record<string, any>, Slots extends SlotPropsMap>
  = [DefineTemplateComponent<Bindings, Slots>, ReuseTemplateComponent<Bindings, Slots>] & {
    define: DefineTemplateComponent<Bindings, Slots>;
    reuse: ReuseTemplateComponent<Bindings, Slots>;
  };

export interface CreateReusableTemplateOptions<Props extends Record<string, any>> {
  /**
   * Inherit attrs from the reuse component onto its single root vnode.
   *
   * @default true
   */
  inheritAttrs?: boolean;
  /**
   * Name used for the define/reuse components (helpful in Vue devtools).
   *
   * @default 'ReusableTemplate'
   */
  name?: string;
  /**
   * Props definition for the reuse component. When provided, bindings are taken
   * from typed props instead of raw (camelized) attrs.
   */
  props?: ComponentObjectPropsOptions<Props>;
}

/** Re-key an attrs object so every key is camelCased */
function keysToCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj)
    result[camelize(key)] = obj[key];

  return result;
}

/**
 * Wrap a `{ define, reuse }` object so it can also be destructured as the tuple
 * `[define, reuse]`. Avoids a runtime dependency on `@vueuse/shared`.
 */
function makePair<
  Bindings extends Record<string, any>,
  Slots extends SlotPropsMap,
>(
  define: DefineTemplateComponent<Bindings, Slots>,
  reuse: ReuseTemplateComponent<Bindings, Slots>,
): ReusableTemplatePair<Bindings, Slots> {
  const pair = [define, reuse] as unknown as ReusableTemplatePair<Bindings, Slots>;

  pair.define = define;
  pair.reuse = reuse;

  return pair;
}

/**
 * @name createReusableTemplate
 * @category Component
 * @description Define a template once and reuse it multiple times within the
 * same component. Returns a `[DefineTemplate, ReuseTemplate]` pair (also
 * destructurable as `{ define, reuse }`). The template captured by
 * `DefineTemplate`'s default slot is rendered wherever `ReuseTemplate` appears,
 * receiving its props/attrs as slot bindings. Supports a generic for typed
 * bindings, typed slots, custom `props`, and `inheritAttrs`.
 *
 * Render-only and fully SSR-safe — it never touches `window`/`document`. The pair
 * is created lazily and shares a single `shallowRef` for the captured render
 * function, so there are no watchers and no per-render allocations beyond the
 * vnode itself.
 *
 * @param {CreateReusableTemplateOptions<Bindings>} [options] - `name`, `inheritAttrs`, and `props`
 * @returns {ReusableTemplatePair<Bindings, Slots>} A `[define, reuse]` tuple, also accessible as `{ define, reuse }`
 *
 * @example
 * const [DefineTemplate, ReuseTemplate] = createReusableTemplate();
 * // Template:
 * // <DefineTemplate><span>Hello</span></DefineTemplate>
 * // <ReuseTemplate /> <ReuseTemplate />
 *
 * @example
 * // Typed bindings + custom props
 * const [DefineItem, ReuseItem] = createReusableTemplate<{ label: string }>();
 * // <DefineItem v-slot="{ label }">{{ label }}</DefineItem>
 * // <ReuseItem label="A" /> <ReuseItem label="B" />
 *
 * @since 0.0.15
 */
export function createReusableTemplate<
  Bindings extends Record<string, any>,
  Slots extends SlotPropsMap = Record<'default', undefined>,
>(
  options: CreateReusableTemplateOptions<Bindings> = {},
): ReusableTemplatePair<Bindings, Slots> {
  const {
    inheritAttrs = true,
    name = 'ReusableTemplate',
    props,
  } = options;

  // Shared captured render fn — no watchers, single allocation.
  const render = shallowRef<Slot | undefined>();

  const define = defineComponent({
    name: `${name}.define`,
    setup(_, { slots }) {
      return () => {
        render.value = slots.default;
      };
    },
  }) as unknown as DefineTemplateComponent<Bindings, Slots>;

  const reuse = defineComponent({
    name: `${name}.reuse`,
    inheritAttrs,
    props,
    setup(reuseProps, { attrs, slots }) {
      return () => {
        if (!render.value) {
          // Local cast so the dev-only guard type-checks without @types/node and stays
          // tree-shakeable in production builds (where NODE_ENV is statically replaced).
          const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
          if (nodeEnv !== 'production')
            throw new Error('[createReusableTemplate] Failed to find the template definition. Did you render the Define component before the Reuse component?');

          return undefined;
        }

        const vnode = render.value({
          ...(props === undefined ? keysToCamelCase(attrs) : reuseProps),
          $slots: slots,
        });

        // When inheriting attrs onto a single root, unwrap the fragment so Vue
        // can merge the reuse component's attrs onto that root vnode.
        return inheritAttrs && vnode?.length === 1 ? vnode[0] : vnode;
      };
    },
  }) as unknown as ReuseTemplateComponent<Bindings, Slots>;

  return makePair(define, reuse);
}
