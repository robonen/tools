import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { createEventHook } from '@/composables/utilities/createEventHook';
import type { EventHookOn } from '@/composables/utilities/createEventHook';

/**
 * Per-notification options mirroring the `Notification` constructor's
 * `NotificationOptions`, plus the `title` argument folded in for convenience.
 */
export interface WebNotificationOptions {
  /**
   * The title shown at the top of the notification.
   */
  title?: string;

  /**
   * The body text displayed below the title.
   */
  body?: string;

  /**
   * Text direction.
   *
   * @default 'auto'
   */
  dir?: 'auto' | 'ltr' | 'rtl';

  /**
   * BCP 47 language tag for the notification's content.
   */
  lang?: string;

  /**
   * An identifying tag. Notifications sharing a tag replace one another.
   */
  tag?: string;

  /**
   * URL of an icon to display.
   */
  icon?: string;

  /**
   * Whether to re-alert the user when a notification replaces an older one
   * with the same `tag`.
   *
   * @default false
   */
  renotify?: boolean;

  /**
   * Keep the notification active until the user interacts with it instead of
   * auto-dismissing.
   *
   * @default false
   */
  requireInteraction?: boolean;

  /**
   * Whether the notification is silent (no sound/vibration).
   *
   * @default false
   */
  silent?: boolean;

  /**
   * Vibration pattern (in milliseconds) for devices that support it.
   */
  vibrate?: number[];
}

export interface UseWebNotificationOptions extends WebNotificationOptions, ConfigurableWindow {
  /**
   * Request permission on mount (when supported and not yet granted).
   *
   * @default true
   */
  requestPermissions?: boolean;
}

export interface UseWebNotificationReturn {
  /**
   * Whether the Notification API is supported in the current environment.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The currently displayed `Notification`, or `null` when none is shown.
   */
  notification: ShallowRef<Notification | null>;

  /**
   * Whether notification permission has been granted.
   */
  permissionGranted: ShallowRef<boolean>;

  /**
   * Display a notification, optionally overriding the default options for this
   * call. Resolves with the created `Notification`, or `undefined` when
   * unsupported or permission is not granted.
   */
  show: (overrides?: WebNotificationOptions) => Promise<Notification | undefined>;

  /**
   * Close the currently displayed notification (if any).
   */
  close: () => void;

  /**
   * Request permission if it has not yet been granted (and was not denied).
   * Resolves with the resulting granted state, or `undefined` when unsupported.
   */
  ensurePermissionGranted: () => Promise<boolean | undefined>;

  /**
   * Register a listener fired when the notification is clicked.
   */
  onClick: EventHookOn<Event>;

  /**
   * Register a listener fired when the notification is shown.
   */
  onShow: EventHookOn<Event>;

  /**
   * Register a listener fired when the notification errors.
   */
  onError: EventHookOn<Event>;

  /**
   * Register a listener fired when the notification is closed.
   */
  onClose: EventHookOn<Event>;
}

/**
 * @name useWebNotification
 * @category Browser
 * @description Reactive, SSR-safe wrapper around the Web Notification API with
 * permission handling and `onClick`/`onShow`/`onError`/`onClose` event hooks.
 *
 * @param {UseWebNotificationOptions} [options={}] Default notification options plus behavior flags
 * @returns {UseWebNotificationReturn} `isSupported`, `notification`, `permissionGranted`, `show`, `close`, `ensurePermissionGranted`, and the `onClick`/`onShow`/`onError`/`onClose` hooks
 *
 * @example
 * const { show, isSupported, onClick } = useWebNotification({
 *   title: 'Hello',
 *   body: 'You have a new message',
 *   icon: '/icon.png',
 * });
 * onClick(() => console.log('clicked'));
 * if (isSupported.value)
 *   show();
 *
 * @example
 * // Override options per call
 * const { show } = useWebNotification();
 * show({ title: 'Override', body: 'Per-call body' });
 *
 * @since 0.0.15
 */
export function useWebNotification(
  options: UseWebNotificationOptions = {},
): UseWebNotificationReturn {
  const {
    window = defaultWindow,
    requestPermissions = true,
  } = options;

  // The constructor lives on the resolved window so tests/iframes can supply
  // their own; falling back to a globally available `Notification` keeps the
  // common (no-window-override) case working.
  const getNotificationCtor = (): typeof Notification | undefined => {
    if (window && 'Notification' in window)
      return (window as Window & { Notification: typeof Notification }).Notification;
    return undefined;
  };

  const isSupported = useSupported(() => {
    const Ctor = getNotificationCtor();
    if (!Ctor)
      return false;

    // Already granted means the constructor is definitely usable.
    if (Ctor.permission === 'granted')
      return true;

    // Some environments expose `Notification` but throw on construction
    // (e.g. Android Chrome). Probe once to confirm it is truly usable.
    try {
      const probe = new Ctor('');
      probe.onshow = () => probe.close();
    }
    catch (error) {
      if ((error as Error).name === 'TypeError')
        return false;
    }

    return true;
  });

  const notification = shallowRef<Notification | null>(null);

  const permissionGranted = shallowRef(
    isSupported.value && getNotificationCtor()?.permission === 'granted',
  );

  const { on: onClick, trigger: clickTrigger } = createEventHook<Event>();
  const { on: onShow, trigger: showTrigger } = createEventHook<Event>();
  const { on: onError, trigger: errorTrigger } = createEventHook<Event>();
  const { on: onClose, trigger: closeTrigger } = createEventHook<Event>();

  const ensurePermissionGranted = async (): Promise<boolean | undefined> => {
    if (!isSupported.value)
      return undefined;

    const Ctor = getNotificationCtor()!;

    if (!permissionGranted.value && Ctor.permission !== 'denied') {
      const result = await Ctor.requestPermission();
      if (result === 'granted')
        permissionGranted.value = true;
    }

    return permissionGranted.value;
  };

  const close = (): void => {
    if (notification.value)
      notification.value.close();
    notification.value = null;
  };

  const show = async (
    overrides?: WebNotificationOptions,
  ): Promise<Notification | undefined> => {
    if (!isSupported.value || !permissionGranted.value)
      return undefined;

    const Ctor = getNotificationCtor()!;

    const merged: WebNotificationOptions = { ...options, ...overrides };

    const created = new Ctor(merged.title ?? '', merged);

    created.onclick = clickTrigger;
    created.onshow = showTrigger;
    created.onerror = errorTrigger;
    created.onclose = closeTrigger;

    notification.value = created;

    return created;
  };

  if (requestPermissions)
    tryOnMounted(ensurePermissionGranted);

  tryOnScopeDispose(close);

  // Close the active notification when the tab becomes visible again — the
  // user is already looking at the page, so the notification is redundant.
  if (window) {
    useEventListener(
      window.document,
      'visibilitychange',
      () => {
        if (window.document.visibilityState === 'visible')
          close();
      },
      { passive: true },
    );
  }

  return {
    isSupported,
    notification,
    permissionGranted,
    show,
    close,
    ensurePermissionGranted,
    onClick,
    onShow,
    onError,
    onClose,
  };
}
