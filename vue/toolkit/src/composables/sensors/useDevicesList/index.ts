import { computed, shallowRef } from 'vue';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseDevicesListOptions extends ConfigurableNavigator {
  /**
   * Called with the fresh device list every time it is (re)enumerated
   */
  onUpdated?: (devices: MediaDeviceInfo[]) => void;

  /**
   * Called when an unexpected error occurs (enumeration / `getUserMedia`).
   * Defaults to a no-op — we never log to the console.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;

  /**
   * Request permissions immediately. Without a granted permission the
   * enumerated devices have empty `label`/`deviceId` fields.
   *
   * @default false
   */
  requestPermissions?: boolean;

  /**
   * Media kinds to request when ensuring permissions.
   *
   * @default { audio: true, video: true }
   */
  constraints?: MediaStreamConstraints;
}

export interface UseDevicesListReturn {
  /**
   * Whether `navigator.mediaDevices.enumerateDevices` is available
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * All enumerated media devices
   */
  devices: ShallowRef<MediaDeviceInfo[]>;

  /**
   * Devices of kind `videoinput`
   */
  videoInputs: ComputedRef<MediaDeviceInfo[]>;

  /**
   * Devices of kind `audioinput`
   */
  audioInputs: ComputedRef<MediaDeviceInfo[]>;

  /**
   * Devices of kind `audiooutput`
   */
  audioOutputs: ComputedRef<MediaDeviceInfo[]>;

  /**
   * Whether media permissions have been granted (labels/deviceIds are populated)
   */
  permissionGranted: ShallowRef<boolean>;

  /**
   * Request media permissions (via `getUserMedia`) so labels become available.
   * Resolves to whether permission is granted. Concurrent calls are deduped.
   */
  ensurePermissions: () => Promise<boolean>;
}

/**
 * @name useDevicesList
 * @category Sensors
 * @description Reactive `enumerateDevices` listing available media input/output devices.
 *
 * @param {UseDevicesListOptions} [options={}] Options
 * @returns {UseDevicesListReturn} `devices`, kind-filtered lists, `isSupported`, `permissionGranted` and `ensurePermissions`
 *
 * @example
 * const { videoInputs, audioInputs, audioOutputs } = useDevicesList({ requestPermissions: true });
 *
 * @example
 * const { devices, ensurePermissions, permissionGranted } = useDevicesList();
 * await ensurePermissions();
 *
 * @since 0.0.15
 */
export function useDevicesList(options: UseDevicesListOptions = {}): UseDevicesListReturn {
  const {
    navigator = defaultNavigator,
    requestPermissions = false,
    constraints = { audio: true, video: true },
    onUpdated,
    onError = noop,
  } = options;

  const devices = shallowRef<MediaDeviceInfo[]>([]);
  // Cache one pass over the list per dependency change rather than three.
  const byKind = computed(() => {
    const video: MediaDeviceInfo[] = [];
    const audioIn: MediaDeviceInfo[] = [];
    const audioOut: MediaDeviceInfo[] = [];

    for (const device of devices.value) {
      if (device.kind === 'videoinput') video.push(device);
      else if (device.kind === 'audioinput') audioIn.push(device);
      else if (device.kind === 'audiooutput') audioOut.push(device);
    }

    return { video, audioIn, audioOut };
  });

  const videoInputs = computed(() => byKind.value.video);
  const audioInputs = computed(() => byKind.value.audioIn);
  const audioOutputs = computed(() => byKind.value.audioOut);

  const isSupported = useSupported(() =>
    !!navigator && !!navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices);

  const permissionGranted = shallowRef(false);

  async function update(): Promise<void> {
    if (!isSupported.value)
      return;

    try {
      devices.value = await navigator!.mediaDevices.enumerateDevices();
      onUpdated?.(devices.value);
    }
    catch (error) {
      onError(error);
    }
  }

  // Dedupe overlapping permission requests — a single getUserMedia is enough.
  let permissionPromise: Promise<boolean> | undefined;

  async function requestPermissionsOnce(): Promise<boolean> {
    let granted = true;
    let stream: MediaStream | null = null;

    try {
      // Don't mutate the caller's constraints object; narrow a shallow copy.
      const list = await navigator!.mediaDevices.enumerateDevices();
      const hasCamera = list.some(device => device.kind === 'videoinput');
      const hasMicrophone = list.some(device => device.kind === 'audioinput' || device.kind === 'audiooutput');

      const effective: MediaStreamConstraints = {
        video: hasCamera ? constraints.video : false,
        audio: hasMicrophone ? constraints.audio : false,
      };

      stream = await navigator!.mediaDevices.getUserMedia(effective);
    }
    catch (error) {
      onError(error);
      granted = false;
    }
    finally {
      // Release the tracks straight away — we only needed the permission prompt.
      if (stream)
        stream.getTracks().forEach(track => track.stop());
    }

    permissionGranted.value = granted;
    await update();

    return granted;
  }

  function ensurePermissions(): Promise<boolean> {
    if (!isSupported.value)
      return Promise.resolve(false);

    if (permissionGranted.value)
      return Promise.resolve(true);

    if (permissionPromise)
      return permissionPromise;

    permissionPromise = requestPermissionsOnce().finally(() => {
      permissionPromise = undefined;
    });

    return permissionPromise;
  }

  if (isSupported.value) {
    if (requestPermissions)
      ensurePermissions();

    useEventListener(navigator!.mediaDevices, 'devicechange', update, { passive: true });
    update();
  }

  return {
    isSupported,
    devices,
    videoInputs,
    audioInputs,
    audioOutputs,
    permissionGranted,
    ensurePermissions,
  };
}
