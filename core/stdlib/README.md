# @robonen/stdlib

Standard library of platform-independent utilities for TypeScript.

## Install

```bash
pnpm install @robonen/stdlib
```

## Modules

| Module          | Utilities                                                                          |
| --------------- | ---------------------------------------------------------------------------------- |
| **arrays**      | `cluster`, `first`, `groupBy`, `last`, `partition`, `range`, `sum`, `toArray`, `unique`, `zip` |
| **async**       | `pool`, `retry`, `sleep`, `tryIt`                                                   |
| **bits**        | `flagsGenerator`, `and`, `or`, `not`, `has`, `is`, `unset`, `toggle`, `BitVector`  |
| **collections** | `get`                                                                              |
| **functions**   | `compose`, `debounce`, `memoize`, `once`, `pipe`, `throttle`                        |
| **math**        | `clamp`, `lerp`, `remap` + BigInt variants                                          |
| **objects**     | `omit`, `pick`                                                                     |
| **patterns**    | `Command`, `PubSub`, `StateMachine`                                                 |
| **structs**     | `BinaryHeap`, `CircularBuffer`, `Deque`, `LinkedList`, `PriorityQueue`, `Queue`, `Stack` |
| **sync**        | `mutex`                                                                            |
| **text**        | `levenshteinDistance`, `trigramDistance`, `templateObject`                          |
| **types**       | JS & TS type utilities                                                             |
| **utils**       | `timestamp`, `noop`                                                                |

## Usage

```ts
import { first, sleep, clamp } from '@robonen/stdlib';
```