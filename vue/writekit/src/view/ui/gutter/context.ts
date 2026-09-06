import type { ComputedRef } from 'vue';
import type { Node } from '../../../model';
import type { UseBlockDragReturn } from '../../dnd';
import { useContextFactory } from '../../composables';

/** What the gutter's children (handle, inserter, anything custom) work against. */
export interface BlockGutterContextValue {
  /** The block the gutter currently sits beside. */
  readonly block: ComputedRef<Node | null>;
  readonly drag: UseBlockDragReturn;
  /** Keep the gutter in place while a child's popup (the handle menu) is open. */
  readonly pin: (pinned: boolean) => void;
  readonly hide: () => void;
}

export const {
  inject: useBlockGutterContext,
  provide: provideBlockGutterContext,
} = useContextFactory<BlockGutterContextValue>('WritekitBlockGutter');
