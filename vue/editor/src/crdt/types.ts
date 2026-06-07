import type { OpId } from '@robonen/crdt';
import type { EditorDocument, Selection } from '../model';
import type { Transaction } from '../state';

/** Marks transactions that apply remote CRDT changes (so they bypass local history). */
export const REMOTE_ORIGIN = 'crdt-remote';

export interface CursorUser {
  readonly name?: string;
  readonly color?: string;
}

/** A caret point anchored to the character op id it sits after (stable under remote edits). */
export interface PointAnchor {
  readonly blockId: string;
  readonly afterCharId: OpId | null;
}

/** A selection anchored to char ids rather than offsets, for awareness. */
export type SelectionAnchor
  = | { readonly kind: 'text'; readonly anchor: PointAnchor; readonly focus: PointAnchor }
    | { readonly kind: 'node'; readonly ids: readonly string[] };

/** Ephemeral per-client presence (cursor + identity), sent over the awareness channel. */
export interface AwarenessState {
  readonly clientId: string;
  readonly user?: CursorUser;
  readonly anchor: SelectionAnchor | null;
}

/** A remote participant's cursor, resolved back into local model coordinates. */
export interface RemoteCursor {
  readonly clientId: string;
  readonly user?: CursorUser;
  readonly selection: Selection | null;
}

/**
 * A pluggable CRDT backend. The editor core stays CRDT-agnostic behind this
 * interface; {@link bindCrdt} wires it to an {@link Editor}, and any transport
 * (BroadcastChannel, WebSocket, …) is layered on via the op + awareness hooks.
 */
export interface CrdtProvider {
  readonly name: string;
  /** The current document materialized from CRDT state. */
  load: () => EditorDocument;
  /** Translate a local transaction's steps into CRDT ops and apply them. */
  applyLocal: (tr: Transaction) => void;
  /** Merge a remote update (encoded ops) into the CRDT. */
  applyUpdate: (bytes: Uint8Array, origin?: unknown) => void;
  /** Encode this replica's version vector for a sync handshake. */
  encodeStateVector: () => Uint8Array;
  /** Encode ops a remote is missing (by its state vector); omit for a full snapshot. */
  encodeDelta: (remoteStateVector?: Uint8Array) => Uint8Array;
  /** Subscribe to locally-produced op batches (to broadcast). Returns unsubscribe. */
  onLocalOps: (listener: (bytes: Uint8Array) => void) => () => void;
  /** Subscribe to "remote ops were applied" (to reflect into editor state). Returns unsubscribe. */
  onRemoteApplied: (listener: () => void) => () => void;

  // --- awareness (ephemeral; not part of the persistent document) ---
  /** Publish the local selection as presence (anchored to char ids). */
  setLocalSelection: (selection: Selection | null) => void;
  /** Subscribe to locally-produced awareness frames (to broadcast). Returns unsubscribe. */
  onLocalAwareness: (listener: (bytes: Uint8Array) => void) => () => void;
  /** Merge a remote awareness frame. */
  applyAwareness: (bytes: Uint8Array) => void;
  /** Subscribe to the resolved set of remote cursors. Returns unsubscribe. */
  onAwareness: (listener: (cursors: RemoteCursor[]) => void) => () => void;

  /**
   * Compact tombstones and removed blocks covered by `stableStateVector` (or this
   * replica's version when omitted). Safe only at quiescence — all peers fully
   * synced, nothing in flight. Returns how much was dropped.
   */
  gc: (stableStateVector?: Uint8Array) => { blocks: number; chars: number };

  destroy: () => void;
}
