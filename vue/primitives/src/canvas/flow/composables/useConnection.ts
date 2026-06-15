import { onScopeDispose } from 'vue';
import { useEventListener } from '@robonen/vue';
import type { FlowContext } from '../context';
import type { XYPosition } from '../types';

/**
 * Drives an in-progress connection: while `connection.inProgress`, follows the
 * pointer (converting to flow space and hit-testing candidate handles via
 * `ctx.updateConnection`) and finalises on pointerup (`ctx.endConnection`).
 *
 * Listeners are bound to the window ONCE on mount (client only) and stay bound
 * for the component's life — the handlers no-op unless a connection is active.
 * This avoids the race of attaching them reactively when a drag starts.
 *
 * `updateConnection` is RAF-batched: a pointermove only stashes the latest flow
 * point, and at most one hit-test (`findClosestHandle` scans every handle) +
 * state write runs per frame — matching usePanZoom / useNodeDrag, instead of
 * 60–120×/sec. pointerup flushes the pending point synchronously first so the
 * committed connection reflects the final cursor position.
 */
export function useConnection(ctx: FlowContext): void {
  let rafId: number | null = null;
  let pending: XYPosition | null = null;

  function flush(): void {
    rafId = null;
    if (pending) {
      ctx.updateConnection(pending);
      pending = null;
    }
  }

  function onMove(event: PointerEvent): void {
    if (!ctx.connection.value.inProgress) return;
    pending = ctx.screenToFlow({ x: event.clientX, y: event.clientY });
    if (rafId === null) rafId = requestAnimationFrame(flush);
  }

  function onUp(): void {
    if (!ctx.connection.value.inProgress) return;
    // Apply the last pointer position before committing.
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    flush();
    ctx.endConnection();
  }

  // Listeners stay bound to the window for the component's life and are
  // auto-removed on scope dispose. SSR-safe: the window default no-ops without a
  // `window`. The handlers no-op unless a connection is active.
  useEventListener('pointermove', onMove);
  useEventListener('pointerup', onUp);

  // `useEventListener` owns the listeners; we still cancel any pending RAF here.
  onScopeDispose(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });
}
