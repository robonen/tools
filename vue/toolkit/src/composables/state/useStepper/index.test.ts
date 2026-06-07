import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useStepper } from '.';

describe(useStepper, () => {
  describe('array of steps', () => {
    it('initializes on the first step by default', () => {
      const { index, current, stepNames } = useStepper(['first', 'second', 'last']);
      expect(index.value).toBe(0);
      expect(current.value).toBe('first');
      expect(stepNames.value).toEqual(['first', 'second', 'last']);
    });

    it('initializes on the provided initial step', () => {
      const { index, current } = useStepper(['first', 'second', 'last'], 'second');
      expect(index.value).toBe(1);
      expect(current.value).toBe('second');
    });

    it('exposes the original steps ref', () => {
      const { steps } = useStepper(['first', 'second']);
      expect(steps.value).toEqual(['first', 'second']);
    });

    it('computes next and previous step names', () => {
      const { next, previous, goToNext } = useStepper(['first', 'second', 'last']);
      expect(previous.value).toBeUndefined();
      expect(next.value).toBe('second');
      goToNext();
      expect(previous.value).toBe('first');
      expect(next.value).toBe('last');
    });

    it('next/previous are undefined at the boundaries', () => {
      const { next, previous, goTo } = useStepper(['first', 'second', 'last']);
      expect(previous.value).toBeUndefined();
      goTo('last');
      expect(next.value).toBeUndefined();
    });

    it('tracks isFirst and isLast', () => {
      const { isFirst, isLast, goToNext } = useStepper(['first', 'second', 'last']);
      expect(isFirst.value).toBeTruthy();
      expect(isLast.value).toBeFalsy();
      goToNext();
      expect(isFirst.value).toBeFalsy();
      expect(isLast.value).toBeFalsy();
      goToNext();
      expect(isFirst.value).toBeFalsy();
      expect(isLast.value).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('goToNext advances the index but stops at the last step', () => {
      const { index, goToNext } = useStepper(['first', 'second', 'last']);
      goToNext();
      expect(index.value).toBe(1);
      goToNext();
      expect(index.value).toBe(2);
      goToNext();
      expect(index.value).toBe(2);
    });

    it('goToPrevious decrements the index but stops at the first step', () => {
      const { index, goToPrevious } = useStepper(['first', 'second', 'last'], 'last');
      goToPrevious();
      expect(index.value).toBe(1);
      goToPrevious();
      expect(index.value).toBe(0);
      goToPrevious();
      expect(index.value).toBe(0);
    });

    it('goTo jumps to a named step', () => {
      const { index, current, goTo } = useStepper(['first', 'second', 'last']);
      goTo('last');
      expect(index.value).toBe(2);
      expect(current.value).toBe('last');
    });

    it('goTo ignores unknown steps', () => {
      const { index, goTo } = useStepper(['first', 'second', 'last']);
      goTo('missing' as any);
      expect(index.value).toBe(0);
    });

    it('goBackTo only navigates backwards', () => {
      const { index, goBackTo, goTo } = useStepper(['first', 'second', 'last']);
      goTo('last');
      goBackTo('first');
      expect(index.value).toBe(0);
      // already before 'last', so this is a no-op
      goBackTo('last');
      expect(index.value).toBe(0);
    });
  });

  describe('predicates', () => {
    it('isCurrent / isNext / isPrevious reflect the current index', () => {
      const { isCurrent, isNext, isPrevious, goToNext } = useStepper(['first', 'second', 'last']);
      expect(isCurrent('first')).toBeTruthy();
      expect(isNext('second')).toBeTruthy();
      expect(isPrevious('second')).toBeFalsy();
      goToNext();
      expect(isCurrent('second')).toBeTruthy();
      expect(isPrevious('first')).toBeTruthy();
      expect(isNext('last')).toBeTruthy();
    });

    it('isBefore / isAfter compare against the current position', () => {
      const { isBefore, isAfter, goTo } = useStepper(['first', 'second', 'last']);
      goTo('second');
      expect(isBefore('last')).toBeTruthy();
      expect(isBefore('first')).toBeFalsy();
      expect(isAfter('first')).toBeTruthy();
      expect(isAfter('last')).toBeFalsy();
    });
  });

  describe('accessors', () => {
    it('at returns the step at an index', () => {
      const { at } = useStepper(['first', 'second', 'last']);
      expect(at(0)).toBe('first');
      expect(at(2)).toBe('last');
      expect(at(99)).toBeUndefined();
    });

    it('get returns a step by name and undefined for unknown', () => {
      const { get } = useStepper(['first', 'second', 'last']);
      expect(get('second')).toBe('second');
      expect(get('missing' as any)).toBeUndefined();
    });
  });

  describe('record of steps', () => {
    const makeSteps = () => ({
      account: { title: 'Account' },
      billing: { title: 'Billing' },
      review: { title: 'Review' },
    });

    it('derives step names from the record keys', () => {
      const { stepNames, current } = useStepper(makeSteps());
      expect(stepNames.value).toEqual(['account', 'billing', 'review']);
      expect(current.value).toEqual({ title: 'Account' });
    });

    it('current resolves to the step value', () => {
      const { current, goToNext } = useStepper(makeSteps());
      goToNext();
      expect(current.value).toEqual({ title: 'Billing' });
    });

    it('at and get resolve record values', () => {
      const { at, get } = useStepper(makeSteps());
      expect(at(1)).toEqual({ title: 'Billing' });
      expect(get('review')).toEqual({ title: 'Review' });
    });

    it('honors the initial step', () => {
      const { current, index } = useStepper(makeSteps(), 'review');
      expect(index.value).toBe(2);
      expect(current.value).toEqual({ title: 'Review' });
    });
  });

  describe('reactivity', () => {
    it('updates when steps come from a ref', () => {
      const steps = ref(['first', 'second']);
      const { stepNames, next } = useStepper(steps);
      expect(stepNames.value).toEqual(['first', 'second']);
      steps.value = ['first', 'second', 'third'];
      expect(stepNames.value).toEqual(['first', 'second', 'third']);
      expect(next.value).toBe('second');
    });

    it('current is reactive to index changes', async () => {
      const scope = effectScope();
      await scope.run(async () => {
        const { current, index } = useStepper(['first', 'second', 'last']);
        index.value = 2;
        await nextTick();
        expect(current.value).toBe('last');
      });
      scope.stop();
    });
  });
});
