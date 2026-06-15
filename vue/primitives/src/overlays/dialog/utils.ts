import type { Ref } from 'vue';
import { onMounted } from 'vue';

interface AccessibilityWarningOptions {
  /** Id the Title registered into the Root context, or `undefined` when absent. */
  titleId: Ref<string | undefined>;
  /** Id the Description registered into the Root context, or `undefined` when absent. */
  descriptionId: Ref<string | undefined>;
  /** Resolved content element — read its `aria-describedby` to validate the link. */
  contentElement: Ref<HTMLElement | undefined>;
}

const TITLE_MESSAGE
  = 'DialogContent requires a DialogTitle so screen readers can announce the dialog. '
    + 'If the title should not be visible, keep it in the DOM and hide it visually instead of omitting it.';

const DESCRIPTION_MESSAGE
  = 'DialogContent references an aria-describedby id that has no matching element. '
    + 'Render a DialogDescription, or drop the description wiring entirely.';

/**
 * Dev-only accessibility audit for a mounted DialogContent. Warns once on mount
 * when no DialogTitle is registered (the dialog would ship unlabeled) and when
 * the content advertises an `aria-describedby` whose target element is missing.
 * Compiled out of production builds via the `__DEV__` global.
 */
export function useDialogAccessibilityWarning({
  titleId,
  descriptionId,
  contentElement,
}: AccessibilityWarningOptions): void {
  if (!__DEV__) return;

  onMounted(() => {
    if (!titleId.value || !document.getElementById(titleId.value))
      console.warn(TITLE_MESSAGE);

    const describedBy = contentElement.value?.getAttribute('aria-describedby');
    if (descriptionId.value && describedBy && !document.getElementById(descriptionId.value))
      console.warn(DESCRIPTION_MESSAGE);
  });
}
