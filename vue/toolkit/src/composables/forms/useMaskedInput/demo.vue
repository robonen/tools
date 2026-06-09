<script setup lang="ts">
import { computed } from 'vue';
import { getCountryFlagByCode } from '@robonen/platform/multi';
import { findCardBrand, findPhoneCountry, isValidCardNumber, maskCardOptions, maskDateOptions, maskNumberOptions, maskPhoneCountryOptions } from '../mask';
import { useMaskedInput } from './index';

const phone = useMaskedInput({ mask: '+1 (###) ###-####' });

const intl = useMaskedInput({ mask: maskPhoneCountryOptions() });
// Resolve the country from the typed digits (dialing code → area code → priority)
// and show its flag via the platform helper.
const intlCountry = computed(() => findPhoneCountry(intl.unmasked.value));
const intlFlag = computed(() => {
  const iso2 = intlCountry.value?.iso2;
  return iso2 ? getCountryFlagByCode(iso2) : '🌐';
});

const money = useMaskedInput({
  mask: maskNumberOptions({ thousandSeparator: ',', precision: 2, prefix: '$' }),
});

const date = useMaskedInput({ mask: maskDateOptions({ mode: 'dd/mm/yyyy' }) });

const card = useMaskedInput({ mask: maskCardOptions() });
// The grouping (and this label) follow the detected brand: Amex is 4-6-5, etc.
const cardBrand = computed(() => findCardBrand(card.unmasked.value)?.name ?? 'unknown');
// Luhn + length validation (separate from the mask, which only formats).
const cardValid = computed(() => isValidCardNumber(card.unmasked.value));

const inputClass = 'w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--ring)';
const labelClass = 'text-xs font-medium uppercase tracking-wide text-(--fg-subtle)';
const readoutClass = 'flex flex-wrap items-center gap-2 font-mono text-xs text-(--fg-muted)';

function badgeClass(on: boolean): string {
  return on
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : 'border-(--border) bg-(--bg-inset) text-(--fg-subtle)';
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-5">
    <div class="flex flex-col gap-1.5">
      <label :class="labelClass">Phone</label>
      <input v-bind="phone.bind" type="text" placeholder="+1 (###) ###-####" :class="inputClass">
      <div :class="readoutClass">
        <span>raw: "{{ phone.unmasked.value }}"</span>
        <span class="inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium" :class="badgeClass(phone.complete.value)">
          {{ phone.complete.value ? 'complete' : 'incomplete' }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass">International phone (mask follows the country code)</label>
      <div class="flex items-center gap-2">
        <span class="text-xl leading-none" aria-hidden="true">{{ intlFlag }}</span>
        <input v-bind="intl.bind" type="text" inputmode="tel" placeholder="+1 / +7 / +44 / +380 …" :class="[inputClass, 'min-w-0 flex-1']">
      </div>
      <div :class="readoutClass">
        <span>{{ intlCountry?.name ?? 'unknown country' }}</span>
        <span>raw: "{{ intl.unmasked.value }}"</span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass">Amount</label>
      <input v-bind="money.bind" type="text" inputmode="decimal" placeholder="$0.00" :class="inputClass">
      <div :class="readoutClass">
        <span>raw: "{{ money.unmasked.value }}"</span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass">Date</label>
      <input v-bind="date.bind" type="text" inputmode="numeric" placeholder="dd/mm/yyyy" :class="inputClass">
      <div :class="readoutClass">
        <span>raw: "{{ date.unmasked.value }}"</span>
        <span class="inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium" :class="badgeClass(date.complete.value)">
          {{ date.complete.value ? 'complete' : 'incomplete' }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :class="labelClass">Card number (mask follows the brand)</label>
      <input v-bind="card.bind" type="text" inputmode="numeric" placeholder="#### #### #### ####" :class="inputClass">
      <div :class="readoutClass">
        <span>{{ cardBrand }}</span>
        <span>raw: "{{ card.unmasked.value }}"</span>
        <span class="inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium" :class="badgeClass(cardValid)">
          {{ cardValid ? 'valid' : 'invalid' }}
        </span>
      </div>
    </div>
  </div>
</template>
