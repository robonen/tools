# vue preset

## Purpose

Правила для Vue 3 с упором на Composition API и `<script setup>`.

## Key Rules

- `vue/no-export-in-script-setup`.
- `vue/no-import-compiler-macros`.
- `vue/define-props-declaration`: type-based.
- `vue/define-emits-declaration`: type-based.
- `vue/valid-define-props`, `vue/valid-define-emits`.
- `vue/no-lifecycle-after-await`.

## Examples

```vue
<script setup lang="ts">
const props = defineProps<{ id: string }>();
const emit = defineEmits<{ change: [value: string] }>();
</script>

<!-- ❌ Bad -->
<script setup lang="ts">
import { defineProps } from 'vue';
export const x = 1;
const props = defineProps({ id: String });
</script>
```
