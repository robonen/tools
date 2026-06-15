import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import {
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from '..';
import type { PaginationItem } from '../utils';

function createPagination(props: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        const page = ref((props.page as number) ?? 1);

        return () =>
          h(
            PaginationRoot,
            {
              total: 100,
              pageSize: 10,
              ...props,
              page: page.value,
              'onUpdate:page': (v: number) => {
                page.value = v;
              },
            },
            {
              default: () => [
                h(PaginationList, null, {
                  default: ({ items }: { items: PaginationItem[] }) =>
                    items.map((item, i) =>
                      item.type === 'page'
                        ? h(PaginationListItem, { key: i, value: item.value })
                        : h(PaginationEllipsis, { key: `ellipsis-${i}` }),
                    ),
                }),
                h(PaginationFirst),
                h(PaginationPrev),
                h(PaginationNext),
                h(PaginationLast),
              ],
            },
          );
      },
    }),
  );
}

describe('PaginationRoot', () => {
  it('renders as <nav> by default', () => {
    const wrapper = createPagination();

    expect(wrapper.find('nav').exists()).toBe(true);

    wrapper.unmount();
  });

  it('renders as custom element via as prop', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              PaginationRoot,
              { total: 50, pageSize: 10, as: 'div' },
              { default: () => h('span', 'content') },
            );
        },
      }),
    );

    expect(wrapper.find('div').exists()).toBe(true);
    expect(wrapper.find('nav').exists()).toBe(false);

    wrapper.unmount();
  });

  it('uses defaultPage when no v-model page is provided', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              PaginationRoot,
              { total: 100, pageSize: 10, defaultPage: 5 },
              {
                default: () =>
                  h(PaginationList, null, {
                    default: ({ items }: { items: PaginationItem[] }) =>
                      items.map((item, i) =>
                        item.type === 'page'
                          ? h(PaginationListItem, { key: i, value: item.value })
                          : h(PaginationEllipsis, { key: `e-${i}` }),
                      ),
                  }),
              },
            );
        },
      }),
    );

    const selected = wrapper.find('[data-selected]');
    expect(selected.exists()).toBe(true);
    expect(selected.text()).toBe('5');

    wrapper.unmount();
  });

  it('exposes page and pageCount via scoped slot', () => {
    let slotPage = 0;
    let slotPageCount = 0;

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              PaginationRoot,
              { total: 100, pageSize: 10, page: 3 },
              {
                default: ({ page, pageCount }: { page: number; pageCount: number }) => {
                  slotPage = page;
                  slotPageCount = pageCount;
                  return h('span', `${page}/${pageCount}`);
                },
              },
            );
        },
      }),
    );

    expect(slotPage).toBe(3);
    expect(slotPageCount).toBe(10);

    wrapper.unmount();
  });
});

describe('PaginationList', () => {
  it('exposes items via scoped slot', () => {
    let capturedItems: PaginationItem[] = [];

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              PaginationRoot,
              { total: 50, pageSize: 10 },
              {
                default: () =>
                  h(PaginationList, null, {
                    default: ({ items }: { items: PaginationItem[] }) => {
                      capturedItems = items;

                      return items.map((item, i) =>
                        item.type === 'page'
                          ? h('span', { key: i }, String(item.value))
                          : h('span', { key: `e-${i}` }, '...'),
                      );
                    },
                  }),
              },
            );
        },
      }),
    );

    expect(capturedItems.length).toBeGreaterThan(0);
    expect(capturedItems.every(i => i.type === 'page' || i.type === 'ellipsis')).toBe(true);

    wrapper.unmount();
  });
});

