<script setup lang="ts">
import { defineComponent, h } from 'vue';
import { useForm } from '../useForm';
import { useFormContext } from './index';

interface Profile {
  username: string;
  bio: string;
}

// A descendant "field" component that reaches the form purely through context —
// it receives no props and is never told which form it belongs to.
const ContextField = defineComponent({
  props: {
    path: { type: String, required: true },
    label: { type: String, required: true },
    multiline: { type: Boolean, default: false },
  },
  setup(props) {
    const form = useFormContext<Profile>();

    // Graceful standalone behaviour when no form ancestor is present.
    if (!form) {
      return () =>
        h('p', { class: 'text-xs text-amber-600 dark:text-amber-400' }, 'No form context found.');
    }

    const tag = props.multiline ? 'textarea' : 'input';
    const inputClass
      = 'w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)';

    return () =>
      h('div', { class: 'flex flex-col gap-1.5' }, [
        h(
          'label',
          { class: 'text-xs font-medium uppercase tracking-wide text-(--fg-subtle)' },
          props.label,
        ),
        h(tag, {
          'class': inputClass,
          'rows': props.multiline ? 2 : undefined,
          'value': form.getFieldValue(props.path as keyof Profile),
          'aria-invalid': form.getErrors(props.path as keyof Profile).length > 0 || undefined,
          'onInput': (event: Event) =>
            form.setFieldValue(
              props.path as keyof Profile,
              (event.target as HTMLInputElement).value,
              { shouldTouch: true },
            ),
        }),
      ]);
  },
});

const form = useForm<Profile>({
  initialValues: { username: 'grace', bio: 'Compiler pioneer.' },
});
const { values, meta, isDirty } = form;
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Profile (fields read context, not props)
      </p>
      <ContextField path="username" label="Username" />
      <ContextField path="bio" label="Bio" multiline />
    </div>

    <div class="flex flex-wrap gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        dirty: {{ isDirty }}
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        touched: {{ meta.touched }}
      </span>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg)">
      <p class="mb-1 text-(--fg-subtle)">
        Shared form values:
      </p>
      <pre class="whitespace-pre-wrap">{{ JSON.stringify(values, null, 2) }}</pre>
    </div>

    <p class="text-center text-xs text-(--fg-subtle)">
      Both inputs are nested children that locate the form via useFormContext().
    </p>
  </div>
</template>
