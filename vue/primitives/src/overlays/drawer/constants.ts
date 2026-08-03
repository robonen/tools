/** Open/close animation timing, shared by the CSS keyframes and the JS transitions. */
export const TRANSITIONS = {
  DURATION: 0.5,
  EASE: [0.32, 0.72, 0, 1],
} as const;

/** Drag speed (px/ms) above which a flick closes the drawer regardless of distance. */
export const VELOCITY_THRESHOLD = 0.4;

/** Default fraction of the drawer that must be swiped away before it closes. */
export const CLOSE_THRESHOLD = 0.25;

/** How long (ms) dragging stays disabled after scrolling content inside the drawer. */
export const SCROLL_LOCK_TIMEOUT = 100;

/** Corner radius (px) applied to the scaled background wrapper while open. */
export const BORDER_RADIUS = 8;

/** Pixels a parent drawer is displaced when a nested drawer opens. */
export const NESTED_DISPLACEMENT = 16;

/** Top inset (px) used when scaling the background, mimicking a stacked-card look. */
export const WINDOW_TOP_OFFSET = 26;

/** Class applied to the drawer element while a drag is in progress. */
export const DRAG_CLASS = 'drawer-dragging';

/** Smallest dt (ms) a velocity sample may span — clamps out same-frame event spikes. */
export const MIN_VELOCITY_DT = 16;

/** A velocity sample older than this (ms) at release means the pointer stopped — velocity is 0. */
export const MAX_VELOCITY_AGE = 80;

/** Dismiss displacement (px) a gesture must reach before the reverse-cancel detector arms. */
export const REVERSE_CANCEL_ARM_DISTANCE = 20;

/** Pulling back this many px from the gesture's furthest point cancels the dismiss. */
export const REVERSE_CANCEL_THRESHOLD = 10;

/** Pointer movement (px) needed before the gesture locks onto an axis. */
export const AXIS_LOCK_DISTANCE = 2;

/** Snap release: velocity (px/ms) below which the fling projection is skipped. */
export const SNAP_VELOCITY_THRESHOLD = 0.5;

/** Snap release: ms worth of travel a fling projects the release target ahead. */
export const SNAP_VELOCITY_MULTIPLIER = 300;

/** Snap release: velocity clamp (px/ms) for the fling projection. */
export const MAX_SNAP_VELOCITY = 4;

/** Release velocity (px/ms) below which the settle keeps the default duration. */
export const SETTLE_VELOCITY_THRESHOLD = 0.2;

/** Fastest settle transition (ms) a hard flick can produce. */
export const MIN_SETTLE_DURATION = 80;
