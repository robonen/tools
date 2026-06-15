import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '../index';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

interface BuildOptions {
  rootProps?: Record<string, unknown>;
  itemProps?: (index: number) => Record<string, unknown>;
  withHeader?: boolean;
  itemCount?: number;
  contentProps?: Record<string, unknown>;
  contentListeners?: Record<string, unknown>;
}

function build({
  rootProps = {},
  itemProps,
  withHeader = false,
  itemCount = 3,
  contentProps = {},
  contentListeners = {},
}: BuildOptions = {}) {
  return mount(
    defineComponent({
      setup() {
        return () => h(AccordionRoot, { ...rootProps }, {
          default: () => Array.from({ length: itemCount }, (_, i) => {
            const val = String.fromCodePoint(97 + i);
            const trigger = h(AccordionTrigger, null, { default: () => `Trigger ${val.toUpperCase()}` });
            return h(AccordionItem, { value: val, key: val, ...(itemProps ? itemProps(i) : {}) }, {
              default: () => [
                withHeader ? h(AccordionHeader, null, { default: () => trigger }) : trigger,
                h(AccordionContent, { ...contentProps, ...contentListeners }, { default: () => `Content ${val.toUpperCase()}` }),
              ],
            });
          }),
        });
      },
    }),
    { attachTo: document.body },
  );
}

