<script setup lang="ts">
import { computed } from 'vue';
import { mapGamepadToXbox360Controller, useGamepad } from './index';

const { gamepads, isSupported } = useGamepad();

const gamepad = computed(() => gamepads.value[0]);
const hasPad = computed(() => Boolean(gamepad.value));
const controller = mapGamepadToXbox360Controller(gamepad);

function pct(value: number): string {
  // Map a -1..1 axis to a 0..100 position for the stick dots.
  return `${((value + 1) / 2) * 100}%`;
}

const faceButtons = computed(() => {
  const c = controller.value;
  if (!c)
    return [];
  return [
    { key: 'A', pressed: c.buttons.a.pressed, color: 'text-emerald-500' },
    { key: 'B', pressed: c.buttons.b.pressed, color: 'text-red-500' },
    { key: 'X', pressed: c.buttons.x.pressed, color: 'text-sky-500' },
    { key: 'Y', pressed: c.buttons.y.pressed, color: 'text-amber-500' },
  ];
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-300"
    >
      The Gamepad API is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Gamepad
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
          :class="hasPad
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="hasPad ? 'bg-emerald-500 animate-pulse' : 'bg-(--fg-subtle)'"
          />
          {{ hasPad ? 'Connected' : 'Waiting' }}
        </span>
      </div>

      <div
        v-if="!hasPad"
        class="rounded-xl border border-dashed border-(--border) bg-(--bg-inset) p-6 text-center"
      >
        <p class="text-sm font-medium text-(--fg)">No controller detected</p>
        <p class="mt-1 text-xs text-(--fg-subtle)">
          Connect a gamepad and press any button to wake it.
        </p>
      </div>

      <template v-else-if="controller">
        <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
          <div class="truncate text-xs text-(--fg-subtle)" :title="gamepad?.id">
            {{ gamepad?.id }}
          </div>

          <div class="mt-3 grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
                Buttons
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="b in faceButtons"
                  :key="b.key"
                  class="inline-flex size-7 items-center justify-center rounded-md border text-xs font-bold tabular-nums transition"
                  :class="b.pressed
                    ? `border-(--accent) bg-(--accent-subtle) ${b.color}`
                    : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
                >
                  {{ b.key }}
                </span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
                Triggers
              </div>
              <div class="space-y-1.5">
                <div
                  v-for="(t, side) in { LT: controller.triggers.left, RT: controller.triggers.right }"
                  :key="side"
                  class="flex items-center gap-2"
                >
                  <span class="w-6 font-mono text-xs text-(--fg-muted)">{{ side }}</span>
                  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-(--bg-inset)">
                    <div
                      class="h-full rounded-full bg-(--accent) transition-[width]"
                      :style="{ width: `${t.value * 100}%` }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-4">
            <div
              v-for="(stick, side) in { Left: controller.stick.left, Right: controller.stick.right }"
              :key="side"
              class="space-y-2"
            >
              <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
                {{ side }} stick
              </div>
              <div class="relative aspect-square w-full rounded-lg border border-(--border) bg-(--bg-inset)">
                <div
                  class="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all"
                  :class="stick.button.pressed ? 'bg-(--accent)' : 'bg-(--fg-muted)'"
                  :style="{ left: pct(stick.horizontal), top: pct(stick.vertical) }"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <p class="text-xs text-(--fg-subtle)">
      State polls every animation frame and stays paused while no pad is connected.
    </p>
  </div>
</template>
