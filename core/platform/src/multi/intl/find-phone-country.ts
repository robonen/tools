import { PHONE_COUNTRIES } from './phone-countries';
import type { PhoneCountry } from './phone-countries';

function buildPhoneIndex(countries: readonly PhoneCountry[]): Map<string, PhoneCountry[]> {
  const index = new Map<string, PhoneCountry[]>();

  for (const country of countries) {
    let bucket = index.get(country.code);
    if (!bucket) {
      bucket = [];
      index.set(country.code, bucket);
    }
    bucket.push(country);
  }

  return index;
}

// O(1) lookup over the default dataset, keyed by dialing code. Codes are
// prefix-free (E.164), so probing the first 3..1 digits finds the unique code —
// far cheaper than scanning all ~211 countries on every keystroke.
const PHONE_INDEX = buildPhoneIndex(PHONE_COUNTRIES);

/**
 * Among countries sharing a dialing code, pick the most specific matching area
 * code, else the lowest priority (the primary country). `rest` is the digits
 * after the dialing code.
 */
function resolveGroup(group: readonly PhoneCountry[], rest: string): PhoneCountry | undefined {
  const first = group[0];
  if (!first)
    return undefined;
  if (group.length === 1)
    return first;

  let best: PhoneCountry | undefined;
  let bestAreaLength = 0;
  for (const country of group) {
    for (const area of country.areaCodes ?? []) {
      if (area.length > bestAreaLength && rest.startsWith(area)) {
        best = country;
        bestAreaLength = area.length;
      }
    }
  }
  if (best)
    return best;

  return group.reduce((winner, country) =>
    (winner.priority ?? 0) <= (country.priority ?? 0) ? winner : country);
}

/**
 * @name findPhoneCountry
 * @category Multi
 * @description Resolve a digit string to its country among a {@link PhoneCountry}
 * list. Matches the **longest dialing code** (codes are prefix-free, so this is
 * unambiguous), then — for countries sharing a code (NANP `+1`, `+7` RU/KZ) — the
 * most specific **area code**, then the lowest **priority** (the primary country)
 * when no area code matches. The default dataset is indexed for O(1) lookup; a
 * custom list falls back to a linear scan.
 *
 * @param {string} digits The number's digits (no `+`/separators), e.g. `'14165550123'`
 * @param {readonly PhoneCountry[]} [countries=PHONE_COUNTRIES] The country list
 * @returns {PhoneCountry | undefined} The matched country, or `undefined`
 *
 * @example
 * findPhoneCountry('12025550123')?.iso2; // 'us'
 * findPhoneCountry('14165550123')?.iso2; // 'ca' (area code 416)
 * findPhoneCountry('12425550123')?.iso2; // 'bs' (area code 242)
 *
 * @since 0.0.5
 */
export function findPhoneCountry(
  digits: string,
  countries: readonly PhoneCountry[] = PHONE_COUNTRIES,
): PhoneCountry | undefined {
  if (!digits)
    return undefined;

  // Fast path: the default dataset is indexed by dialing code.
  if (countries === PHONE_COUNTRIES) {
    for (let length = Math.min(3, digits.length); length >= 1; length--) {
      const bucket = PHONE_INDEX.get(digits.slice(0, length));
      if (bucket)
        return resolveGroup(bucket, digits.slice(length));
    }
    return undefined;
  }

  // Fallback (custom list): longest dialing-code prefix via a linear scan.
  let codeLength = -1;
  const group: PhoneCountry[] = [];
  for (const country of countries) {
    if (!digits.startsWith(country.code))
      continue;

    if (country.code.length > codeLength) {
      codeLength = country.code.length;
      group.length = 0;
      group.push(country);
    }
    else if (country.code.length === codeLength) {
      group.push(country);
    }
  }

  return codeLength === -1 ? undefined : resolveGroup(group, digits.slice(codeLength));
}