describe('PaginationListItem', () => {
  it('renders as button by default', () => {
    const wrapper = createPagination();

    const pageButtons = wrapper.findAll('[data-type="page"]');
    expect(pageButtons.length).toBeGreaterThan(0);
    expect(pageButtons[0]!.element.tagName).toBe('BUTTON');

    wrapper.unmount();
  });

  it('marks current page with data-selected', () => {
    const wrapper = createPagination({ page: 1 });

    const selected = wrapper.find('[data-selected]');
    expect(selected.exists()).toBe(true);
    expect(selected.text()).toBe('1');

    wrapper.unmount();
  });

  it('renders page number as default slot', () => {
    const wrapper = createPagination({ page: 1 });

    const pageButtons = wrapper.findAll('[data-type="page"]');
    pageButtons.forEach((btn) => {
      expect(Number(btn.text())).toBeGreaterThan(0);
    });

    wrapper.unmount();
  });

  it('navigates on click', async () => {
    const wrapper = createPagination({ page: 1 });

    const page2 = wrapper.findAll('[data-type="page"]').find(el => el.text() === '2');
    await page2?.trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('2');

    wrapper.unmount();
  });

  it('does not navigate when disabled', async () => {
    const wrapper = createPagination({ page: 1, disabled: true });

    const page2 = wrapper.findAll('[data-type="page"]').find(el => el.text() === '2');
    await page2?.trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('1');

    wrapper.unmount();
  });
});

