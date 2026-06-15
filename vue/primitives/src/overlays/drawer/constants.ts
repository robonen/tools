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
