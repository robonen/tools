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

function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

async function flush() {
  await nextTick();
  await nextTick();
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
});
