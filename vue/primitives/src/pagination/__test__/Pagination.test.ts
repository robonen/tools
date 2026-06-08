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
