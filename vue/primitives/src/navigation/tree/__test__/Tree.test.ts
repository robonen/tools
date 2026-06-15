import { TreeItem, TreeRoot } from '../index';
import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const TREE: Node[] = [
  {
    id: 'a',
    label: 'A',
    children: [
      { id: 'a-1', label: 'A.1' },
      {
        id: 'a-2',
        label: 'A.2',
        children: [
          { id: 'a-2-1', label: 'A.2.1' },
          { id: 'a-2-2', label: 'A.2.2' },
        ],
      },
    ],
  },
  { id: 'b', label: 'B' },
  {
    id: 'c',
    label: 'C',
    children: [{ id: 'c-1', label: 'C.1' }],
  },
];

function createTree(rootProps: Record<string, unknown> = {}, items: Node[] = TREE) {
  return mount(
    defineComponent({
      setup() {
        return () => h(
          TreeRoot,
          {
            items,
            getKey: (n: unknown) => (n as Node).id,
            getChildren: (n: unknown) => (n as Node).children,
            ...rootProps,
          },
          {
            default: ({ flatItems }: { flatItems: Array<{ key: string; value: Node; level: number; hasChildren: boolean }> }) =>
              flatItems.map(item =>
                h(TreeItem, { key: item.key, item }, { default: () => item.value.label }),
              ),
          },
        );
      },
    }),
    { attachTo: document.body },
  );
}

function press(el: Element, key: string, opts: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
}

async function flush() {
  await nextTick();
  await nextTick();
}

// Variant that lets every TreeItem receive extra props / listeners (item-level
// `disabled`, `onSelect`, `onToggle`).
function createTreeWithItemProps(
  rootProps: Record<string, unknown> = {},
  itemProps: (item: { key: string; value: Node }) => Record<string, unknown> = () => ({}),
  items: Node[] = TREE,
) {
  return mount(
    defineComponent({
      setup() {
        return () => h(
          TreeRoot,
          {
            items,
            getKey: (n: unknown) => (n as Node).id,
            getChildren: (n: unknown) => (n as Node).children,
            ...rootProps,
          },
          {
            default: ({ flatItems }: { flatItems: Array<{ key: string; value: Node }> }) =>
              flatItems.map(item =>
                h(TreeItem, { key: item.key, item, ...itemProps(item) }, { default: () => item.value.label }),
              ),
          },
        );
      },
    }),
    { attachTo: document.body },
  );
}

