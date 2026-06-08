/**
 * Custom DOM event dispatched on `document` whenever any tooltip opens.
 * Other open tooltips listen for it and close themselves so that only one
 * tooltip is visible at a time without coupling them via a global registry.
 */
export const TOOLTIP_OPEN_EVENT = 'tooltip.open';

export type TooltipState = 'closed' | 'delayed-open' | 'instant-open';
