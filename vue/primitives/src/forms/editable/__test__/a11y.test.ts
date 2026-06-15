import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import {
  EditableArea,
  EditableCancelTrigger,
  EditableEditTrigger,
  EditableInput,
  EditablePreview,
  EditableRoot,
  EditableSubmitTrigger,
} from '../index';

async function checkA11y(element: Element) {
  const results = await axe.run(element);
  return results.violations;
}

function createEditable(rootProps: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        return () => h(
          EditableRoot,
          rootProps,
          {
            default: () => h(EditableArea, null, {
              default: () => [
                h(EditablePreview),
                h(EditableInput),
                h(EditableEditTrigger),
                h(EditableSubmitTrigger),
                h(EditableCancelTrigger),
              ],
            }),
          },
        );
      },
    }),
    { attachTo: document.body },
  );
}

describe('Editable a11y', () => {
  it('has no axe violations in preview mode', async () => {
    const w = createEditable({ defaultValue: 'Hello' });
    const violations = await checkA11y(w.element);
    expect(violations).toEqual([]);
    w.unmount();
  });

  it('has no axe violations in edit mode', async () => {
    const w = createEditable({ defaultValue: 'Hello', startWithEditMode: true });
    await nextTick();
    const violations = await checkA11y(w.element);
    expect(violations).toEqual([]);
    w.unmount();
  });

  it('has no axe violations when disabled', async () => {
    const w = createEditable({ defaultValue: 'Hello', disabled: true });
    const violations = await checkA11y(w.element);
    expect(violations).toEqual([]);
    w.unmount();
  });

  it('has no axe violations when readonly', async () => {
    const w = createEditable({ defaultValue: 'Hello', readonly: true, startWithEditMode: true });
    await nextTick();
    const violations = await checkA11y(w.element);
    expect(violations).toEqual([]);
    w.unmount();
  });

  it('keeps the input labelled', () => {
    const w = createEditable({ defaultValue: 'Hello' });
    expect(w.find('input').attributes('aria-label')).toBe('editable input');
    w.unmount();
  });
});
