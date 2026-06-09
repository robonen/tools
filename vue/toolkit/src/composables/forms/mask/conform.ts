import { clamp, isFunction } from '@robonen/stdlib';
import type { ElementState, Mask, MaskExpression, OverwriteMode } from './types';

/**
 * Resolve a (possibly dynamic) mask to a concrete {@link MaskExpression}.
 */
export function resolveMask(mask: Mask, state: ElementState): MaskExpression {
  return isFunction(mask) ? mask(state) : mask;
}

/**
 * Whether a mask slot is a fixed (literal) character rather than a matcher.
 */
export function isFixedCharacter(slot: RegExp | string): slot is string {
  return typeof slot === 'string';
}

/**
 * Whether `value` is a valid (possibly partial) prefix of the mask. Used as the
 * conform fast-path and to derive a `complete` signal at full length.
 */
export function validateValueWithMask(value: string, mask: MaskExpression): boolean {
  if (mask instanceof RegExp)
    return mask.test(value);

  if (value.length > mask.length)
    return false;

  for (let i = 0; i < value.length; i++) {
    const slot = mask[i];
    const char = value[i];

    if (slot === undefined || char === undefined)
      return false;

    if (isFixedCharacter(slot)) {
      if (char !== slot)
        return false;
    }
    else if (!slot.test(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Whether `value` fully satisfies the mask (array: every slot filled).
 */
export function isMaskComplete(value: string, mask: MaskExpression): boolean {
  if (mask instanceof RegExp)
    return mask.test(value);

  return value.length === mask.length && validateValueWithMask(value, mask);
}

/**
 * Collect the contiguous run of fixed (literal) characters starting at
 * `startIndex`, stopping at the first matcher slot or the end of the mask. These
 * are auto-inserted before the next typed character (and a literal the user
 * happens to type is harmlessly dropped at the following matcher slot).
 */
export function collectFixedCharacters(mask: ReadonlyArray<RegExp | string>, startIndex: number): string {
  let fixed = '';

  for (let i = startIndex; i < mask.length; i++) {
    const slot = mask[i];

    if (slot === undefined || !isFixedCharacter(slot))
      break;

    fixed += slot;
  }

  return fixed;
}

/**
 * Conform a value to an array mask slot-by-slot: auto-insert fixed characters,
 * accept matcher slots one character at a time, drop characters that don't fit,
 * and track the caret in masked-output coordinates.
 */
export function guessValidValueByPattern(
  state: ElementState,
  mask: ReadonlyArray<RegExp | string>,
): ElementState {
  const { value, selection } = state;
  const [from, to] = selection;

  let built = '';
  let maskedFrom: number | null = null;
  let maskedTo: number | null = null;

  for (let i = 0; i <= value.length; i++) {
    if (maskedFrom === null && i >= from)
      maskedFrom = built.length;
    if (maskedTo === null && i >= to)
      maskedTo = built.length;

    if (i === value.length)
      break;

    const char = value[i];
    if (char === undefined)
      continue;

    built += collectFixedCharacters(mask, built.length);

    const slot = mask[built.length];
    if (slot === undefined)
      break;

    if (isFixedCharacter(slot))
      built += slot;
    else if (slot.test(char))
      built += char;
    // else: the character is rejected (built does not advance).
  }

  // Eagerly append the run of fixed characters that follows the filled slots
  // (e.g. the trailing ')' once digits before it are present).
  const finalValue = built.length > 0
    ? built + collectFixedCharacters(mask, built.length)
    : built;

  const end = finalValue.length;

  return {
    value: finalValue,
    selection: [clamp(maskedFrom ?? end, 0, end), clamp(maskedTo ?? end, 0, end)],
  };
}

/**
 * Conform a value to a single-RegExp mask: keep the greedy prefix for which the
 * value still matches, dropping the first character that breaks the pattern.
 */
export function guessValidValueByRegExp(state: ElementState, mask: RegExp): ElementState {
  const { value, selection } = state;
  const [from, to] = selection;

  let accepted = '';
  let newFrom = from;
  let newTo = to;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === undefined)
      continue;

    if (mask.test(accepted + char)) {
      accepted += char;
    }
    else {
      if (i < from)
        newFrom -= 1;
      if (i < to)
        newTo -= 1;
    }
  }

  const end = accepted.length;

  return {
    value: accepted,
    selection: [clamp(newFrom, 0, end), clamp(newTo, 0, end)],
  };
}

/**
 * Entry point: conform `state.value` to `mask`. Fast-returns when the value is
 * already a valid prefix, otherwise dispatches to the array or RegExp guesser.
 */
export function calibrateValueByMask(state: ElementState, mask: Mask): ElementState {
  const expression = resolveMask(mask, state);

  if (validateValueWithMask(state.value, expression))
    return state;

  if (expression instanceof RegExp)
    return guessValidValueByRegExp(state, expression);

  return guessValidValueByPattern(state, expression);
}

/**
 * Strip fixed mask characters from a (masked) state, returning the raw value and
 * the selection remapped into that unmasked space. RegExp masks have no fixed
 * characters, so the state is returned unchanged.
 */
export function removeFixedMaskCharacters(state: ElementState, mask: MaskExpression): ElementState {
  if (mask instanceof RegExp)
    return state;

  const { value, selection } = state;
  const [from, to] = selection;

  let unmasked = '';
  let newFrom = from;
  let newTo = to;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === undefined)
      continue;

    const slot = mask[i];
    const fixed = slot !== undefined && isFixedCharacter(slot);

    if (fixed) {
      if (i < from)
        newFrom -= 1;
      if (i < to)
        newTo -= 1;
    }
    else {
      unmasked += char;
    }
  }

  const end = unmasked.length;

  return {
    value: unmasked,
    selection: [clamp(newFrom, 0, end), clamp(newTo, 0, end)],
  };
}

/**
 * Resolve a (possibly function) {@link OverwriteMode} to a concrete value.
 */
export function resolveOverwriteMode(mode: OverwriteMode, state: ElementState): 'replace' | 'shift' {
  return isFunction(mode) ? mode(state) : mode;
}

/**
 * Under a collapsed caret, `replace` extends the selection to cover the next
 * `newCharacters.length` characters (so they are overwritten); `shift` leaves it
 * collapsed (pure insert). An existing range is returned untouched.
 */
export function applyOverwriteMode(state: ElementState, newCharacters: string, mode: OverwriteMode): ElementState {
  const [from, to] = state.selection;

  if (from !== to)
    return state;

  if (resolveOverwriteMode(mode, state) === 'replace') {
    return {
      value: state.value,
      selection: [from, clamp(from + newCharacters.length, 0, state.value.length)],
    };
  }

  return state;
}

/**
 * Deep value + selection equality, used as the no-op-change guard.
 */
export function areElementStatesEqual(a: ElementState, b: ElementState): boolean {
  // selection is always a [from, to] tuple — a direct compare avoids isEqual's
  // per-call WeakMap allocation and deep-equality dispatch on this hot path.
  return a.value === b.value && a.selection[0] === b.selection[0] && a.selection[1] === b.selection[1];
}
