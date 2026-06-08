import { Replica, VersionVector, createSiteId, decodeJson, decodeOps, decodeStateVector, encodeJson, encodeOps, encodeStateVector } from '@robonen/crdt';
import type { EditorDocument, Selection } from '../../model';
import type { Schema } from '../../schema';
import type { Transaction } from '../../state';
import type { AwarenessState, CrdtProvider, CursorUser, RemoteCursor } from '../types';
import type { EditorOp } from './document-crdt';
import { DocumentCrdt } from './document-crdt';

export interface NativeProviderOptions {
  /** Schema (block/mark specs) — needed to know which blocks hold text. */
  schema: Schema;
  /** Seed the CRDT from this document (use for the FIRST replica only; joiners sync instead). */
  doc?: EditorDocument;
  /** Replica/site id (defaults to a random one). */
  site?: string;
  /** Identity broadcast with this replica's cursor. */
  user?: CursorUser;
}

/**
 * The built-in CRDT provider backed by `@robonen/crdt`: a fractional-ordered set
 * of blocks, each a text RGA + mark store. Editor steps map to CRDT ops via
 * {@link DocumentCrdt}; ops sync as op batches over any transport.
 */
export function createNativeProvider(options: NativeProviderOptions): CrdtProvider {
  const document = new DocumentCrdt(options.schema);
  const site = options.site ?? createSiteId();
  const replica = new Replica<EditorOp>({ integrate: op => document.applyOp(op) }, site);
  document.setIdFactory(() => replica.nextId());

  const localListeners = new Set<(bytes: Uint8Array) => void>();
  const remoteListeners = new Set<() => void>();
  const localAwarenessListeners = new Set<(bytes: Uint8Array) => void>();
  const awarenessListeners = new Set<(cursors: RemoteCursor[]) => void>();
  const remoteStates = new Map<string, AwarenessState>();

  if (options.doc) {
    for (const op of document.seedFromDocument(options.doc))
      replica.commitLocal(op);
  }

  function resolveCursors(): RemoteCursor[] {
    const cursors: RemoteCursor[] = [];
    for (const state of remoteStates.values()) {
      if (state.clientId === site)
        continue;
      cursors.push({ clientId: state.clientId, user: state.user, selection: document.resolveAnchor(state.anchor) });
    }
    return cursors;
  }

  return {
    name: 'native',

    load: () => document.toDocument(),

    applyLocal: (tr: Transaction) => {
      const ops: EditorOp[] = [];
      for (const step of tr.steps) {
        for (const op of document.translateStep(step)) {
          replica.commitLocal(op);
          ops.push(op);
        }
      }
      if (ops.length > 0) {
        const bytes = encodeOps(ops);
        for (const listener of localListeners)
          listener(bytes);
        // Local edits shifted the document — re-resolve remote cursor positions.
        if (remoteStates.size > 0) {
          const cursors = resolveCursors();
          for (const listener of awarenessListeners)
            listener(cursors);
        }
      }
    },

    applyUpdate: (bytes) => {
      const applied = replica.receive(decodeOps<EditorOp>(bytes));
      if (applied.length > 0) {
        for (const listener of remoteListeners)
          listener();
        // Remote ops shifted the document — re-resolve cursors against new positions.
        if (remoteStates.size > 0) {
          const cursors = resolveCursors();
          for (const listener of awarenessListeners)
            listener(cursors);
        }
      }
    },

    encodeStateVector: () => encodeStateVector(replica.version),
    encodeDelta: remote => encodeOps(replica.delta(remote ? decodeStateVector(remote) : new VersionVector())),

    onLocalOps: (listener) => {
      localListeners.add(listener);
      return () => localListeners.delete(listener);
    },
    onRemoteApplied: (listener) => {
      remoteListeners.add(listener);
      return () => remoteListeners.delete(listener);
    },

    setLocalSelection: (selection: Selection | null) => {
      const state: AwarenessState = { clientId: site, user: options.user, anchor: selection ? document.toAnchor(selection) : null };
      const bytes = encodeJson(state);
      for (const listener of localAwarenessListeners)
        listener(bytes);
    },

    onLocalAwareness: (listener) => {
      localAwarenessListeners.add(listener);
      return () => localAwarenessListeners.delete(listener);
    },

    applyAwareness: (bytes) => {
      const state = decodeJson<AwarenessState>(bytes);
      remoteStates.set(state.clientId, state);
      const cursors = resolveCursors();
      for (const listener of awarenessListeners)
        listener(cursors);
    },

    onAwareness: (listener) => {
      awarenessListeners.add(listener);
      return () => awarenessListeners.delete(listener);
    },

    gc: stable => document.gc(stable ? decodeStateVector(stable) : replica.version),

    destroy: () => {
      localListeners.clear();
      remoteListeners.clear();
      localAwarenessListeners.clear();
      awarenessListeners.clear();
      remoteStates.clear();
    },
  };
}
