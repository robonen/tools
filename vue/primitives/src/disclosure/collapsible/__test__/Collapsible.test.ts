import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from '../index';

function mountCollapsible(props: Record<string, unknown> = {}, contentProps: Record<string, unknown> = {}) {
  return mount(defineComponent({
    setup: () => () => h(CollapsibleRoot, props, {
      default: () => [
        h(CollapsibleTrigger, { class: 'trig' }, { default: () => 'Toggle' }),
        h(CollapsibleContent, { class: 'c', ...contentProps }, { default: () => 'Body' }),
      ],
    }),
  }), { attachTo: document.body });
}

function raf() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
}

describe('Collapsible', () => {
  it('starts closed by default; trigger toggles state', async () => {
    const w = mountCollapsible();
    const trigger = w.find('.trig');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(w.find('.c').exists()).toBe(false);
    await trigger.trigger('click');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(w.find('.c').exists()).toBe(true);
  });

  it('opens via defaultOpen', async () => {
    const w = mountCollapsible({ defaultOpen: true });
    await nextTick();
    expect(w.find('.trig').attributes('aria-expanded')).toBe('true');
    expect(w.find('.c').exists()).toBe(true);
    expect(w.find('.c').text()).toBe('Body');
  });

  it('wires aria-controls to content id', async () => {
    const w = mountCollapsible({ defaultOpen: true });
    await nextTick();
    const id = w.find('.c').attributes('id');
    expect(id).toMatch(/collapsible-content/);
    expect(w.find('.trig').attributes('aria-controls')).toBe(id);
  });

  it('respects disabled', async () => {
    const w = mountCollapsible({ disabled: true });
    await w.find('.trig').trigger('click');
    expect(w.find('.trig').attributes('aria-expanded')).toBe('false');
    expect(w.find('.trig').attributes('data-disabled')).toBe('');
  });

  it('forceMount keeps content in DOM when closed', () => {
    const w = mount(defineComponent({
      setup: () => () => h(CollapsibleRoot, null, {
        default: () => [
          h(CollapsibleTrigger, { class: 'trig' }),
          h(CollapsibleContent, { class: 'c', forceMount: true }, { default: () => 'Body' }),
        ],
      }),
    }));
    const content = w.find('.c');
    expect(content.exists()).toBe(true);
    expect(content.attributes('hidden')).toBeDefined();
    expect(content.attributes('data-state')).toBe('closed');
    w.unmount();
  });
});

describe('Collapsible v-model:open (controlled)', () => {
  it('reflects an external v-model and toggles it on click', async () => {
    const open = ref(false);
    const w = mount(defineComponent({
      setup: () => () => h(CollapsibleRoot, {
        open: open.value,
        'onUpdate:open': (v: boolean) => { open.value = v; },
      }, {
        default: () => [
          h(CollapsibleTrigger, { class: 'trig' }),
          h(CollapsibleContent, { class: 'c' }, { default: () => 'Body' }),
        ],
      }),
    }), { attachTo: document.body });

    expect(w.find('.trig').attributes('aria-expanded')).toBe('false');
    await w.find('.trig').trigger('click');
    expect(open.value).toBe(true);
    await nextTick();
    expect(w.find('.trig').attributes('aria-expanded')).toBe('true');
    w.unmount();
  });
});

describe('Collapsible Root exposes open via template ref', () => {
  it('parent can read live open state through a component ref', async () => {
    const rootRef = ref<any>();
    const w = mount(defineComponent({
      setup: () => () => h(CollapsibleRoot, { ref: rootRef, defaultOpen: true }, {
        default: () => [
          h(CollapsibleTrigger, { class: 'trig' }),
          h(CollapsibleContent, { class: 'c' }, { default: () => 'Body' }),
        ],
      }),
    }), { attachTo: document.body });

    await nextTick();
    expect(rootRef.value.open).toBe(true);
    await w.find('.trig').trigger('click');
    expect(rootRef.value.open).toBe(false);
    w.unmount();
  });
});

describe('Collapsible content size CSS variables', () => {
  it('exposes --collapsible-content-height/width inline style', async () => {
    const w = mountCollapsible({ defaultOpen: true });
    await nextTick();
    await raf();
    const style = w.find('.c').attributes('style') ?? '';
    expect(style).toContain('--collapsible-content-height');
    expect(style).toContain('--collapsible-content-width');
    w.unmount();
  });
});

describe('Collapsible unmountOnHide=false', () => {
  it('keeps content mounted while closed and uses hidden="until-found"', async () => {
    const w = mountCollapsible({ unmountOnHide: false });
    await nextTick();
    const content = w.find('.c');
    expect(content.exists()).toBe(true);
    expect(content.attributes('hidden')).toBe('until-found');
    expect(content.attributes('data-state')).toBe('closed');
    w.unmount();
  });

  it('clears hidden when opened and renders slot content while closed', async () => {
    const w = mountCollapsible({ unmountOnHide: false });
    await nextTick();
    const content = w.find('.c');
    expect(content.text()).toBe('Body');
    await w.find('.trig').trigger('click');
    await nextTick();
    expect(content.attributes('hidden')).toBeUndefined();
    expect(content.attributes('data-state')).toBe('open');
    w.unmount();
  });

  it('default unmountOnHide uses plain hidden when forceMount keeps it mounted', async () => {
    const w = mountCollapsible({}, { forceMount: true });
    await nextTick();
    const content = w.find('.c');
    expect(content.attributes('hidden')).toBe('');
    w.unmount();
  });
});

describe('Collapsible initial-mount animation suppression', () => {
  it('omits data-state on first frame for a defaultOpen collapsible, then restores it', async () => {
    const w = mountCollapsible({ defaultOpen: true });
    await nextTick();
    // On the very first frame the enter animation is suppressed, so data-state
    // is intentionally absent to avoid animating in on load.
    expect(w.find('.c').attributes('data-state')).toBeUndefined();
    await raf();
    await nextTick();
    expect(w.find('.c').attributes('data-state')).toBe('open');
    w.unmount();
  });

  it('does not suppress data-state for an initially-closed collapsible', async () => {
    const w = mountCollapsible({});
    await w.find('.trig').trigger('click');
    await nextTick();
    expect(w.find('.c').attributes('data-state')).toBe('open');
    w.unmount();
  });
});

describe('Collapsible find-in-page (beforematch)', () => {
  it('opens and emits contentFound on beforematch when kept mounted', async () => {
    const found = ref(0);
    const open = ref(false);
    const w = mount(defineComponent({
      setup: () => () => h(CollapsibleRoot, {
        open: open.value,
        unmountOnHide: false,
        'onUpdate:open': (v: boolean) => { open.value = v; },
      }, {
        default: () => [
          h(CollapsibleTrigger, { class: 'trig' }),
          h(CollapsibleContent, {
            class: 'c',
            onContentFound: () => { found.value += 1; },
          }, { default: () => 'Body' }),
        ],
      }),
    }), { attachTo: document.body });

    await nextTick();
    const content = w.find('.c').element;
    content.dispatchEvent(new Event('beforematch', { bubbles: true }));
    await raf();
    await nextTick();
    expect(open.value).toBe(true);
    expect(found.value).toBe(1);
    w.unmount();
  });
});
