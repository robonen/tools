# @robonen/vue

Collection of composables and utilities for Vue 3 — 100+ tree-shakeable, SSR-safe composables.

## Install

```bash
pnpm install @robonen/vue
```

## Composables

| Category       | Composables |
| -------------- | ----------- |
| **browser**    | `onKeyStroke`, `useActiveElement`, `useBodyScrollLock`, `useClickOutside`, `useClipboard`, `useCloseWatcher`, `useColorMode`, `useDevicePixelRatio`, `useDocumentReadyState`, `useDocumentVisibility`, `useDropZone`, `useElementBounding`, `useElementHover`, `useElementSize`, `useElementVisibility`, `useEscapeKey`, `useEventListener`, `useEyeDropper`, `useFavicon`, `useFileDialog`, `useFocus`, `useFocusGuard`, `useFocusWithin`, `useFps`, `useFullscreen`, `useGeolocation`, `useIdle`, `useIntersectionObserver`, `useIntervalFn`, `useKeyModifier`, `useMagicKeys`, `useMediaQuery`, `useMouse`, `useMousePressed`, `useMutationObserver`, `useNetwork`, `useObjectUrl`, `useOnline`, `usePageLeave`, `usePermission`, `usePointer`, `usePreferredColorScheme`, `usePreferredDark`, `useRafFn`, `useResizeObserver`, `useScreenOrientation`, `useScroll`, `useScrollLock`, `useShare`, `useSupported`, `useSwipe`, `useTabLeader`, `useTextSelection`, `useTitle`, `useVibrate`, `useWindowFocus`, `useWindowScroll`, `useWindowSize` |
| **component**  | `unrefElement`, `useForwardExpose`, `useTemplateRefsList` |
| **debug**      | `useRenderCount`, `useRenderInfo` |
| **lifecycle**  | `tryOnBeforeMount`, `tryOnMounted`, `tryOnScopeDispose`, `useMounted` |
| **math**       | `useClamp` |
| **reactivity** | `broadcastedRef`, `refAutoReset`, `refDebounced`, `refThrottled`, `until`, `useArrayFilter`, `useArrayFind`, `useArrayMap`, `useCached`, `useCloned`, `useCycleList`, `useLastChanged`, `usePrevious`, `useSyncRefs`, `useToNumber`, `useToString`, `watchDebounced`, `watchIgnorable`, `watchOnce`, `watchPausable`, `watchThrottled`, `whenever` |
| **state**      | `useAppSharedState`, `useAsyncState`, `useContextFactory`, `useCounter`, `useId`, `useInjectionStore`, `useStepper`, `useToggle` |
| **storage**    | `useLocalStorage`, `useSessionStorage`, `useStorage`, `useStorageAsync` |
| **utilities**  | `useDebounceFn`, `useInterval`, `useOffsetPagination`, `useThrottleFn`, `useTimeoutFn`, `useTimestamp` |

The package also exports event-filter helpers (`debounceFilter`, `throttleFilter`, `pausableFilter`, `createFilterWrapper`) and shared types (`ConfigurableWindow`, `ConfigurableDocument`, `ConfigurableNavigator`, `MaybeComputedElementRef`, …).

## Usage

```ts
import { useEventListener, useMagicKeys, useToggle } from '@robonen/vue';

const { value, toggle } = useToggle();

useEventListener('scroll', () => {/* … */}, { passive: true });

const keys = useMagicKeys();
watchEffect(() => {
  if (keys['ctrl+s'].value)
    save();
});
```
