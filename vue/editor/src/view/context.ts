import type { Ref, ShallowRef } from 'vue';
import type { Registry } from '../registry';
import { useContextFactory } from './composables';
import type { Command, Dispatch, Editor, EditorState } from '../state';
import type { EditorConfig } from './config';
import type { BlockElementRegistry, SelectionBridge } from './selection';

/** Everything child components and the input/selection plumbing need. */
export interface EditorContextValue {
  /** The headless controller. */
  editor: Editor;
  /** Reactive mirror of `editor.state`, replaced wholesale per transaction. */
  state: ShallowRef<EditorState>;
  registry: Registry;
  config: EditorConfig;
  /** The single contenteditable root element (set by EditorContent). */
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
  inject: useEditorContext,
  provide: provideEditorContext,
} = useContextFactory<EditorContextValue>('EditorContext');
