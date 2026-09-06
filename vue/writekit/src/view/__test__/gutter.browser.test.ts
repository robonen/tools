import { render } from 'vitest-browser-vue';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import type { Node } from '../../model';
import { caret, createDoc, createNode, nodeText } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { createWritekit, createWritekitState } from '../../state';
import WritekitRoot from '../WritekitRoot.vue';
import WritekitContent from '../WritekitContent.vue';
import { WritekitBlockGutter, WritekitBlockHandle, WritekitBlockInserter } from '../ui';

function para(id: string, text: string): Node {
  return createNode('paragraph', { id, content: text ? [{ text, marks: [] }] : [] });
}

function mount(blocks: Node[]) {
  const registry = createDefaultRegistry();
  const writekit = createWritekit({ state: createWritekitState({ registry, doc: createDoc(blocks) }) });
  const App = defineComponent({
    setup: () => () => h(WritekitRoot, { writekit, platform: 'mac' }, () => [
      h(WritekitContent),
      h(WritekitBlockGutter, null, () => [h(WritekitBlockInserter), h(WritekitBlockHandle)]),
    ]),
  });
  render(App);
  return writekit;
}

const wrapper = (id: string) => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)!;
const closestBlockId = (node: Node) => (node.nodeType === 1 ? node as Element : node.parentElement)?.closest('[data-block-id]')?.getAttribute('data-block-id') ?? null;
const texts = (w: ReturnType<typeof mount>) => w.state.doc.content.map(block => nodeText(block));

function pointer(type: string, target: EventTarget, x: number, y: number, extra: PointerEventInit = {}): void {
  target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, button: 0, bubbles: true, cancelable: true, ...extra }));
}

async function hover(id: string): Promise<HTMLElement> {
  const el = wrapper(id);
  const rect = el.getBoundingClientRect();
  pointer('pointermove', el, rect.left + 10, rect.top + rect.height / 2);
  await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-gutter]')).not.toBeNull());
  return document.querySelector<HTMLElement>('[data-writekit-block-gutter]')!;
}

