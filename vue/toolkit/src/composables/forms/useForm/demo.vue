<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from './index';
import type { FormErrors } from './index';

interface SignUp {
  name: string;
  email: string;
  age: number;
}

const submitted = ref<SignUp | null>(null);

const {
  errors,
  meta,
  isSubmitting,
  submitCount,
  defineField,
  handleSubmit,
  resetForm,
} = useForm<SignUp>({
  initialValues: { name: '', email: '', age: 18 },
  validateOn: 'blur',
  revalidateOn: 'value',
  // A custom resolver — no external schema library needed.
  resolver: (values) => {
    const errs: FormErrors = {};
    if (!values.name.trim())
      errs.name = ['Name is required'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      errs.email = ['Enter a valid email'];
    if (values.age < 18)
      errs.age = ['Must be 18 or older'];
    return { errors: errs, values };
  },
});

const [name, nameProps] = defineField('name');
const [email, emailProps] = defineField('email');
const [age, ageProps] = defineField('age');

const onSubmit = handleSubmit(async (values) => {
  await new Promise(resolve => setTimeout(resolve, 600));
  submitted.value = { ...values };
});

const baseInput = 'w-full rounded-lg border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition focus:outline-none focus:ring-2 focus:ring-ring';

function cls(path: keyof SignUp): string {
  return errors[path]?.length
    ? `${baseInput} border-red-500/60 focus:border-red-500`
    : `${baseInput} border-border focus:border-accent`;
}
</script>

<template>
  <form
    class="demo-stack max-w-sm"
    novalidate
    @submit.prevent="onSubmit"
  >
    <div class="flex flex-col gap-1.5">
      <label for="uf-name" class="demo-label">Name</label>
      <input
        id="uf-name"
        v-model="name"
        v-bind="nameProps"
        :class="cls('name')"
        placeholder="Ada Lovelace"
      >
      <p v-if="errors.name?.length" class="text-xs text-red-600 dark:text-red-400">
        {{ errors.name[0] }}
      </p>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="uf-email" class="demo-label">Email</label>
      <input
        id="uf-email"
        v-model="email"
        v-bind="emailProps"
        type="email"
        :class="cls('email')"
        placeholder="ada@example.com"
      >
      <p v-if="errors.email?.length" class="text-xs text-red-600 dark:text-red-400">
        {{ errors.email[0] }}
      </p>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="uf-age" class="demo-label">Age</label>
      <input
        id="uf-age"
        v-model.number="age"
        v-bind="ageProps"
        type="number"
        :class="cls('age')"
      >
      <p v-if="errors.age?.length" class="text-xs text-red-600 dark:text-red-400">
        {{ errors.age[0] }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="meta.valid
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-border bg-bg-inset text-fg-muted'"
      >
        {{ meta.valid ? 'valid' : 'invalid' }}
      </span>
      <span class="demo-badge">
        dirty: {{ meta.dirty }}
      </span>
      <span class="demo-badge">
        submits: {{ submitCount }}
      </span>
    </div>

    <div class="flex gap-2">
      <button
        type="submit"
        :disabled="isSubmitting"
        class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      >
        {{ isSubmitting ? 'Submitting…' : 'Create account' }}
      </button>
      <button
        type="button"
        class="demo-btn"
        @click="resetForm(); submitted = null"
      >
        Reset
      </button>
    </div>

    <div
      v-if="submitted"
      class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-700 dark:text-emerald-300"
    >
      <p class="mb-1 font-semibold not-italic">
        Submitted
      </p>
      <pre class="whitespace-pre-wrap">{{ JSON.stringify(submitted, null, 2) }}</pre>
    </div>
    <p v-else class="text-center text-xs text-fg-subtle">
      Validates on blur, then live on every change.
    </p>
  </form>
</template>
