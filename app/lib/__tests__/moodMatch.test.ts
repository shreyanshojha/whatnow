import { matchMoodFromText } from '../moodMatch';

describe('matchMoodFromText', () => {
  it('matches an obvious keyword', () => {
    expect(matchMoodFromText("I'm so bored, nothing to do")).toBe('bored');
  });

  it('is case-insensitive', () => {
    expect(matchMoodFromText('SO EXHAUSTED right now')).toBe('drained');
  });

  it('picks the mood with the most keyword hits when multiple appear', () => {
    // "overwhelmed" + "too much" both hit overwhelmed; only one anxious keyword.
    expect(matchMoodFromText('feeling overwhelmed, too much going on, a little nervous')).toBe(
      'overwhelmed'
    );
  });

  it('falls back to curious when nothing matches', () => {
    expect(matchMoodFromText('purple giraffe umbrella factory')).toBe('curious');
  });

  it('matches frustrated over anxious for anger-flavored text', () => {
    expect(matchMoodFromText('so angry and annoyed at everything today')).toBe('frustrated');
  });
});
