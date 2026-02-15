import { onBeforeUpdate, onMounted, onUpdated, readonly, shallowRef } from 'vue';
import type { DeepReadonly, ShallowRef } from 'vue';
import type { MaybeElement } from '../unrefElement';
import { unrefElement } from '../unrefElement';

export interface UseTemplateRefsListReturn<El extends Element> {
    /** Reactive readonly array of collected template refs */
    refs: DeepReadonly<ShallowRef<El[]>>;
    /** Ref setter function — bind via `:ref="set"` in templates */
    set: (el: MaybeElement) => void;
}

/**
 * @name useTemplateRefsList
 * @category Component
 * @description Collects a dynamic list of template refs for use with `v-for`.
 * Automatically clears the list before each component update and repopulates it
 * with fresh element references. Handles both plain DOM elements and Vue component
 * instances (unwraps `$el`).
 *
 * Uses a non-reactive buffer internally to collect refs during the render cycle,
 * then flushes to a `shallowRef` in `onMounted`/`onUpdated` to avoid triggering
 * recursive update loops.
 *
 * @returns {UseTemplateRefsListReturn<El>} An object with a reactive `refs` array and a `set` function
 *
 * @example
 * const { refs, set } = useTemplateRefsList<HTMLDivElement>();
 * // Template: <div v-for="item in items" :key="item.id" :ref="set" />
 * // refs.value contains all rendered div elements
 *
 * @since 0.0.14
 */
export function useTemplateRefsList<El extends Element = Element>(): UseTemplateRefsListReturn<El> {
    const refs = shallowRef<El[]>([]);
    let buffer: El[] = [];

    const set = (el: MaybeElement) => {
        const plain = unrefElement(el);

        if (plain)
            buffer.push(plain as unknown as El);
    };

    const flush = () => {
        buffer.sort(documentPositionComparator);
        refs.value = buffer;
    };

    onBeforeUpdate(() => {
        buffer = [];
    });

    onMounted(flush);
    onUpdated(flush);

    return {
        refs: readonly(refs) as DeepReadonly<ShallowRef<El[]>>,
        set,
    };
}

function documentPositionComparator(a: Element, b: Element): number {
    if (a === b) return 0;

    const position = a.compareDocumentPosition(b);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;

    return 0;
}
