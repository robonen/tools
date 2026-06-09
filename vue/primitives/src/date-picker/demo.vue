<script lang="ts">
import { defineComponent, h } from 'vue';
import {
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  useCalendarRootContext,
} from '@robonen/primitives';

// Reads the calendar context provided by DatePickerRoot. Defined as a child so
// the injection resolves (the demo's own <script setup> is the Root's parent).
const CalendarBody = defineComponent({
  name: 'CalendarBody',
  setup() {
    const ctx = useCalendarRootContext();

    return () => ctx.grid.value.map(month => h(
      DatePickerGrid,
      { key: month.value.toString(), month: month.value, class: 'w-full border-collapse select-none' },
      () => [
        h(DatePickerGridHead, null, () => h(
          DatePickerGridRow,
          { class: 'mb-1 flex' },
          () => ctx.weekDays.value.map((weekday, i) => h(
            DatePickerHeadCell,
            { key: weekday + i, class: 'w-9 text-center text-xs font-medium text-(--fg-subtle)' },
            () => weekday,
          )),
        )),
        h(DatePickerGridBody, null, () => month.weeks.map((week, w) => h(
          DatePickerGridRow,
          { key: w, class: 'flex w-full' },
          () => week.map(day => h(
            DatePickerCell,
            { key: day.toString(), date: day, class: 'p-0.5' },
            () => h(
              DatePickerCellTrigger,
              {
                day,
                month: month.value,
                class: `flex size-8 items-center justify-center rounded-lg text-sm tabular-nums transition outline-none cursor-pointer
                  focus-visible:ring-2 focus-visible:ring-(--ring)
                  hover:bg-(--bg-inset)
                  data-[selected]:bg-(--accent) data-[selected]:font-semibold data-[selected]:text-(--accent-fg) data-[selected]:hover:bg-(--accent-hover)
                  data-[outside-view]:text-(--fg-subtle) data-[outside-view]:opacity-50
                  data-[disabled]:cursor-not-allowed data-[disabled]:opacity-30`,
              },
            ),
          )),
        ))),
      ],
    ));
  },
});

export default CalendarBody;
</script>

<script setup lang="ts">
import {
  DatePickerCalendar,
  DatePickerClose,
  DatePickerContent,
  DatePickerField,
  DatePickerHeading,
  DatePickerNext,
  DatePickerPrev,
  DatePickerRoot,
  DatePickerTrigger,
} from '@robonen/primitives';
import { ref } from 'vue';

const value = ref<Date>();
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-2">
    <span class="text-xs font-medium text-(--fg-muted)">Departure date</span>

    <DatePickerRoot v-slot="{ open }" v-model="value" :close-on-select="true">
      <div class="flex items-stretch gap-1.5">
        <DatePickerField
          :format="{ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }"
          placeholder-text="Select a date"
          class="min-w-0 flex-1 rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) outline-none placeholder:text-(--fg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring)"
        />
        <DatePickerTrigger
          aria-label="Open calendar"
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--bg) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer data-[state=open]:bg-(--bg-inset) data-[state=open]:text-(--fg)"
        >
          <svg
            class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </DatePickerTrigger>
      </div>

      <DatePickerContent
        :side-offset="6"
        class="z-50 rounded-xl border border-(--border) bg-(--bg-elevated) p-3 text-(--fg) shadow-lg data-[state=closed]:opacity-0"
      >
        <DatePickerCalendar>
          <div class="mb-3 flex items-center justify-between gap-2">
            <DatePickerPrev
              aria-label="Previous month"
              class="inline-flex size-8 items-center justify-center rounded-lg border border-(--border) bg-(--bg) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </DatePickerPrev>
            <DatePickerHeading class="text-sm font-semibold tracking-tight" />
            <DatePickerNext
              aria-label="Next month"
              class="inline-flex size-8 items-center justify-center rounded-lg border border-(--border) bg-(--bg) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </DatePickerNext>
          </div>

          <CalendarBody />
        </DatePickerCalendar>

        <div class="mt-3 flex items-center justify-between border-t border-(--border) pt-3">
          <button
            type="button"
            class="rounded-md px-2 py-1 text-xs font-medium text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) cursor-pointer"
            @click="value = undefined"
          >
            Clear
          </button>
          <DatePickerClose
            class="rounded-md bg-(--accent) px-3 py-1 text-xs font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-95 cursor-pointer"
          >
            Done
          </DatePickerClose>
        </div>
      </DatePickerContent>

      <p v-if="false">{{ open }}</p>
    </DatePickerRoot>

    <p class="text-xs text-(--fg-subtle)">
      <template v-if="value">
        Selected
        <span class="font-medium text-(--fg-muted)">{{ value.toLocaleDateString('en', { dateStyle: 'medium' }) }}</span>
      </template>
      <template v-else>
        No date selected yet
      </template>
    </p>
  </div>
</template>
