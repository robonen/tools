import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import {
  PaginationRoot,
  PaginationList,
  PaginationListItem,
  PaginationFirst,
  PaginationPrev,
  PaginationNext,
  PaginationLast,
  PaginationEllipsis,
} from '..';
import type { PaginationItem } from '../utils';

async function checkA11y(element: Element) {
  const results = await axe.run(element);

  return results.violations;
}

function createPagination(props: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        const page = ref((props.page as number) ?? 1);

        return () =>
          h(
            PaginationRoot,
            {
              'total': 100,
              'pageSize': 10,
              ...props,
              'page': page.value,
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
    { attachTo: document.body },
  );
}

describe('PaginationListItem a11y', () => {
  it('has data-type="page"', () => {
    const wrapper = createPagination();

    expect(wrapper.findAll('[data-type="page"]').length).toBeGreaterThan(0);

    wrapper.unmount();
  });

  it('has aria-label with page number', () => {
    const wrapper = createPagination();

    const pageButton = wrapper.find('[data-type="page"]');
    expect(pageButton.attributes('aria-label')).toMatch(/^Page \d+$/);

    wrapper.unmount();
  });

  it('has aria-current="page" only on selected page', () => {
    const wrapper = createPagination({ page: 1 });

    const selected = wrapper.find('[aria-current="page"]');
    expect(selected.exists()).toBe(true);
    expect(selected.text()).toBe('1');

    const nonSelected = wrapper.findAll('[data-type="page"]').filter(el => el.text() !== '1');
    nonSelected.forEach((el) => {
      expect(el.attributes('aria-current')).toBeUndefined();
    });

    wrapper.unmount();
  });

  it('has type="button"', () => {
    const wrapper = createPagination();

    wrapper.findAll('[data-type="page"]').forEach((btn) => {
      expect(btn.attributes('type')).toBe('button');
    });

    wrapper.unmount();
  });

  it('is disabled when context disabled', () => {
    const wrapper = createPagination({ disabled: true });

    wrapper.findAll('[data-type="page"]').forEach((btn) => {
      expect(btn.attributes('disabled')).toBeDefined();
    });

    wrapper.unmount();
  });

  it('has no axe violations when selected', async () => {
    const wrapper = createPagination({ page: 1 });
    const violations = await checkA11y(wrapper.find('[data-selected="true"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when not selected', async () => {
    const wrapper = createPagination({ page: 1 });
    const nonSelected = wrapper.findAll('[data-type="page"]').find(el => el.text() !== '1');
    const violations = await checkA11y(nonSelected!.element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when disabled', async () => {
    const wrapper = createPagination({ page: 1, disabled: true });
    const violations = await checkA11y(wrapper.find('[data-type="page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});

describe('PaginationFirst a11y', () => {
  it('has aria-label="First Page"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="First Page"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('has type="button"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="First Page"]').attributes('type')).toBe('button');

    wrapper.unmount();
  });

  it('renders default slot text', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="First Page"]').text()).toBe('First page');

    wrapper.unmount();
  });

  it('is disabled when context disabled', () => {
    const wrapper = createPagination({ page: 5, disabled: true });

    expect(wrapper.find('[aria-label="First Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('has no axe violations when enabled', async () => {
    const wrapper = createPagination({ page: 5 });
    const violations = await checkA11y(wrapper.find('[aria-label="First Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when disabled', async () => {
    const wrapper = createPagination({ page: 1 });
    const violations = await checkA11y(wrapper.find('[aria-label="First Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});

describe('PaginationPrev a11y', () => {
  it('has aria-label="Previous Page"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Previous Page"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('has type="button"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Previous Page"]').attributes('type')).toBe('button');

    wrapper.unmount();
  });

  it('renders default slot text', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Previous Page"]').text()).toBe('Prev page');

    wrapper.unmount();
  });

  it('is disabled when context disabled', () => {
    const wrapper = createPagination({ page: 5, disabled: true });

    expect(wrapper.find('[aria-label="Previous Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('has no axe violations when enabled', async () => {
    const wrapper = createPagination({ page: 5 });
    const violations = await checkA11y(wrapper.find('[aria-label="Previous Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when disabled', async () => {
    const wrapper = createPagination({ page: 1 });
    const violations = await checkA11y(wrapper.find('[aria-label="Previous Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});

describe('PaginationNext a11y', () => {
  it('has aria-label="Next Page"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Next Page"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('has type="button"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Next Page"]').attributes('type')).toBe('button');

    wrapper.unmount();
  });

  it('renders default slot text', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Next Page"]').text()).toBe('Next page');

    wrapper.unmount();
  });

  it('is disabled when context disabled', () => {
    const wrapper = createPagination({ page: 1, disabled: true });

    expect(wrapper.find('[aria-label="Next Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('has no axe violations when enabled', async () => {
    const wrapper = createPagination({ page: 1 });
    const violations = await checkA11y(wrapper.find('[aria-label="Next Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when disabled', async () => {
    const wrapper = createPagination({ page: 10 });
    const violations = await checkA11y(wrapper.find('[aria-label="Next Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});

describe('PaginationLast a11y', () => {
  it('has aria-label="Last Page"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Last Page"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('has type="button"', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Last Page"]').attributes('type')).toBe('button');

    wrapper.unmount();
  });

  it('renders default slot text', () => {
    const wrapper = createPagination();

    expect(wrapper.find('[aria-label="Last Page"]').text()).toBe('Last page');

    wrapper.unmount();
  });

  it('is disabled when context disabled', () => {
    const wrapper = createPagination({ page: 1, disabled: true });

    expect(wrapper.find('[aria-label="Last Page"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('has no axe violations when enabled', async () => {
    const wrapper = createPagination({ page: 1 });
    const violations = await checkA11y(wrapper.find('[aria-label="Last Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when disabled', async () => {
    const wrapper = createPagination({ page: 10 });
    const violations = await checkA11y(wrapper.find('[aria-label="Last Page"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});

describe('PaginationEllipsis a11y', () => {
  it('is non-interactive (no button role)', () => {
    const wrapper = createPagination({ page: 5, total: 200, pageSize: 10 });

    const ellipsis = wrapper.find('[data-type="ellipsis"]');
    expect(ellipsis.attributes('type')).toBeUndefined();
    expect(ellipsis.attributes('role')).toBeUndefined();

    wrapper.unmount();
  });

  it('has no axe violations', async () => {
    const wrapper = createPagination({ page: 5, total: 200, pageSize: 10 });
    const violations = await checkA11y(wrapper.find('[data-type="ellipsis"]').element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});

describe('Pagination composed a11y', () => {
  it('has no axe violations on first page', async () => {
    const wrapper = createPagination({ page: 1 });
    const violations = await checkA11y(wrapper.element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations on middle page', async () => {
    const wrapper = createPagination({ page: 5 });
    const violations = await checkA11y(wrapper.element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations on last page', async () => {
    const wrapper = createPagination({ page: 10 });
    const violations = await checkA11y(wrapper.element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations with many pages', async () => {
    const wrapper = createPagination({ page: 10, total: 500, pageSize: 10 });
    const violations = await checkA11y(wrapper.element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when fully disabled', async () => {
    const wrapper = createPagination({ page: 5, disabled: true });
    const violations = await checkA11y(wrapper.element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations with showEdges', async () => {
    const wrapper = createPagination({ page: 5, total: 200, pageSize: 10, showEdges: true });
    const violations = await checkA11y(wrapper.element);

    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});
