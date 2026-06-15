import type { Transaction, Writekit } from '../state';
import { createTransaction } from '../state';
import { reconcileDoc } from './reconcile';
import type { CrdtProvider } from './types';
import { REMOTE_ORIGIN } from './types';

export interface CrdtBinding {
  detach: () => void;
}

/**
 * Wire a {@link CrdtProvider} to an {@link Writekit}: local transactions flow into
 * the CRDT, and remote ops are reflected back as a single history-bypassing
 * `setDoc` transaction. The provider's `onLocalOps`/`applyUpdate` are connected
 * to a transport by the caller.
 */
export function bindCrdt(writekit: Writekit, provider: CrdtProvider): CrdtBinding {
  function onTransaction(tr: Transaction): void {
    if (tr.getMeta('origin') !== REMOTE_ORIGIN)
      provider.applyLocal(tr); // never echo a remote-sourced change back into the CRDT
    provider.setLocalSelection(writekit.state.selection); // presence (local edits + remapped remote)
  }

  writekit.on('transaction', onTransaction);
  provider.setLocalSelection(writekit.state.selection);

  const offRemote = provider.onRemoteApplied(() => {
    // Reuse unchanged block identities so only the blocks a remote edit touched
    // repaint (and the local caret in untouched blocks stays put).
    const next = reconcileDoc(writekit.state.doc, provider.load());
    if (next === writekit.state.doc)
      return; // remote ops didn't change the visible document

    writekit.dispatch(createTransaction(writekit.state)
      .setDoc(next)
      .setMeta('origin', REMOTE_ORIGIN)
      .setMeta('addToHistory', false));
  });

  return {
    detach: () => {
      writekit.off('transaction', onTransaction);
      offRemote();
      provider.destroy();
    },
  };
}
