import { clamp } from '@robonen/stdlib';
import type { DrawerDirection } from './types';
import {
  MAX_VELOCITY_AGE,
  MIN_SETTLE_DURATION,
  MIN_VELOCITY_DT,
  REVERSE_CANCEL_ARM_DISTANCE,
  REVERSE_CANCEL_THRESHOLD,
  SETTLE_VELOCITY_THRESHOLD,
  TRANSITIONS,
} from './constants';

/** The client-coordinate axis a drawer drags along. */
export type GestureAxis = 'x' | 'y';

export interface VelocityTracker {
  /** Record a pointer sample (client coordinate along the axis + event timeStamp). */
  add: (position: number, time: number) => void;
  /**
   * Instantaneous velocity (px/ms) over the two newest samples. Returns 0 when
   * the last sample is older than {@link MAX_VELOCITY_AGE} — the pointer paused
   * before release, so no fling momentum should apply.
   */
  read: (now: number) => number;
  reset: () => void;
}

/**
 * Instantaneous release velocity from the trailing pair of pointer samples,
 * instead of averaging the whole gesture: "slow pull, then flick" reads as a
 * flick, and "fast start, stop, release" reads as a stop.
 */
export function createVelocityTracker(): VelocityTracker {
  let lastPosition = 0;
  let lastTime = Number.NaN;
  let velocity = 0;

  return {
    add(position, time) {
      if (!Number.isNaN(lastTime) && time > lastTime) {
        // Clamp dt so same-frame event bursts don't produce huge spikes.
        const dt = Math.max(time - lastTime, MIN_VELOCITY_DT);
        velocity = (position - lastPosition) / dt;
      }

      lastPosition = position;
      lastTime = time;
    },
    read(now) {
      if (Number.isNaN(lastTime) || now - lastTime > MAX_VELOCITY_AGE)
        return 0;

      return velocity;
    },
    reset() {
      lastPosition = 0;
      lastTime = Number.NaN;
      velocity = 0;
    },
  };
}

export interface ReverseCancelTracker {
  /** Feed the current dismiss-positive displacement (px). */
  update: (displacement: number) => void;
  /** Whether the gesture pulled back far enough to cancel the dismiss. */
  readonly cancelled: boolean;
  reset: () => void;
}

/**
 * Detects the "changed my mind" gesture: once the drawer has been dragged at
 * least {@link REVERSE_CANCEL_ARM_DISTANCE} toward dismiss, pulling back by
 * {@link REVERSE_CANCEL_THRESHOLD} from the furthest point cancels the dismiss
 * even if the release still sits past the close threshold. Dragging past the
 * previous furthest point re-arms the dismiss (renewed intent).
 */
export function createReverseCancelTracker(): ReverseCancelTracker {
  let max = 0;
  let cancelled = false;

  return {
    update(displacement) {
      if (displacement >= max) {
        max = displacement;
        cancelled = false;
        return;
      }

      if (max > REVERSE_CANCEL_ARM_DISTANCE && max - displacement > REVERSE_CANCEL_THRESHOLD)
        cancelled = true;
    },
    get cancelled() {
      return cancelled;
    },
    reset() {
      max = 0;
      cancelled = false;
    },
  };
}

/**
 * Settle duration (in seconds) scaled by the release velocity: a hard flick
 * over a short remaining distance settles in as little as
 * {@link MIN_SETTLE_DURATION}ms, while a gentle release keeps the default
 * {@link TRANSITIONS} duration. Never returns a duration longer than the default.
 */
export function computeSettleDuration(remainingDistance: number, velocity: number): number {
  const fallback = TRANSITIONS.DURATION;

  if (!Number.isFinite(remainingDistance) || remainingDistance <= 0)
    return fallback;

  const speed = Math.abs(velocity);

  if (!Number.isFinite(speed) || speed < SETTLE_VELOCITY_THRESHOLD)
    return fallback;

  return clamp(remainingDistance / speed, MIN_SETTLE_DURATION, fallback * 1000) / 1000;
}

/**
 * The nearest ancestor (from `start` up to and including `boundary`) that can
 * scroll along `axis`. The `getComputedStyle` read runs at most once per
 * candidate and only at gesture start — never per pointer move.
 */
export function findScrollableAncestor(
  start: Element | null,
  boundary: HTMLElement,
  axis: GestureAxis,
): HTMLElement | null {
  let element: Element | null = start;

  while (element) {
    if (element instanceof HTMLElement) {
      const canScroll = axis === 'y'
        ? element.scrollHeight > element.clientHeight
        : element.scrollWidth > element.clientWidth;

      if (canScroll) {
        const overflow = getComputedStyle(element)[axis === 'y' ? 'overflowY' : 'overflowX'];

        if (overflow === 'auto' || overflow === 'scroll')
          return element;
      }
    }

    if (element === boundary)
      break;

    element = element.parentElement;
  }

  return null;
}

/**
 * Whether a scroll container sits at the edge the dismiss gesture pulls away
 * from — only then may a drag that starts inside it become a drawer gesture;
 * otherwise the user is scrolling, not dismissing:
 * - `bottom` drawer dismisses downward → the scroller must be at its top;
 * - `top` drawer dismisses upward → at its bottom;
 * - `right` drawer dismisses rightward → at its left edge;
 * - `left` drawer dismisses leftward → at its right edge.
 */
export function isAtScrollEdge(scroller: HTMLElement, direction: DrawerDirection): boolean {
  switch (direction) {
    case 'bottom':
      return scroller.scrollTop <= 0;
    case 'top':
      return scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight;
    case 'right':
      return scroller.scrollLeft <= 0;
    case 'left':
      return scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth;
  }
}
