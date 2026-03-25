# @robonen/stdlib

Standard library of platform-independent utilities for TypeScript.

## Install

```bash
pnpm install @robonen/stdlib
```

## Modules

| Module          | Utilities                                                       |
| --------------- | --------------------------------------------------------------- |
| **arrays**      | `cluster`, `first`, `last`, `sum`, `unique`                     |
| **async**       | `sleep`, `tryIt`                                                |
| **bits**        | `flags`                                                         |
| **collections** | `get`                                                           |
| **math**        | `clamp`, `lerp`, `remap` + BigInt variants                      |
| **objects**     | `omit`, `pick`                                                  |
| **patterns**    | `pubsub`                                                        |
| **structs**     | `stack`                                                         |
| **sync**        | `mutex`                                                         |
| **text**        | `levenshteinDistance`, `trigramDistance`                         |
| **types**       | JS & TS type utilities                                          |
| **utils**       | `timestamp`, `noop`                                             |

## Usage

```ts
import { first, sleep, clamp } from '@robonen/stdlib';
```