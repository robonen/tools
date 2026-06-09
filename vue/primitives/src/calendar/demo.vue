<script setup lang="ts">
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrev,
  CalendarRoot,
} from '@robonen/primitives';
import { ref } from 'vue';

const value = ref<Date>(new Date());

function formatSelected(date: Date | undefined) {
  if (!date) return 'None';
  return date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <CalendarRoot
      v-slot="{ grid, weekDays }"
      v-model="value"
      class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 text-(--fg) shadow-sm"
    >
      <CalendarHeader class="mb-3 flex items-center justify-between gap-2">
        <CalendarPrev
          aria-label="Previous month"
          class="inline-flex size-8 items-center justify-center rounded-lg border border-(--border) bg-(--bg) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </CalendarPrev>
        <CalendarHeading class="text-sm font-semibold tracking-tight" />
        <CalendarNext
          aria-label="Next month"
          class="inline-flex size-8 items-center justify-center rounded-lg border border-(--border) bg-(--bg) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </CalendarNext>
      </CalendarHeader>

      <CalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
        :month="month.value"
        class="w-full border-collapse select-none"
      >
        <CalendarGridHead>
          <CalendarGridRow class="mb-1 flex">
            <CalendarHeadCell
              v-for="(weekday, i) in weekDays"
              :key="weekday + i"
              class="w-9 text-center text-xs font-medium text-(--fg-subtle)"
            >
              {{ weekday }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>

        <CalendarGridBody>
          <CalendarGridRow
            v-for="(week, w) in month.weeks"
            :key="w"
            class="flex w-full"
          >
            <CalendarCell
              v-for="day in week"
              :key="day.toString()"
              :date="day"
              class="p-0.5"
            >
              <CalendarCellTrigger
                v-slot="{ dayValue, selected, today }"
                :day="day"
                :month="month.value"
                class="flex size-8 items-center justify-center rounded-lg text-sm tabular-nums transition outline-none cursor-pointer
                  focus-visible:ring-2 focus-visible:ring-(--ring)
                  hover:bg-(--bg-inset)
                  data-[selected]:bg-(--accent) data-[selected]:font-semibold data-[selected]:text-(--accent-fg) data-[selected]:hover:bg-(--accent-hover)
                  data-[outside-view]:text-(--fg-subtle) data-[outside-view]:opacity-50
                  data-[unavailable]:cursor-not-allowed data-[unavailable]:text-red-500 data-[unavailable]:line-through data-[unavailable]:hover:bg-transparent
                  data-[disabled]:cursor-not-allowed data-[disabled]:opacity-30"
              >
                <span
                  :class="[
                    today && !selected ? 'relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-(--accent)' : '',
                  ]"
                >
                  {{ dayValue }}
                </span>
              </CalendarCellTrigger>
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </CalendarRoot>

    <p class="text-xs text-(--fg-muted)">
      Selected:
      <span class="font-medium text-(--fg)">{{ formatSelected(value) }}</span>
    </p>
  </div>
</template>
