import { describe, expect, it } from 'vitest';
import {
  calibrateValueByMask,
  isMaskComplete,
  removeFixedMaskCharacters,
} from './conform';
import { MASK_NOOP, MaskModel, maskTransform, normalizeMaskOptions, resolveMaskOptions, unmask } from './model';
import {
  PHONE_COUNTRIES,
  maskCardOptions,
  maskDateOptions,
  maskFromTemplate,
  maskNumberOptions,
  maskPhoneCountryOptions,
  maskPhoneOptions,
} from './presets';
import type { ElementState } from './types';

const PHONE = maskPhoneOptions({ template: '+1 (###) ###-####' });

describe(maskFromTemplate, () => {
  it('compiles tokens to matchers and keeps literals fixed', () => {
    const mask = maskFromTemplate('##/##');
    expect(mask).toHaveLength(5);
    expect(mask[2]).toBe('/');
    expect(mask[0]).toBeInstanceOf(RegExp);
  });
});

describe('maskTransform — array (phone) mask', () => {
  it('conforms a full number, inserting all fixed characters', () => {
    expect(maskTransform('1234567890', PHONE)).toBe('+1 (123) 456-7890');
  });

  it('does not let a digit be eaten by a literal in the prefix', () => {
    // The leading literal "+1 (" must be auto-inserted; the typed digits fill slots.
    expect(maskTransform('12', PHONE)).toBe('+1 (12');
  });

  it('eagerly appends the trailing separator once a segment is filled', () => {
    expect(maskTransform('123', PHONE)).toBe('+1 (123) ');
  });

  it('drops characters that do not fit a matcher slot', () => {
    expect(maskTransform('1a2', PHONE)).toBe('+1 (12');
  });

  it('returns empty for empty input (no eager prefix)', () => {
    expect(maskTransform('', PHONE)).toBe('');
  });
});