describe('PaginationFirst', () => {
  it('navigates to first page on click', async () => {
    const wrapper = createPagination({ page: 5 });

    await wrapper.find('[aria-label="First Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('1');

    wrapper.unmount();
  });

  it('is disabled on first page', () => {
    const wrapper = createPagination({ page: 1 });

    expect(wrapper.find('[aria-label="First Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('does not navigate when disabled', async () => {
    const wrapper = createPagination({ page: 5, disabled: true });

    await wrapper.find('[aria-label="First Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('5');

    wrapper.unmount();
  });
});

describe('PaginationPrev', () => {
  it('navigates to previous page on click', async () => {
    const wrapper = createPagination({ page: 3 });

    await wrapper.find('[aria-label="Previous Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('2');

    wrapper.unmount();
  });

  it('is disabled on first page', () => {
    const wrapper = createPagination({ page: 1 });

    expect(wrapper.find('[aria-label="Previous Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('does not navigate when disabled', async () => {
    const wrapper = createPagination({ page: 5, disabled: true });

    await wrapper.find('[aria-label="Previous Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('5');

    wrapper.unmount();
  });
});

describe('PaginationNext', () => {
  it('navigates to next page on click', async () => {
    const wrapper = createPagination({ page: 1 });

    await wrapper.find('[aria-label="Next Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('2');

    wrapper.unmount();
  });

  it('is disabled on last page', () => {
    const wrapper = createPagination({ page: 10 });

    expect(wrapper.find('[aria-label="Next Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('does not navigate when disabled', async () => {
    const wrapper = createPagination({ page: 1, disabled: true });

    await wrapper.find('[aria-label="Next Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('1');

    wrapper.unmount();
  });
});

describe('PaginationLast', () => {
  it('navigates to last page on click', async () => {
    const wrapper = createPagination({ page: 1 });

    await wrapper.find('[aria-label="Last Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('10');

    wrapper.unmount();
  });

  it('is disabled on last page', () => {
    const wrapper = createPagination({ page: 10 });

    expect(wrapper.find('[aria-label="Last Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('does not navigate when disabled', async () => {
    const wrapper = createPagination({ page: 1, disabled: true });

    await wrapper.find('[aria-label="Last Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('1');

    wrapper.unmount();
  });
});

describe('PaginationRoot empty collection (total defaults to 0)', () => {
  function createEmpty(props: Record<string, unknown> = {}) {
    return mount(
      defineComponent({
        setup() {
          return () =>
            h(
              PaginationRoot,
              { ...props },
              {
                default: () => [
                  h(PaginationList, null, {
                    default: ({ items }: { items: PaginationItem[] }) =>
                      items.map((item, i) =>
                        item.type === 'page'
                          ? h(PaginationListItem, { key: i, value: item.value })
                          : h(PaginationEllipsis, { key: `e-${i}` }),
                      ),
                  }),
                  h(PaginationFirst),
                  h(PaginationPrev),
                  h(PaginationNext),
                  h(PaginationLast),
                ],
              },
            );
        },
      }),
      { attachTo: document.body },
    );
  }

  it('treats total as optional with a default of 0', () => {
    const wrapper = createEmpty();

    expect(wrapper.find('nav').exists()).toBe(true);

    wrapper.unmount();
  });

  it('shows page 1 selected with no total', () => {
    const wrapper = createEmpty();

    const selected = wrapper.find('[data-selected]');
    expect(selected.exists()).toBe(true);
    expect(selected.text()).toBe('1');

    wrapper.unmount();
  });

  it('renders exactly one page button with no total', () => {
    const wrapper = createEmpty();

    expect(wrapper.findAll('[data-type="page"]').length).toBe(1);

    wrapper.unmount();
  });

  it('disables every control with no total', () => {
    const wrapper = createEmpty();

    expect(wrapper.find('[aria-label="First Page"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[aria-label="Previous Page"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[aria-label="Next Page"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[aria-label="Last Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('disables every control with explicit total: 0', () => {
    const wrapper = createEmpty({ total: 0 });

    expect(wrapper.find('[aria-label="First Page"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[aria-label="Last Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });
});

describe('PaginationRoot nav label', () => {
  it('labels the nav landmark by default', () => {
    const wrapper = createPagination();

    expect(wrapper.find('nav').attributes('aria-label')).toBe('pagination');

    wrapper.unmount();
  });

  it('accepts a custom label', () => {
    const wrapper = createPagination({ label: 'Search results pages' });

    expect(wrapper.find('nav').attributes('aria-label')).toBe('Search results pages');

    wrapper.unmount();
  });

  it('omits the label when label is null', () => {
    const wrapper = createPagination({ label: null });

    expect(wrapper.find('nav').attributes('aria-label')).toBeUndefined();

    wrapper.unmount();
  });
});

describe('Pagination disabled state attributes', () => {
  it('sets data-disabled on every control when disabled', () => {
    const wrapper = createPagination({ page: 5, disabled: true });

    expect(wrapper.find('[aria-label="First Page"]').attributes('data-disabled')).toBe('');
    expect(wrapper.find('[aria-label="Previous Page"]').attributes('data-disabled')).toBe('');
    expect(wrapper.find('[aria-label="Next Page"]').attributes('data-disabled')).toBe('');
    expect(wrapper.find('[aria-label="Last Page"]').attributes('data-disabled')).toBe('');
    wrapper.findAll('[data-type="page"]').forEach((btn) => {
      expect(btn.attributes('data-disabled')).toBe('');
    });

    wrapper.unmount();
  });

  it('sets data-disabled on the boundary controls even when not globally disabled', () => {
    const wrapper = createPagination({ page: 1 });

    expect(wrapper.find('[aria-label="First Page"]').attributes('data-disabled')).toBe('');
    expect(wrapper.find('[aria-label="Previous Page"]').attributes('data-disabled')).toBe('');
    expect(wrapper.find('[aria-label="Next Page"]').attributes('data-disabled')).toBeUndefined();

    wrapper.unmount();
  });

  it('omits data-disabled on enabled controls', () => {
    const wrapper = createPagination({ page: 5 });

    expect(wrapper.find('[aria-label="First Page"]').attributes('data-disabled')).toBeUndefined();
    expect(wrapper.find('[aria-label="Next Page"]').attributes('data-disabled')).toBeUndefined();

    wrapper.unmount();
  });

  it('does not set aria-disabled on native button hosts', () => {
    const wrapper = createPagination({ page: 1 });

    expect(wrapper.find('[aria-label="First Page"]').attributes('aria-disabled')).toBeUndefined();

    wrapper.unmount();
  });
});

function createLinkPagination(props: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        const page = ref((props.page as number) ?? 1);

        return () =>
          h(
            PaginationRoot,
            {
              total: 100,
              pageSize: 10,
              ...props,
              page: page.value,
              'onUpdate:page': (v: number) => {
                page.value = v;
              },
            },
            {
              default: () => [
                h(PaginationList, null, {
                  default: ({ items }: { items: PaginationItem[] }) =>
                    items.map((item, i) =>
                      item.type === 'page'
                        ? h(PaginationListItem, { key: i, value: item.value, as: 'a' })
                        : h(PaginationEllipsis, { key: `ellipsis-${i}` }),
                    ),
                }),
                h(PaginationFirst, { as: 'a' }),
                h(PaginationPrev, { as: 'a' }),
                h(PaginationNext, { as: 'a' }),
                h(PaginationLast, { as: 'a' }),
              ],
            },
          );
      },
    }),
    { attachTo: document.body },
  );
}

describe('Pagination with anchor (as="a") controls', () => {
  it('sets aria-disabled on disabled anchor controls', () => {
    const wrapper = createLinkPagination({ page: 1 });

    expect(wrapper.find('[aria-label="First Page"]').attributes('aria-disabled')).toBe('true');
    expect(wrapper.find('[aria-label="Previous Page"]').attributes('aria-disabled')).toBe('true');

    wrapper.unmount();
  });

  it('omits aria-disabled on enabled anchor controls', () => {
    const wrapper = createLinkPagination({ page: 1 });

    expect(wrapper.find('[aria-label="Next Page"]').attributes('aria-disabled')).toBeUndefined();
    expect(wrapper.find('[aria-label="Last Page"]').attributes('aria-disabled')).toBeUndefined();

    wrapper.unmount();
  });

  it('sets aria-disabled on every anchor control when globally disabled', () => {
    const wrapper = createLinkPagination({ page: 5, disabled: true });

    expect(wrapper.find('[aria-label="First Page"]').attributes('aria-disabled')).toBe('true');
    expect(wrapper.find('[aria-label="Last Page"]').attributes('aria-disabled')).toBe('true');
    wrapper.findAll('[data-type="page"]').forEach((el) => {
      expect(el.attributes('aria-disabled')).toBe('true');
    });

    wrapper.unmount();
  });

  it('does not navigate when a disabled anchor control is clicked', async () => {
    const wrapper = createLinkPagination({ page: 1 });

    await wrapper.find('[aria-label="Previous Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('1');

    wrapper.unmount();
  });

  it('does not navigate when a disabled anchor page link is clicked', async () => {
    const wrapper = createLinkPagination({ page: 2, disabled: true });

    const page1 = wrapper.findAll('[data-type="page"]').find(el => el.text() === '1');
    await page1?.trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('2');

    wrapper.unmount();
  });

  it('still navigates when an enabled anchor control is clicked', async () => {
    const wrapper = createLinkPagination({ page: 1 });

    await wrapper.find('[aria-label="Next Page"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-selected]').text()).toBe('2');

    wrapper.unmount();
  });
});

describe('PaginationEllipsis', () => {
  it('renders for large page ranges', () => {
    const wrapper = createPagination({ page: 5, total: 200, pageSize: 10 });

    expect(wrapper.find('[data-type="ellipsis"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('renders as <span> by default', () => {
    const wrapper = createPagination({ page: 5, total: 200, pageSize: 10 });

    const ellipsis = wrapper.find('[data-type="ellipsis"]');
    expect(ellipsis.element.tagName).toBe('SPAN');

    wrapper.unmount();
  });

  it('renders \u2026 as default content', () => {
    const wrapper = createPagination({ page: 5, total: 200, pageSize: 10 });

    const ellipsis = wrapper.find('[data-type="ellipsis"]');
    expect(ellipsis.text()).toBe('\u2026');

    wrapper.unmount();
  });
});
