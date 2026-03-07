# @robonen/vue

Collection of composables and utilities for Vue 3.

## Install

```bash
pnpm install @robonen/vue
```

## Composables

| Category       | Composables                                                        |
| -------------- | ------------------------------------------------------------------ |
| **browser**    | `useEventListener`, `useFocusGuard`, `useSupported`                |
| **component**  | `unrefElement`, `useRenderCount`, `useRenderInfo`                  |
| **lifecycle**  | `tryOnBeforeMount`, `tryOnMounted`, `tryOnScopeDispose`, `useMounted` |
| **math**       | `useClamp`                                                         |
| **reactivity** | `broadcastedRef`, `useCached`, `useLastChanged`, `useSyncRefs`     |
| **state**      | `useAppSharedState`, `useAsyncState`, `useContextFactory`, `useCounter`, `useInjectionStore`, `useToggle` |
| **storage**    | `useLocalStorage`, `useSessionStorage`, `useStorage`, `useStorageAsync` |
| **utilities**  | `useOffsetPagination`                                              |

## Usage

```ts
import { useToggle, useEventListener } from '@robonen/vue';
```