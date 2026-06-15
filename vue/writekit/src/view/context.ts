import type { Ref, ShallowRef } from 'vue';
import type { Registry } from '../registry';
import { useContextFactory } from './composables';
import type { Command, Dispatch, Writekit, WritekitState } from '../state';
import type { WritekitConfig } from './config';
import type { BlockElementRegistry, SelectionBridge } from './selection';

/** Everything child components and the input/selection plumbing need. */
export interface WritekitContextValue {
  /** The headless controller. */
  writekit: Writekit;
  /** Reactive mirror of `writekit.state`, replaced wholesale per transaction. */
  state: ShallowRef<WritekitState>;
  registry: Registry;
  config: WritekitConfig;
  /** The single contenteditable root element (set by WritekitContent). */
  contentRoot: ShallowRef<HTMLElement | null>;
  /** Block id → its (non-editable) block-content element. */
  blockElements: BlockElementRegistry;
  /** DOM ↔ model selection mapping. */
  selection: SelectionBridge;
  /** True while an IME composition is in flight (suppresses model sync). */
  composing: Ref<boolean>;
  /** Origin (`meta('origin')`) of the most recent transaction, if any. */
  lastOrigin: Ref<string | undefined>;
  dispatch: Dispatch;
  /** Run a command against the current state. */
  exec: (command: Command) => boolean;
  /** Move real DOM focus + caret into a block. */
  focusBlock: (blockId: string, offset: number | 'start' | 'end') => void;
}

export const {
  inject: useWritekitContext,
  provide: provideWritekitContext,
} = useContextFactory<WritekitContextValue>('WritekitContext');
