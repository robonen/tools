import type { Editor, Transaction } from '../state';
import { createTransaction } from '../state';
import { reconcileDoc } from './reconcile';
import type { CrdtProvider } from './types';
import { REMOTE_ORIGIN } from './types';

export interface CrdtBinding {
  detach: () => void;
}

/**
 * Wire a {@link CrdtProvider} to an {@link Editor}: local transactions flow into
 * the CRDT, and remote ops are reflected back as a single history-bypassing
 * `setDoc` transaction. The provider's `onLocalOps`/`applyUpdate` are connected
 * to a transport by the caller.
 */
export function bindCrdt(editor: Editor, provider: CrdtProvider): CrdtBinding {
  function onTransaction(tr: Transaction): void {
    if (tr.getMeta('origin') !== REMOTE_ORIGIN)
      provider.applyLocal(tr); // never echo a remote-sourced change back into the CRDT
    provider.setLocalSelection(editor.state.selection); // presence (local edits + remapped remote)
  }

  editor.on('transaction', onTransaction);
  provider.setLocalSelection(editor.state.selection);

  const offRemote = provider.onRemoteApplied(() => {
    // Reuse unchanged block identities so only the blocks a remote edit touched
    // repaint (and the local caret in untouched blocks stays put).
    const next = reconcileDoc(editor.state.doc, provider.load());
    if (next === editor.state.doc)
      return; // remote ops didn't change the visible document

    editor.dispatch(createTransaction(editor.state)
      .setDoc(next)
      .setMeta('origin', REMOTE_ORIGIN)
      .setMeta('addToHistory', false));
  });

  return {
    detach: () => {
      editor.off('transaction', onTransaction);
      offRemote();
      provider.destroy();
    },
  };
}
