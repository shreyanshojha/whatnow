import { checkForCrisisLanguage } from '../safetyCheck';

describe('checkForCrisisLanguage', () => {
  it('flags direct statements of suicidal intent', () => {
    expect(checkForCrisisLanguage('I want to kill myself')).toBe(true);
    expect(checkForCrisisLanguage('feeling suicidal today')).toBe(true);
    expect(checkForCrisisLanguage('I wish I were dead')).toBe(true);
  });

  it('flags self-harm language', () => {
    expect(checkForCrisisLanguage('I keep wanting to hurt myself')).toBe(true);
    expect(checkForCrisisLanguage('thinking about self harm')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(checkForCrisisLanguage('I WANT TO DIE')).toBe(true);
  });

  it('does not flag ordinary low-mood text', () => {
    expect(checkForCrisisLanguage('just tired and a bit bored, want something low-key')).toBe(false);
    expect(checkForCrisisLanguage('rough day at work, need to decompress')).toBe(false);
    expect(checkForCrisisLanguage('so anxious about my exam tomorrow')).toBe(false);
  });

  it('does not flag unrelated intense language', () => {
    expect(checkForCrisisLanguage('this deadline is literally killing me lol')).toBe(false);
  });
});