describe('Tree', () => {
  it('renders only top-level items when nothing is expanded', () => {
    const w = createTree();
    const items = w.findAll('[role="treeitem"]');
    expect(items).toHaveLength(3);
    expect(items.map(i => i.text())).toEqual(['A', 'B', 'C']);
    w.unmount();
  });

  it('sets role="tree" on root', () => {
    const w = createTree();
    expect(w.find('[role="tree"]').exists()).toBe(true);
    w.unmount();
  });

  it('wires aria-level and aria-expanded', () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const items = w.findAll('[role="treeitem"]');
    // A (has children, expanded), A.1 (leaf), A.2 (has children, closed), B, C
    expect(items[0]!.attributes('aria-level')).toBe('1');
    expect(items[0]!.attributes('aria-expanded')).toBe('true');
    expect(items[0]!.attributes('data-state')).toBe('open');

    expect(items[1]!.attributes('aria-level')).toBe('2');
    expect(items[1]!.attributes('aria-expanded')).toBeUndefined();
    expect(items[1]!.attributes('data-state')).toBeUndefined();

    expect(items[2]!.attributes('aria-level')).toBe('2');
    expect(items[2]!.attributes('aria-expanded')).toBe('false');
    expect(items[2]!.attributes('data-state')).toBe('closed');
    w.unmount();
  });

  it('click toggles expansion of a parent node', async () => {
    const w = createTree();
    const a = w.findAll('[role="treeitem"]')[0]!;
    await a.trigger('click');
    await flush();
    // now A is expanded, A.1 + A.2 visible
    const items = w.findAll('[role="treeitem"]');
    expect(items).toHaveLength(5);
    expect(items.map(i => i.text())).toEqual(['A', 'A.1', 'A.2', 'B', 'C']);
    w.unmount();
  });

  it('click selects a node (single-select)', async () => {
    const w = createTree();
    const b = w.findAll('[role="treeitem"]')[1]!;
    await b.trigger('click');
    await flush();
    expect(b.attributes('aria-selected')).toBe('true');
    expect(b.attributes('data-selected')).toBe('');
    w.unmount();
  });

  it('single-select: selecting another item replaces the previous selection', async () => {
    const w = createTree({ defaultValue: 'b' });
    const items = w.findAll('[role="treeitem"]');
    expect(items[1]!.attributes('aria-selected')).toBe('true');

    await items[0]!.trigger('click');
    await flush();

    const after = w.findAll('[role="treeitem"]');
    expect(after[0]!.attributes('aria-selected')).toBe('true');
    expect(after.find(i => i.text() === 'B')!.attributes('aria-selected')).toBe('false');
    w.unmount();
  });

  it('multiple-select: selections accumulate', async () => {
    const w = createTree({ multiple: true });
    const items = w.findAll('[role="treeitem"]');
    await items[0]!.trigger('click'); // A (also expands)
    await flush();
    await w.findAll('[role="treeitem"]').find(i => i.text() === 'B')!.trigger('click');
    await flush();
    const all = w.findAll('[role="treeitem"]');
    const selected = all.filter(i => i.attributes('aria-selected') === 'true').map(i => i.text());
    expect(selected).toContain('A');
    expect(selected).toContain('B');
    w.unmount();
  });

  it('ArrowDown / ArrowUp move focus through visible items', async () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const items = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    items[0]!.focus();
    expect(document.activeElement).toBe(items[0]);
    press(items[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]); // A.1
    press(items[1]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[2]); // A.2
    press(items[2]!, 'ArrowUp');
    expect(document.activeElement).toBe(items[1]);
    w.unmount();
  });

  it('Home / End jump to first / last visible item', () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const items = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    items[2]!.focus();
    press(items[2]!, 'End');
    expect(document.activeElement).toBe(items[items.length - 1]);
    press(items[items.length - 1]!, 'Home');
    expect(document.activeElement).toBe(items[0]);
    w.unmount();
  });

  it('ArrowRight expands a collapsed parent; ArrowRight again moves to first child', async () => {
    const w = createTree();
    const items = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    items[0]!.focus();
    press(items[0]!, 'ArrowRight');
    await flush();
    const next = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    expect(next[0]!.getAttribute('aria-expanded')).toBe('true');
    press(next[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(next[1]); // A.1
    w.unmount();
  });

  it('ArrowLeft collapses an expanded parent; ArrowLeft on a leaf jumps to its parent', async () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const items = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    const a1 = items[1]!; // leaf
    a1.focus();
    press(a1, 'ArrowLeft');
    expect(document.activeElement).toBe(items[0]); // back to A

    // Now collapse A with another ArrowLeft
    press(items[0]!, 'ArrowLeft');
    await flush();
    const updated = w.findAll('[role="treeitem"]');
    expect(updated).toHaveLength(3);
    w.unmount();
  });

  it('Enter / Space select the focused item', async () => {
    const w = createTree();
    const first = w.find('[role="treeitem"]').element as HTMLElement;
    first.focus();
    press(first, 'Enter');
    await flush();
    expect(first.getAttribute('aria-selected')).toBe('true');
    w.unmount();
  });

  it('emits update:modelValue and update:expanded', async () => {
    const onModel: string[][] = [];
    const onExpanded: string[][] = [];
    const w = createTree({
      'onUpdate:modelValue': (v: string | string[] | undefined) => {
        onModel.push(Array.isArray(v) ? v : v === undefined ? [] : [v]);
      },
      'onUpdate:expanded': (v: string[]) => {
        onExpanded.push(v);
      },
    });
    const first = w.find('[role="treeitem"]');
    await first.trigger('click');
    await flush();
    expect(onModel[0]).toEqual(['a']);
    expect(onExpanded[0]).toEqual(['a']);
    w.unmount();
  });

  it('disabled tree ignores clicks and keyboard selection', async () => {
    const onModel: unknown[] = [];
    const w = createTree({ disabled: true, 'onUpdate:modelValue': (v: unknown) => onModel.push(v) });
    const first = w.find('[role="treeitem"]');
    await first.trigger('click');
    await flush();
    expect(first.attributes('aria-selected')).toBe('false');
    expect(onModel).toHaveLength(0);
    w.unmount();
  });

  it('propagateSelect cascades selection to all descendants', async () => {
    const captured: string[][] = [];
    const w = createTree({
      multiple: true,
      propagateSelect: true,
      defaultExpanded: ['a', 'a-2'],
      'onUpdate:modelValue': (v: string[]) => captured.push(v),
    });
    const a = w.findAll('[role="treeitem"]')[0]!; // A
    await a.trigger('click');
    await flush();
    const emitted = captured.at(-1)!;
    expect(emitted).toEqual(expect.arrayContaining(['a', 'a-1', 'a-2', 'a-2-1', 'a-2-2']));
    w.unmount();
  });

  // --- Roving single tab stop --------------------------------------------

  it('exposes a single roving tab stop: only one item has tabindex=0', () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const items = w.findAll('[role="treeitem"]');
    const tabbable = items.filter(i => i.attributes('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    // The rest are -1.
    const negative = items.filter(i => i.attributes('tabindex') === '-1');
    expect(negative).toHaveLength(items.length - 1);
    w.unmount();
  });

  it('initial tab stop lands on the selected item', () => {
    const w = createTree({ defaultExpanded: ['a'], defaultValue: 'a-2' });
    const items = w.findAll('[role="treeitem"]');
    const tabbable = items.find(i => i.attributes('tabindex') === '0')!;
    expect(tabbable.text()).toBe('A.2');
    w.unmount();
  });

  it('moving focus via arrow keys moves the tab stop', async () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const els = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    els[0]!.focus();
    press(els[0]!, 'ArrowDown');
    await flush();
    const items = w.findAll('[role="treeitem"]');
    expect(items[0]!.attributes('tabindex')).toBe('-1');
    expect(items[1]!.attributes('tabindex')).toBe('0');
    w.unmount();
  });

  // --- aria-setsize / aria-posinset --------------------------------------

  it('emits aria-setsize and aria-posinset per sibling group', () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const items = w.findAll('[role="treeitem"]');
    // Top level has 3 siblings (A, B, C).
    expect(items[0]!.attributes('aria-setsize')).toBe('3');
    expect(items[0]!.attributes('aria-posinset')).toBe('1');
    // A.1 and A.2 are within a group of 2.
    expect(items[1]!.attributes('aria-setsize')).toBe('2');
    expect(items[1]!.attributes('aria-posinset')).toBe('1');
    expect(items[2]!.attributes('aria-setsize')).toBe('2');
    expect(items[2]!.attributes('aria-posinset')).toBe('2');
    // B is position 2 of the top-level group.
    expect(items[3]!.attributes('aria-posinset')).toBe('2');
    w.unmount();
  });

  // --- PageUp / PageDown --------------------------------------------------

  it('PageDown jumps to last, PageUp jumps to first', () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const els = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    els[0]!.focus();
    press(els[0]!, 'PageDown');
    expect(document.activeElement).toBe(els[els.length - 1]);
    press(els[els.length - 1]!, 'PageUp');
    expect(document.activeElement).toBe(els[0]);
    w.unmount();
  });

  // --- Type-ahead ---------------------------------------------------------

  it('type-ahead focuses the next item whose label matches a typed character', () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const els = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    // visible: A, A.1, A.2, B, C
    els[0]!.focus();
    press(els[0]!, 'b');
    expect((document.activeElement as HTMLElement).textContent).toBe('B');
    w.unmount();
  });

  it('repeating a single character cycles through matches', () => {
    const w = createTree({ defaultExpanded: ['a'] });
    const els = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    // visible labels starting with "A": A, A.1, A.2
    els[0]!.focus();
    press(els[0]!, 'a'); // from A -> next "A*" is A.1
    expect((document.activeElement as HTMLElement).textContent).toBe('A.1');
    press(document.activeElement!, 'a'); // repeated 'a' cycles -> A.2
    expect((document.activeElement as HTMLElement).textContent).toBe('A.2');
    w.unmount();
  });

  it('type-ahead respects a getLabel accessor', () => {
    const w = createTree({
      defaultExpanded: ['a'],
      getLabel: (n: unknown) => (n as Node).id.toUpperCase(),
    });
    const els = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    els[0]!.focus();
    press(els[0]!, 'c'); // id 'c' -> 'C'
    expect((document.activeElement as HTMLElement).textContent).toBe('C');
    w.unmount();
  });

  // --- selectionBehavior --------------------------------------------------

  it('selectionBehavior=replace resets multi-selection to the clicked item', async () => {
    const w = createTree({ multiple: true, selectionBehavior: 'replace', defaultExpanded: ['a'] });
    const items = () => w.findAll('[role="treeitem"]');
    await items()[1]!.trigger('click'); // A.1
    await flush();
    await items()[3]!.trigger('click'); // B
    await flush();
    const selected = items().filter(i => i.attributes('aria-selected') === 'true').map(i => i.text());
    expect(selected).toEqual(['B']);
    w.unmount();
  });

  it('Shift+ArrowDown extends a contiguous range in replace mode', async () => {
    const captured: string[][] = [];
    const w = createTree({
      multiple: true,
      selectionBehavior: 'replace',
      defaultExpanded: ['a'],
      'onUpdate:modelValue': (v: string[]) => captured.push(v),
    });
    const els = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    // visible: A, A.1, A.2, B, C -> click A.1 to anchor
    els[1]!.focus();
    await w.findAll('[role="treeitem"]')[1]!.trigger('click');
    await flush();
    press(document.activeElement!, 'ArrowDown', { shiftKey: true });
    await flush();
    expect(captured.at(-1)).toEqual(['a-1', 'a-2']);
    press(document.activeElement!, 'ArrowDown', { shiftKey: true });
    await flush();
    expect(captured.at(-1)).toEqual(['a-1', 'a-2', 'b']);
    w.unmount();
  });

  // --- bubbleSelect + indeterminate --------------------------------------

  it('bubbleSelect selects parent when all children are selected', async () => {
    const captured: string[][] = [];
    const w = createTree({
      multiple: true,
      bubbleSelect: true,
      defaultExpanded: ['a', 'a-2'],
      'onUpdate:modelValue': (v: string[]) => captured.push(v),
    });
    const find = (text: string) => w.findAll('[role="treeitem"]').find(i => i.text() === text)!;
    await find('A.2.1').trigger('click');
    await flush();
    await find('A.2.2').trigger('click');
    await flush();
    // Both children of A.2 selected -> A.2 bubbles in.
    expect(captured.at(-1)).toEqual(expect.arrayContaining(['a-2-1', 'a-2-2', 'a-2']));
    w.unmount();
  });

  it('exposes is-indeterminate to the item slot for partial parent coverage', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            TreeRoot,
            {
              items: TREE,
              getKey: (n: unknown) => (n as Node).id,
              getChildren: (n: unknown) => (n as Node).children,
              multiple: true,
              bubbleSelect: true,
              defaultExpanded: ['a', 'a-2'],
            },
            {
              default: ({ flatItems }: { flatItems: Array<{ key: string; value: Node }> }) =>
                flatItems.map(item =>
                  h(TreeItem, { key: item.key, item }, {
                    default: ({ isIndeterminate }: { isIndeterminate: boolean | undefined }) =>
                      h('span', { 'data-ind': isIndeterminate ? 'yes' : 'no' }, item.value.label),
                  }),
                ),
            },
          );
        },
      }),
      { attachTo: document.body },
    );
    const find = (text: string) => w.findAll('[role="treeitem"]').find(i => i.text() === text)!;
    await find('A.2.1').trigger('click'); // only one of A.2's two children
    await flush();
    const a2 = find('A.2');
    expect(a2.attributes('data-indeterminate')).toBe('');
    expect(a2.find('[data-ind]').attributes('data-ind')).toBe('yes');
    w.unmount();
  });

  // --- Cancelable select / toggle emits ----------------------------------

  it('emits cancelable select / toggle events that can veto state change', async () => {
    const w = createTreeWithItemProps(
      {},
      item => item.key === 'a'
        ? {
            onSelect: (e: CustomEvent) => e.preventDefault(),
            onToggle: (e: CustomEvent) => e.preventDefault(),
          }
        : {},
    );
    const a = w.findAll('[role="treeitem"]')[0]!; // A
    await a.trigger('click');
    await flush();
    // select + toggle vetoed -> still collapsed, not selected.
    expect(w.findAll('[role="treeitem"]')).toHaveLength(3);
    expect(a.attributes('aria-selected')).toBe('false');
    w.unmount();
  });

  it('select event carries value + state in its detail', async () => {
    const details: Array<{ value: Node; isSelected: boolean }> = [];
    const w = createTreeWithItemProps(
      {},
      () => ({ onSelect: (e: CustomEvent) => details.push(e.detail) }),
    );
    await w.findAll('[role="treeitem"]')[1]!.trigger('click'); // B
    await flush();
    expect(details[0]!.value.id).toBe('b');
    expect(details[0]!.isSelected).toBe(false); // state captured before mutation
    w.unmount();
  });

  // --- item-level disabled -----------------------------------------------

  it('item-level disabled blocks selection and is skipped by navigation', async () => {
    const onModel: unknown[] = [];
    const w = createTreeWithItemProps(
      { defaultExpanded: ['a'], 'onUpdate:modelValue': (v: unknown) => onModel.push(v) },
      item => (item.key === 'a-1' ? { disabled: true } : {}),
    );
    const items = w.findAll('[role="treeitem"]');
    const a1 = items.find(i => i.text() === 'A.1')!;
    expect(a1.attributes('data-disabled')).toBe('');
    expect(a1.attributes('tabindex')).toBe('-1');
    await a1.trigger('click');
    await flush();
    expect(onModel).toHaveLength(0);
    // ArrowDown from A skips disabled A.1 and lands on A.2.
    const els = w.findAll('[role="treeitem"]').map(i => i.element as HTMLElement);
    els[0]!.focus();
    press(els[0]!, 'ArrowDown');
    expect((document.activeElement as HTMLElement).textContent).toBe('A.2');
    w.unmount();
  });
});
