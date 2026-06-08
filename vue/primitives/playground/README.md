# @robonen/primitives playground

Minimal Vite + Vue 3 sandbox for inspecting and debugging primitives from
[`@robonen/primitives`](../). Imports source directly via the `@primitives/*`
alias, so HMR works while editing components in `vue/primitives/src/`.

## Usage

```sh
pnpm --filter @robonen/primitives-playground dev
```

Then open http://localhost:5180.

## Adding a demo

Drop a `.vue` file into `src/demos/`. It will be picked up automatically by the
sidebar (`import.meta.glob('./demos/*.vue')`) and addressable via the URL hash
(e.g. `#/Accordion`).

```vue
<script setup lang="ts">
import { AccordionRoot } from '@primitives/accordion';
// or: import { AccordionRoot } from '@primitives';
</script>
```

## Notes

- Imports resolve to `vue/primitives/src/` directly (not the built `dist/`), so
  you can poke at primitives and see changes instantly.
- The playground is `private: true` and is not published.