describe('maskTransform — single RegExp mask', () => {
  const HEX = { mask: /^#?[0-9a-f]*$/i };

  it('keeps the greedy valid prefix', () => {
    expect(maskTransform('#1a2zz', HEX)).toBe('#1a2');
  });
});

describe('MaskModel — insertion in unmasked space', () => {
  function model(initial: ElementState) {
    return new MaskModel(initial, resolveMaskOptions(PHONE));
  }

  it('inserts a digit and places the caret after it (masked coords)', () => {
    const m = model({ value: '+1 (12', selection: [6, 6] });
    m.addCharacters('3');
    expect(m.value).toBe('+1 (123) ');
    // caret sits right after the 3rd digit, before the auto-inserted ") "
    expect(m.selection[0]).toBe(7);
  });

  it('throws MASK_NOOP when an insertion changes nothing', () => {
    const m = model({ value: '+1 (123) ', selection: [9, 9] });
    // typing the auto-present space/paren area produces no change
    let thrown: unknown;
    try {
      m.addCharacters(' ');
    }
    catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(MASK_NOOP);
  });
});

describe('MaskModel — deletion across fixed characters', () => {
  function model(initial: ElementState) {
    return new MaskModel(initial, resolveMaskOptions(PHONE));
  }

  it('backspacing right after a fixed char deletes the preceding digit', () => {
    // caret after ")" in "+1 (123) " (index 9). Backspace should remove the "3".
    const m = model({ value: '+1 (123) ', selection: [9, 9] });
    m.deleteCharacters(false);
    expect(m.value).toBe('+1 (12');
  });

  it('forward-delete removes the next unmasked digit', () => {
    const m = model({ value: '+1 (123', selection: [5, 5] }); // between 1 and 2
    m.deleteCharacters(true);
    expect(m.value).toBe('+1 (13');
  });
});

describe(unmask, () => {
  it('strips fixed characters from an array mask', () => {
    expect(unmask('+1 (123) 456-7890', PHONE)).toBe('1234567890');
  });

  it('strips separators from the number preset via its preprocessor', () => {
    const opts = maskNumberOptions({ thousandSeparator: ',', precision: 2 });
    expect(unmask('1,234.50', opts)).toBe('1234.50');
  });

  it('strips date separators', () => {
    expect(unmask('31/12/2024', maskDateOptions())).toBe('31122024');
  });
});

describe(maskDateOptions, () => {
  it('inserts separators while typing', () => {
    expect(maskTransform('31122024', maskDateOptions())).toBe('31/12/2024');
  });

  it('clamps an out-of-range day segment', () => {
    expect(maskTransform('99122024', maskDateOptions())).toBe('31/12/2024');
  });

  it('clamps an out-of-range month for mm/dd/yyyy', () => {
    expect(maskTransform('99012024', maskDateOptions({ mode: 'mm/dd/yyyy' }))).toBe('12/01/2024');
  });

  it('supports ISO order with a dash separator', () => {
    expect(maskTransform('20240131', maskDateOptions({ mode: 'yyyy-mm-dd' }))).toBe('2024-01-31');
  });
});

describe(maskNumberOptions, () => {
  it('groups thousands', () => {
    expect(maskTransform('1234567', maskNumberOptions({ thousandSeparator: ',' }))).toBe('1,234,567');
  });

  it('keeps a decimal part within precision', () => {
    expect(maskTransform('1234.567', maskNumberOptions({ thousandSeparator: ',', precision: 2 }))).toBe('1,234.56');
  });

  it('applies prefix and live max clamp', () => {
    const opts = maskNumberOptions({ thousandSeparator: ',', prefix: '$', max: 100 });
    expect(maskTransform('250', opts)).toBe('$100');
    expect(maskTransform('50', opts)).toBe('$50');
  });

  it('drops non-numeric characters', () => {
    expect(maskTransform('12a34', maskNumberOptions())).toBe('1234');
  });
});

describe(maskPhoneCountryOptions, () => {
  // Deterministic format assertions against an explicit country list.
  const CUSTOM = maskPhoneCountryOptions({
    countries: [
      { code: '1', template: '+# (###) ###-####' },
      { code: '34', template: '+## ### ### ###' },
      { code: '380', template: '+### (##) ###-##-##' },
    ],
  });

  it('formats by the matched dialing code', () => {
    expect(maskTransform('12345678901', CUSTOM)).toBe('+1 (234) 567-8901');
    expect(maskTransform('34612345678', CUSTOM)).toBe('+34 612 345 678');
  });

  it('matches the longest dialing-code prefix (+380, not +3…)', () => {
    expect(maskTransform('380441234567', CUSTOM)).toBe('+380 (44) 123-45-67');
  });

  it('uses the fallback template before a code is recognized', () => {
    expect(maskTransform('999', maskPhoneCountryOptions())).toBe('+999');
  });

  it('ships a mask for every country and switches by code with the default set', () => {
    expect(PHONE_COUNTRIES.length).toBeGreaterThan(200);
    expect(PHONE_COUNTRIES.some(country => country.code === '380')).toBeTruthy();
    // No dialing code is a prefix of another (NANP territories are normalized to '1').
    const codes = PHONE_COUNTRIES.map(country => country.code);
    expect(codes.some(a => codes.some(b => a !== b && b.startsWith(a)))).toBeFalsy();

    const masked = maskTransform('12025550123', maskPhoneCountryOptions());
    expect(masked.startsWith('+1 ')).toBeTruthy();
    expect(unmask(masked, maskPhoneCountryOptions())).toBe('12025550123');
  });
});

describe(maskCardOptions, () => {
  it('groups digits by the detected brand', () => {
    expect(maskTransform('4111111111111111', maskCardOptions())).toBe('4111 1111 1111 1111');
    expect(maskTransform('371449635398431', maskCardOptions())).toBe('3714 496353 98431'); // amex 4-6-5
  });

  it('falls back to 16-digit grouping for an unknown prefix', () => {
    expect(maskTransform('0000000000000000', maskCardOptions())).toBe('0000 0000 0000 0000');
  });

  it('unmasks to the raw digits', () => {
    expect(unmask('4111 1111 1111 1111', maskCardOptions())).toBe('4111111111111111');
  });
});

describe(normalizeMaskOptions, () => {
  it('compiles a template string', () => {
    const opts = normalizeMaskOptions('##/##');
    expect(maskTransform('1234', opts)).toBe('12/34');
  });

  it('wraps a bare array mask', () => {
    const opts = normalizeMaskOptions([/\d/, /\d/]);
    expect(maskTransform('99', opts)).toBe('99');
  });

  it('passes full options through', () => {
    expect(normalizeMaskOptions(PHONE)).toBe(PHONE);
  });
});

describe('isMaskComplete / calibrate / removeFixed', () => {
  it('reports completeness for an array mask', () => {
    const mask = maskFromTemplate('##/##');
    expect(isMaskComplete('12/34', mask)).toBeTruthy();
    expect(isMaskComplete('12/3', mask)).toBeFalsy();
  });

  it('calibrate fast-returns a valid prefix unchanged', () => {
    const mask = maskFromTemplate('###');
    const state: ElementState = { value: '12', selection: [2, 2] };
    expect(calibrateValueByMask(state, mask)).toBe(state);
  });

  it('removeFixedMaskCharacters remaps the selection', () => {
    const mask = maskFromTemplate('(##)');
    // "(12)" caret after ")" → unmasked "12" caret at 2
    const result = removeFixedMaskCharacters({ value: '(12)', selection: [4, 4] }, mask);
    expect(result.value).toBe('12');
    expect(result.selection).toEqual([2, 2]);
  });
});
