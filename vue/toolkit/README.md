# @robonen/vue

Collection of composables and utilities for Vue 3 — 213+ tree-shakeable, SSR-safe composables.

## Install

```bash
pnpm install @robonen/vue
```

## Composables

| Category | Composables |
| -------------- | ----------- |
| **animation** | `useAnimate`, `useCountdown`, `useDateFormat`, `useInterval`, `useIntervalFn`, `useNow`, `useRafFn`, `useTimeAgo`, `useTimeout`, `useTimeoutFn`, `useTimestamp`, `useTransition` |
| **array** | `useArrayDifference`, `useArrayEvery`, `useArrayFilter`, `useArrayFind`, `useArrayFindIndex`, `useArrayFindLast`, `useArrayIncludes`, `useArrayJoin`, `useArrayMap`, `useArrayReduce`, `useArraySome`, `useArrayUnique`, `useSorted` |
| **browser** | `broadcastedRef`, `useBreakpoints`, `useClipboard`, `useClipboardItems`, `useCloseWatcher`, `useColorMode`, `useCssVar`, `useDark`, `useDocumentPiP`, `useEventListener`, `useEyeDropper`, `useFavicon`, `useFileDialog`, `useFileSystemAccess`, `useFullscreen`, `useImage`, `useLocalFonts`, `useMediaQuery`, `useObjectUrl`, `usePermission`, `usePreferredColorScheme`, `usePreferredContrast`, `usePreferredDark`, `usePreferredLanguages`, `usePreferredReducedMotion`, `usePreferredReducedTransparency`, `useScriptTag`, `useShare`, `useStyleTag`, `useTabLeader`, `useTextareaAutosize`, `useTitle`, `useUrlSearchParams`, `useVibrate`, `useWakeLock`, `useWebNotification` |
| **component** | `createReusableTemplate`, `unrefElement`, `useCurrentElement`, `useForwardExpose`, `useTemplateRefsList`, `useVirtualList` |
| **debug** | `useRenderCount`, `useRenderInfo` |
| **elements** | `onElementRemoval`, `useActiveElement`, `useDocumentReadyState`, `useDocumentVisibility`, `useDraggable`, `useDropZone`, `useElementBounding`, `useElementSize`, `useElementVisibility`, `useFocusGuard`, `useIntersectionObserver`, `useMutationObserver`, `useParentElement`, `useResizeObserver`, `useWindowFocus`, `useWindowScroll`, `useWindowSize` |
| **forms** | `useField`, `useFieldArray`, `useForm`, `useFormContext` |
| **lifecycle** | `tryOnBeforeMount`, `tryOnMounted`, `tryOnScopeDispose`, `useMounted` |
| **math** | `logicAnd`, `logicNot`, `logicOr`, `useAbs`, `useAverage`, `useCeil`, `useClamp`, `useFloor`, `useMath`, `useMax`, `useMin`, `usePrecision`, `useProjection`, `useRound`, `useSum`, `useTrunc` |
| **media** | `useBluetooth`, `useDisplayMedia`, `useMediaControls`, `useMemory`, `usePerformanceObserver`, `useSpeechRecognition`, `useSpeechSynthesis`, `useUserMedia`, `useWebWorker`, `useWebWorkerFn` |
| **reactivity** | `computedAsync`, `computedEager`, `computedWithControl`, `extendRef`, `reactiveComputed`, `reactiveOmit`, `reactivePick`, `refAutoReset`, `refDebounced`, `refDefault`, `refThrottled`, `refWithControl`, `syncRef`, `toReactive`, `useCached`, `useCloned`, `useDebounceFn`, `usePrevious`, `useSyncRefs`, `useThrottleFn`, `useToNumber`, `useToString` |
| **sensors** | `onKeyStroke`, `onLongPress`, `onStartTyping`, `useBattery`, `useBodyScrollLock`, `useClickOutside`, `useDeviceMotion`, `useDeviceOrientation`, `useDevicePixelRatio`, `useDevicesList`, `useElementByPoint`, `useElementHover`, `useEscapeKey`, `useFocus`, `useFocusWithin`, `useFps`, `useGamepad`, `useGeolocation`, `useIdle`, `useInfiniteScroll`, `useKeyModifier`, `useMagicKeys`, `useMouse`, `useMouseInElement`, `useMousePressed`, `useNetwork`, `useOnline`, `usePageLeave`, `useParallax`, `usePointer`, `usePointerLock`, `usePointerSwipe`, `useScreenOrientation`, `useScroll`, `useScrollLock`, `useSwipe`, `useTextSelection` |
| **state** | `createSharedComposable`, `useAppSharedState`, `useAsyncState`, `useContextFactory`, `useCounter`, `useCycleList`, `useDebouncedRefHistory`, `useId`, `useInjectionStore`, `useLastChanged`, `useManualRefHistory`, `useOffsetPagination`, `useRefHistory`, `useStepper`, `useThrottledRefHistory`, `useToggle` |
| **storage** | `useLocalStorage`, `useSessionStorage`, `useStorage`, `useStorageAsync` |
| **utilities** | `createEventHook`, `get`, `isDefined`, `set`, `useEventBus`, `useMemoize`, `useSupported` |
| **watch** | `until`, `watchDebounced`, `watchIgnorable`, `watchOnce`, `watchPausable`, `watchThrottled`, `whenever` |

The package also exports event-filter helpers (`debounceFilter`, `throttleFilter`, `pausableFilter`, `createFilterWrapper`) and shared types (`ConfigurableWindow`, `ConfigurableDocument`, `ConfigurableNavigator`, `ConfigurableFlush`, `MaybeComputedElementRef`, …).

## Usage

```ts
import { useEventListener, useMagicKeys, useToggle } from @robonen/vue;

const { value, toggle } = useToggle();

useEventListener(scroll, () => {/* … */}, { passive: true });

const keys = useMagicKeys();
watchEffect(() => {
  if (keys[ctrl+s].value)
    save();
});
```
