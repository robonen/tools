import { Replica, VersionVector, createSiteId, decodeJson, decodeOps, decodeStateVector, encodeJson, encodeOps, encodeStateVector } from '@robonen/crdt';
import { PubSub } from '@robonen/stdlib';
import type { Selection, WritekitDocument } from '../../model';
import type { Schema } from '../../schema';
import type { Transaction } from '../../state';
import type { AwarenessState, CrdtProvider, CursorUser, RemoteCursor } from '../types';
import type { WritekitOp } from './document-crdt';
import { DocumentCrdt } from './document-crdt';

export interface NativeProviderOptions {
  /** Schema (block/mark specs) — needed to know which blocks hold text. */
  schema: Schema;
  /** Seed the CRDT from this document (use for the FIRST replica only; joiners sync instead). */
  doc?: WritekitDocument;
  /** Replica/site id (defaults to a random one). */
  site?: string;
  /** Identity broadcast with this replica's cursor. */
  user?: CursorUser;
}

/**
 * Provider event map. A mapped type (not the `interface`) satisfies PubSub's
 * `Record<string, …>` constraint — same trick as the writekit's event bus.
 */
interface ProviderEvents {
  /** A batch of locally-produced ops, encoded for broadcast. */
  localOps: (bytes: Uint8Array) => void;
  /** Remote ops were applied to the document. */
  remoteApplied: () => void;
  /** This replica's presence/awareness state, encoded for broadcast. */
  localAwareness: (bytes: Uint8Array) => void;
  /** Resolved remote cursors changed. */
  awareness: (cursors: RemoteCursor[]) => void;
}

/**
 * The built-in CRDT provider backed by `@robonen/crdt`: a fractional-ordered set
 * of blocks, each a text RGA + mark store. Writekit steps map to CRDT ops via
 * {@link DocumentCrdt}; ops sync as op batches over any transport.
 */
export function createNativeProvider(options: NativeProviderOptions): CrdtProvider {
  const document = new DocumentCrdt(options.schema);
  const site = options.site ?? createSiteId();
  const replica = new Replica<WritekitOp>({ integrate: op => document.applyOp(op) }, site);
  document.setIdFactory(() => replica.nextId());

  const bus = new PubSub<{ [K in keyof ProviderEvents]: ProviderEvents[K] }>();
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
      const ops: WritekitOp[] = [];
      for (const step of tr.steps) {
        for (const op of document.translateStep(step)) {
          replica.commitLocal(op);
          ops.push(op);
        }
      }
      if (ops.length > 0) {
        bus.emit('localOps', encodeOps(ops));
        // Local edits shifted the document — re-resolve remote cursor positions.
        if (remoteStates.size > 0)
          bus.emit('awareness', resolveCursors());
      }
    },

    applyUpdate: (bytes) => {
      const applied = replica.receive(decodeOps<WritekitOp>(bytes));
      if (applied.length > 0) {
        bus.emit('remoteApplied');
        // Remote ops shifted the document — re-resolve cursors against new positions.
        if (remoteStates.size > 0)
          bus.emit('awareness', resolveCursors());
      }
    },

    encodeStateVector: () => encodeStateVector(replica.version),
    encodeDelta: remote => encodeOps(replica.delta(remote ? decodeStateVector(remote) : new VersionVector())),

    onLocalOps: (listener) => {
      bus.on('localOps', listener);
      return () => bus.off('localOps', listener);
    },
    onRemoteApplied: (listener) => {
      bus.on('remoteApplied', listener);
      return () => bus.off('remoteApplied', listener);
    },

    setLocalSelection: (selection: Selection | null) => {
      const state: AwarenessState = { clientId: site, user: options.user, anchor: selection ? document.toAnchor(selection) : null };
      bus.emit('localAwareness', encodeJson(state));
    },

    onLocalAwareness: (listener) => {
      bus.on('localAwareness', listener);
      return () => bus.off('localAwareness', listener);
    },

    applyAwareness: (bytes) => {
      const state = decodeJson<AwarenessState>(bytes);
      remoteStates.set(state.clientId, state);
      bus.emit('awareness', resolveCursors());
    },

    onAwareness: (listener) => {
      bus.on('awareness', listener);
      return () => bus.off('awareness', listener);
    },

    gc: stable => document.gc(stable ? decodeStateVector(stable) : replica.version),

    destroy: () => {
      bus.clear('localOps');
      bus.clear('remoteApplied');
      bus.clear('localAwareness');
      bus.clear('awareness');
      remoteStates.clear();
    },
  };
}