async function frame(): Promise<void> {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

describe('block gutter', () => {
  it('appears beside the hovered block and follows the pointer to another', async () => {
    mount([para('a', 'first'), para('b', 'second')]);

    const gutter = await hover('a');
    expect(gutter.querySelector('[data-writekit-block-handle]')).not.toBeNull();
    expect(gutter.querySelector('[data-writekit-block-inserter]')).not.toBeNull();
    const firstTop = gutter.getBoundingClientRect().top;

    await hover('b');
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-gutter]')!.getBoundingClientRect().top).toBeGreaterThan(firstTop));
  });

  it('the inserter opens a block picker under the plus; a pick lands an empty block below with the caret in it', async () => {
    const w = mount([para('a', 'first'), para('b', 'second')]);
    const gutter = await hover('a');

    gutter.querySelector<HTMLButtonElement>('[data-writekit-block-inserter]')!.click();
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-picker]')).not.toBeNull());

    const labels = Array.from(document.querySelectorAll<HTMLElement>('[data-writekit-menu-label]')).map(el => el.textContent?.trim());
    expect(labels).toEqual(['basic', 'lists', 'media']);
    const heading2 = Array.from(document.querySelectorAll<HTMLElement>('[data-writekit-block-picker] [data-writekit-menu-item]')).find(el => el.textContent?.trim() === 'Heading 2')!;
    heading2.click();

    await vi.waitFor(() => expect(w.state.doc.content.map(block => block.type)).toEqual(['paragraph', 'heading', 'paragraph']));
    const line = w.state.doc.content[1]!;
    expect(line.attrs).toEqual({ level: 2 });
    expect(texts(w)).toEqual(['first', '', 'second']);
    expect(w.state.selection).toEqual(caret(line.id, 0));
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-picker]')).toBeNull());
    await vi.waitFor(() => expect(getSelection()!.anchorNode ? closestBlockId(getSelection()!.anchorNode!) : null).toBe(line.id));
  });

  it('sits centred on the first line of the block, whatever its height', async () => {
    // A tall heading line, a padded paragraph, and one that wraps: the controls
    // follow the first line box, not the block's middle or its top edge.
    const css = document.createElement('style');
    css.textContent = 'h1[data-block-content]{line-height:64px;font-size:40px} p[data-block-content]{line-height:32px;padding-top:10px;width:120px}';
    document.head.append(css);
    try {
      const tall = createNode('heading', { id: 'h', attrs: { level: 1 }, content: [{ text: 'Big', marks: [] }] });
      mount([tall, para('a', 'one line'), para('b', 'a long paragraph that wraps onto several lines')]);

      for (const id of ['h', 'a', 'b']) {
        const gutter = await hover(id);
        const host = wrapper(id).querySelector<HTMLElement>('[data-block-content]')!;
        const style = getComputedStyle(host);
        const lineCentre = host.getBoundingClientRect().top + Number.parseFloat(style.paddingTop) + Number.parseFloat(style.lineHeight) / 2;
        await vi.waitFor(() => {
          const rect = gutter.getBoundingClientRect();
          expect(Math.abs(rect.top + rect.height / 2 - lineCentre), id).toBeLessThan(1);
        });
      }
    }
    finally {
      css.remove();
    }
  });

  it('with `line-height: normal` it centres on the font box of the first character', async () => {
    mount([para('a', 'one line')]);
    const gutter = await hover('a');
    const text = document.createTreeWalker(wrapper('a').querySelector('[data-block-content]')!, NodeFilter.SHOW_TEXT).nextNode()!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 1);
    const line = range.getClientRects()[0]!;
    const rect = gutter.getBoundingClientRect();
    expect(Math.abs(rect.top + rect.height / 2 - (line.top + line.height / 2))).toBeLessThan(1);
  });

  it('leaving "Turn into" toward its submenu keeps it open; a submenu pick converts the block', async () => {
    const w = mount([para('a', 'first'), para('b', 'second')]);
    const gutter = await hover('a');
    const handle = gutter.querySelector<HTMLButtonElement>('[data-writekit-block-handle]')!;
    const rect = handle.getBoundingClientRect();
    pointer('pointerdown', handle, rect.left + 2, rect.top + 2);
    pointer('pointerup', globalThis, rect.left + 3, rect.top + 2);
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-menu]:not([data-submenu])')).not.toBeNull());

    const trigger = document.querySelector<HTMLElement>('[data-writekit-menu-item][data-submenu]')!;
    const tr = trigger.getBoundingClientRect();
    trigger.dispatchEvent(new PointerEvent('pointerenter', { clientX: tr.left + 8, clientY: tr.top + 8, pointerType: 'mouse' }));
    trigger.dispatchEvent(new PointerEvent('pointermove', { clientX: tr.left + 8, clientY: tr.top + 8, pointerType: 'mouse', bubbles: true }));
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-menu][data-submenu]')).not.toBeNull());

    // The pointer leaves the trigger on its way to the submenu…
    trigger.dispatchEvent(new PointerEvent('pointerleave', { clientX: tr.right + 2, clientY: tr.top + 8, pointerType: 'mouse' }));
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(document.querySelector('[data-writekit-block-menu][data-submenu]')).not.toBeNull();

    // …and lands on an item.
    const heading2 = Array.from(document.querySelectorAll<HTMLElement>('[data-writekit-block-menu][data-submenu] [data-writekit-menu-item]')).find(el => el.textContent?.trim() === 'Heading 2')!;
    const ir = heading2.getBoundingClientRect();
    heading2.dispatchEvent(new PointerEvent('pointerenter', { clientX: ir.left + 10, clientY: ir.top + 5, pointerType: 'mouse' }));
    heading2.dispatchEvent(new PointerEvent('pointermove', { clientX: ir.left + 10, clientY: ir.top + 5, pointerType: 'mouse', bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(document.querySelector('[data-writekit-block-menu]:not([data-submenu])')).not.toBeNull();
    expect(document.querySelector('[data-writekit-block-menu][data-submenu]')).not.toBeNull();

    heading2.click();
    await vi.waitFor(() => expect(w.state.doc.content[0]!.type).toBe('heading'));
    expect(w.state.doc.content[0]!.attrs).toEqual({ level: 2 });
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-menu]')).toBeNull());
  });

  it('a hover over "Turn into" opens the submenu without closing the menu', async () => {
    mount([para('a', 'first'), para('b', 'second')]);
    const gutter = await hover('a');
    const handle = gutter.querySelector<HTMLButtonElement>('[data-writekit-block-handle]')!;
    const rect = handle.getBoundingClientRect();
    pointer('pointerdown', handle, rect.left + 2, rect.top + 2);
    pointer('pointerup', globalThis, rect.left + 3, rect.top + 2);
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-menu]:not([data-submenu])')).not.toBeNull());

    const trigger = document.querySelector<HTMLElement>('[data-writekit-menu-item][data-submenu]')!;
    const tr = trigger.getBoundingClientRect();
    trigger.dispatchEvent(new PointerEvent('pointerenter', { clientX: tr.left + 8, clientY: tr.top + 8, pointerType: 'mouse' }));
    trigger.dispatchEvent(new PointerEvent('pointermove', { clientX: tr.left + 8, clientY: tr.top + 8, pointerType: 'mouse', bubbles: true }));

    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-menu][data-submenu]')).not.toBeNull());
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(document.querySelector('[data-writekit-block-menu]:not([data-submenu])')).not.toBeNull();
    expect(handle.getAttribute('aria-expanded')).toBe('true');
  });

  it('a click on the handle opens the block menu, selects the block, and its items act on it', async () => {
    const w = mount([para('a', 'first'), para('b', 'second')]);
    const gutter = await hover('a');
    const handle = gutter.querySelector<HTMLButtonElement>('[data-writekit-block-handle]')!;
    const rect = handle.getBoundingClientRect();

    pointer('pointerdown', handle, rect.left + 2, rect.top + 2);
    pointer('pointerup', globalThis, rect.left + 3, rect.top + 2);

    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-menu]')).not.toBeNull());
    // The block is selected while the menu is open, so keyboard commands target it.
    expect(w.state.selection).toEqual({ kind: 'node', ids: ['a'] });

    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-writekit-menu-item]')).map(el => el.textContent?.trim());
    expect(items).toEqual(['Turn into', 'Duplicate', 'Move up', 'Move down', 'Delete']);
    // Turn-into is a submenu (the conversion command itself is unit-tested).
    expect(document.querySelector('[data-writekit-menu-item][data-submenu]')?.textContent?.trim()).toBe('Turn into');

    const moveDown = Array.from(document.querySelectorAll<HTMLElement>('[data-writekit-menu-item]')).find(el => el.textContent?.trim() === 'Move down')!;
    moveDown.click();

    await vi.waitFor(() => expect(texts(w)).toEqual(['second', 'first']));
    await vi.waitFor(() => expect(document.querySelector('[data-writekit-block-menu]')).toBeNull());
  });

  it('dragging the handle past the threshold shows the indicator and drops the block in place', async () => {
    globalThis.scrollTo(0, 0);
    const w = mount([para('a', 'first'), para('b', 'second'), para('c', 'third')]);
    const gutter = await hover('a');
    const handle = gutter.querySelector<HTMLButtonElement>('[data-writekit-block-handle]')!;
    const start = handle.getBoundingClientRect();
    const last = wrapper('c').getBoundingClientRect();

    pointer('pointerdown', handle, start.left + 2, start.top + 2);
    pointer('pointermove', globalThis, start.left + 2, start.top + 40);
    await frame();

    expect(document.querySelector('[data-writekit-content]')!.hasAttribute('data-writekit-dragging')).toBe(true);
    expect(document.querySelector('[data-writekit-drag-ghost]')?.textContent).toBe('first');
    expect(w.state.selection).toEqual({ kind: 'node', ids: ['a'] });

    pointer('pointermove', globalThis, start.left + 2, last.bottom - 2);
    await frame();
    const indicator = document.querySelector<HTMLElement>('[data-writekit-drop-indicator]')!;
    expect(indicator).not.toBeNull();
    // Against the live rect: the editor may have auto-scrolled under the pointer.
    expect(Math.abs(indicator.getBoundingClientRect().top - wrapper('c').getBoundingClientRect().bottom)).toBeLessThan(2);

    pointer('pointerup', globalThis, start.left + 2, last.bottom - 2);
    await nextTick();
    expect(texts(w)).toEqual(['second', 'third', 'first']);
    expect(document.querySelector('[data-writekit-drop-indicator]')).toBeNull();
    expect(document.querySelector('[data-writekit-content]')!.hasAttribute('data-writekit-dragging')).toBe(false);
  });

  it('escape cancels a drag and a no-op drop changes nothing', async () => {
    const w = mount([para('a', 'first'), para('b', 'second')]);
    const gutter = await hover('a');
    const handle = gutter.querySelector<HTMLButtonElement>('[data-writekit-block-handle]')!;
    const start = handle.getBoundingClientRect();

    pointer('pointerdown', handle, start.left + 2, start.top + 2);
    pointer('pointermove', globalThis, start.left + 2, start.top + 30);
    await frame();
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.querySelector('[data-writekit-drag-ghost]')).toBeNull();
    expect(texts(w)).toEqual(['first', 'second']);

    const own = wrapper('a').getBoundingClientRect();
    pointer('pointerdown', handle, start.left + 2, start.top + 2);
    pointer('pointermove', globalThis, start.left + 2, own.top + 2);
    await frame();
    expect(document.querySelector('[data-writekit-drop-indicator]')).toBeNull();
    pointer('pointerup', globalThis, start.left + 2, own.top + 2);
    await nextTick();
    expect(texts(w)).toEqual(['first', 'second']);
  });
});
