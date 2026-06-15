/**
 * Critical drawer styles — the slide keyframes plus the data-attribute-driven
 * transforms that the drag engine toggles. Injected once at runtime via
 * `useStyleTag` from DrawerRoot, so the headless primitive stays self-contained
 * (no separate CSS file to import). Consumers still bring their own visual
 * styling (size, colour, padding) on DrawerContent/DrawerOverlay.
 *
 * The selectors here mirror the `data-drawer-*` attributes set in the component
 * templates and {@link ./controls} — keep them in sync.
 */
export const DRAWER_STYLE_ID = 'robonen-drawer';

export const DRAWER_STYLES = `
[data-drawer] {
  touch-action: none;
  will-change: transform;
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  animation-duration: 0.5s;
  animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='bottom'][data-state='open'] {
  animation-name: slideFromBottom;
}
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='bottom'][data-state='closed'] {
  animation-name: slideToBottom;
}

[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='top'][data-state='open'] {
  animation-name: slideFromTop;
}
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='top'][data-state='closed'] {
  animation-name: slideToTop;
}

[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='left'][data-state='open'] {
  animation-name: slideFromLeft;
}
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='left'][data-state='closed'] {
  animation-name: slideToLeft;
}

[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='right'][data-state='open'] {
  animation-name: slideFromRight;
}
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='right'][data-state='closed'] {
  animation-name: slideToRight;
}

[data-drawer][data-drawer-snap-points='true'][data-drawer-direction='bottom'] {
  transform: translate3d(0, var(--initial-transform, 100%), 0);
}

[data-drawer][data-drawer-snap-points='true'][data-drawer-direction='top'] {
  transform: translate3d(0, calc(var(--initial-transform, 100%) * -1), 0);
}

[data-drawer][data-drawer-snap-points='true'][data-drawer-direction='left'] {
  transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0);
}

[data-drawer][data-drawer-snap-points='true'][data-drawer-direction='right'] {
  transform: translate3d(var(--initial-transform, 100%), 0, 0);
}

[data-drawer][data-drawer-delayed-snap-points='true'][data-drawer-direction='top'] {
  transform: translate3d(0, var(--snap-point-height, 0), 0);
}

[data-drawer][data-drawer-delayed-snap-points='true'][data-drawer-direction='bottom'] {
  transform: translate3d(0, var(--snap-point-height, 0), 0);
}

[data-drawer][data-drawer-delayed-snap-points='true'][data-drawer-direction='left'] {
  transform: translate3d(var(--snap-point-height, 0), 0, 0);
}

[data-drawer][data-drawer-delayed-snap-points='true'][data-drawer-direction='right'] {
  transform: translate3d(var(--snap-point-height, 0), 0, 0);
}

[data-drawer-overlay][data-drawer-snap-points='false'] {
  animation-duration: 0.5s;
  animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}
[data-drawer-overlay][data-drawer-snap-points='false'][data-state='open'] {
  animation-name: fadeIn;
}
[data-drawer-overlay][data-state='closed'] {
  animation-name: fadeOut;
}

[data-drawer-animate='false'] {
  animation: none !important;
}

[data-drawer-overlay][data-drawer-snap-points='true'] {
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

[data-drawer-overlay][data-drawer-snap-points='true'] {
  opacity: 1;
}

[data-drawer]:not([data-drawer-custom-container='true'])::after {
  content: '';
  position: absolute;
  background: inherit;
  background-color: inherit;
}

[data-drawer][data-drawer-direction='top']::after {
  top: initial;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 200%;
}

[data-drawer][data-drawer-direction='bottom']::after {
  top: 100%;
  bottom: initial;
  left: 0;
  right: 0;
  height: 200%;
}

[data-drawer][data-drawer-direction='left']::after {
  left: initial;
  right: 100%;
  top: 0;
  bottom: 0;
  width: 200%;
}

[data-drawer][data-drawer-direction='right']::after {
  left: 100%;
  right: initial;
  top: 0;
  bottom: 0;
  width: 200%;
}

[data-drawer-overlay][data-drawer-snap-points='true']:not([data-drawer-snap-points-overlay='true']):not(
    [data-state='closed']
  ) {
  opacity: 0;
}

[data-drawer-overlay][data-drawer-snap-points-overlay='true'] {
  opacity: 1;
}

[data-drawer-handle] {
  display: block;
  position: relative;
  opacity: 0.7;
  background: #e2e2e4;
  margin-left: auto;
  margin-right: auto;
  height: 5px;
  width: 32px;
  border-radius: 1rem;
  touch-action: pan-y;
}

[data-drawer-handle]:hover,
[data-drawer-handle]:active {
  opacity: 1;
}

[data-drawer-handle-hitarea] {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: max(100%, 2.75rem); /* 44px */
  height: max(100%, 2.75rem); /* 44px */
  touch-action: inherit;
}

@media (hover: hover) and (pointer: fine) {
  [data-drawer] {
    user-select: none;
  }
}

@media (pointer: fine) {
  [data-drawer-handle-hitarea] {
    width: 100%;
    height: 100%;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}

@keyframes slideFromBottom {
  from {
    transform: translate3d(0, var(--initial-transform, 100%), 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes slideToBottom {
  to {
    transform: translate3d(0, var(--initial-transform, 100%), 0);
  }
}

@keyframes slideFromTop {
  from {
    transform: translate3d(0, calc(var(--initial-transform, 100%) * -1), 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes slideToTop {
  to {
    transform: translate3d(0, calc(var(--initial-transform, 100%) * -1), 0);
  }
}

@keyframes slideFromLeft {
  from {
    transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes slideToLeft {
  to {
    transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0);
  }
}

@keyframes slideFromRight {
  from {
    transform: translate3d(var(--initial-transform, 100%), 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes slideToRight {
  to {
    transform: translate3d(var(--initial-transform, 100%), 0, 0);
  }
}
`;