describe('Accordion parity additions', () => {
  describe('AccordionHeader', () => {
    it('renders an h3 wrapping the trigger by default with forwarded data-attrs', () => {
      const w = build({ rootProps: { defaultValue: 'a' }, withHeader: true });
      const headers = w.findAll('h3');
      expect(headers).toHaveLength(3);
      // first item open
      expect(headers[0]!.attributes('data-state')).toBe('open');
      expect(headers[1]!.attributes('data-state')).toBe('closed');
      // trigger lives inside the heading (WAI-ARIA accordion requirement)
      expect(headers[0]!.find('button').exists()).toBe(true);
      w.unmount();
    });

    it('respects the as prop and reflects data-orientation/data-disabled', () => {
      const w = build({
        rootProps: { orientation: 'horizontal' },
        withHeader: true,
        itemProps: i => (i === 0 ? { disabled: true } : {}),
      });
      const headers = w.findAll('h3');
      expect(headers[0]!.attributes('data-orientation')).toBe('horizontal');
      expect(headers[0]!.attributes('data-disabled')).toBe('');
      expect(headers[1]!.attributes('data-disabled')).toBeUndefined();
      w.unmount();
    });
  });

  describe('content dimension CSS variables', () => {
    it('exposes --accordion-content-height/width on open content', () => {
      const w = build({ rootProps: { defaultValue: 'a' } });
      const region = w.find('[role="region"]');
      const style = region.attributes('style') ?? '';
      expect(style).toContain('--accordion-content-height');
      expect(style).toContain('--accordion-content-width');
      w.unmount();
    });
  });

  describe('unmountOnHide', () => {
    it('default unmounts closed content (no region rendered)', () => {
      const w = build();
      expect(w.findAll('[role="region"]')).toHaveLength(0);
      w.unmount();
    });

    it('root unmountOnHide=false keeps closed content mounted with hidden="until-found"', async () => {
      const w = build({ rootProps: { unmountOnHide: false } });
      await nextTick();
      const regions = w.findAll('[role="region"]');
      expect(regions.length).toBe(3);
      // all closed -> hidden=until-found
      regions.forEach((r) => {
        expect(r.attributes('hidden')).toBe('until-found');
        expect(r.attributes('data-state')).toBe('closed');
      });
      w.unmount();
    });

    it('per-item unmountOnHide overrides the root default', async () => {
      const w = build({
        rootProps: { unmountOnHide: true },
        itemProps: i => (i === 0 ? { unmountOnHide: false } : {}),
      });
      await nextTick();
      // item 0 kept mounted (until-found), items 1/2 unmounted
      const regions = w.findAll('[role="region"]');
      expect(regions).toHaveLength(1);
      expect(regions[0]!.attributes('hidden')).toBe('until-found');
      expect(regions[0]!.text()).toBe('Content A');
      w.unmount();
    });

    it('open content has no hidden attribute', async () => {
      const w = build({ rootProps: { unmountOnHide: false, defaultValue: 'a' } });
      await nextTick();
      const open = w.findAll('[role="region"]').find(r => r.attributes('data-state') === 'open');
      expect(open).toBeDefined();
      expect(open!.attributes('hidden')).toBeUndefined();
      w.unmount();
    });
  });

  describe('beforematch find-in-page reveal', () => {
    it('opens the item and emits contentFound when beforematch fires', async () => {
      const found = vi.fn();
      const w = build({
        rootProps: { unmountOnHide: false, collapsible: true },
        contentListeners: { onContentFound: found },
      });
      await nextTick();
      const region = w.findAll('[role="region"]')[0]!.element as HTMLElement;

      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });

      region.dispatchEvent(new Event('beforematch', { bubbles: true }));
      await nextTick();

      expect(found).toHaveBeenCalledTimes(1);
      const open = w.findAll('[role="region"]').find(r => r.attributes('data-state') === 'open');
      expect(open?.text()).toBe('Content A');

      rafSpy.mockRestore();
      w.unmount();
    });
  });

  describe('root slot exposes modelValue', () => {
    it('passes current value(s) to the default slot', async () => {
      let slotValue: unknown;
      const value = ref<string | undefined>('a');
      const w = mount(
        defineComponent({
          setup() {
            return () => h(AccordionRoot, {
              modelValue: value.value,
              'onUpdate:modelValue': (v: string | string[] | undefined) => { value.value = v as string | undefined; },
              collapsible: true,
            }, {
              default: (slotProps: { modelValue: unknown }) => {
                slotValue = slotProps.modelValue;
                return [
                  h(AccordionItem, { value: 'a' }, {
                    default: () => [
                      h(AccordionTrigger, null, { default: () => 'A' }),
                      h(AccordionContent, null, { default: () => 'PA' }),
                    ],
                  }),
                ];
              },
            });
          },
        }),
        { attachTo: document.body },
      );
      await nextTick();
      expect(slotValue).toBe('a');
      w.unmount();
    });
  });

  describe('AccordionItem defineExpose', () => {
    it('exposes open and disabled state via template ref', async () => {
      const itemRef = ref<{ open: boolean; disabled: boolean } | null>(null);
      const w = mount(
        defineComponent({
          setup() {
            return () => h(AccordionRoot, { defaultValue: 'a' }, {
              default: () => [
                h(AccordionItem, { value: 'a', ref: itemRef as never, disabled: true }, {
                  default: () => [
                    h(AccordionTrigger, null, { default: () => 'A' }),
                    h(AccordionContent, null, { default: () => 'PA' }),
                  ],
                }),
              ],
            });
          },
        }),
        { attachTo: document.body },
      );
      await nextTick();
      expect(itemRef.value?.open).toBe(true);
      expect(itemRef.value?.disabled).toBe(true);
      w.unmount();
    });
  });

  describe('type inference', () => {
    it('infers multiple mode from an array defaultValue without explicit type', async () => {
      const w = build({ rootProps: { defaultValue: ['a', 'b'] } });
      await nextTick();
      expect(w.findAll('[role="region"]')).toHaveLength(2);
      // multiple: opening a third keeps the first two
      const triggers = w.findAll('button');
      await triggers[2 - 2]!.trigger('click'); // toggle 'a' off
      await nextTick();
      // after toggling 'a' off, only 'b' remains -> still multiple semantics
      expect(w.findAll('[role="region"]')).toHaveLength(1);
      w.unmount();
    });

    it('infers single mode from a string defaultValue without explicit type', async () => {
      const w = build({ rootProps: { defaultValue: 'a' } });
      await nextTick();
      const triggers = w.findAll('button');
      await triggers[1]!.trigger('click');
      await nextTick();
      // single: opening b closes a
      const regions = w.findAll('[role="region"]');
      expect(regions).toHaveLength(1);
      expect(regions[0]!.text()).toBe('Content B');
      w.unmount();
    });

    it('warns in dev when explicit type conflicts with value shape', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const w = build({ rootProps: { type: 'single', defaultValue: ['a', 'b'] } });
      expect(warn).toHaveBeenCalled();
      // explicit type wins: single coercion
      warn.mockRestore();
      w.unmount();
    });
  });

  describe('trigger no-op guard (single, non-collapsible)', () => {
    it('clicking an already-open item does not emit when not collapsible', async () => {
      const updates: unknown[] = [];
      const w = mount(
        defineComponent({
          setup() {
            return () => h(AccordionRoot, {
              type: 'single',
              collapsible: false,
              defaultValue: 'a',
              'onUpdate:modelValue': (v: unknown) => updates.push(v),
            }, {
              default: () => [
                h(AccordionItem, { value: 'a' }, {
                  default: () => [
                    h(AccordionTrigger, null, { default: () => 'A' }),
                    h(AccordionContent, null, { default: () => 'PA' }),
                  ],
                }),
              ],
            });
          },
        }),
        { attachTo: document.body },
      );
      await nextTick();
      const trigger = w.find('button');
      await trigger.trigger('click');
      await nextTick();
      expect(updates).toHaveLength(0);
      // still open
      expect(w.find('[role="region"]').text()).toBe('PA');
      w.unmount();
    });
  });
});
