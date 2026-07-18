/* ============================================================
   WhatNow — curated activity dataset (ported from web v1)
   Deterministic, keyless. 111 activities tagged by mood-fit +
   reason, energy, time, social, indoor/outdoor, cost, category.
   ============================================================ */

export type MoodId =
  | 'restless'
  | 'drained'
  | 'anxious'
  | 'bored'
  | 'low'
  | 'wired'
  | 'content'
  | 'inspired'
  | 'lonely'
  | 'overwhelmed'
  | 'playful'
  | 'curious';

export type CatId =
  | 'move'
  | 'create'
  | 'rest'
  | 'connect'
  | 'explore'
  | 'learn'
  | 'indulge'
  | 'reset';

export type Energy = 'low' | 'medium' | 'high';
export type Social = 'solo' | 'someone' | 'group';
export type Place = 'indoor' | 'outdoor' | 'either';
export type Cost = 'free' | 'cheap' | 'treat';
export type TimeVal = 15 | 60 | 240;

export interface Mood {
  id: MoodId;
  emo: string;
  word: string;
  /** Each mood gets its own identity instead of every mood sharing the same
   * coral accent — grouped by emotional register (calm-needed, high-arousal,
   * low/quiet, settled-positive, seeking-stimulation) using the existing
   * palette so no new colors enter the system. Coral stays reserved for the
   * one universal primary CTA. */
  color: string;
  tint: string;
}

export interface Category {
  label: string;
  emo: string;
  color: string;
  tint: string;
  fallback: string;
}

export interface Activity {
  id: string;
  t: string;
  d: string;
  cat: CatId;
  moods: MoodId[];
  e: Energy;
  time: TimeVal;
  soc: Social[];
  place: Place;
  cost: Cost;
  why: Partial<Record<MoodId, string>>;
}

/* ---- Moods ----
   Colors cluster by emotional register, reusing the existing palette:
   sky = calm-needed, amber = high-arousal, plum = low/quiet,
   sage = settled-positive, peach = seeking-stimulation. */
export const MOODS: Mood[] = [
  { id: 'restless', emo: '🌀', word: 'restless', color: '#E0A24A', tint: '#FBF1DF' },
  { id: 'drained', emo: '🪫', word: 'drained', color: '#9A6FB0', tint: '#F3ECF7' },
  { id: 'anxious', emo: '😰', word: 'anxious', color: '#6BA4C9', tint: '#E9F2F8' },
  { id: 'bored', emo: '🥱', word: 'bored', color: '#F7B267', tint: '#FBEEE3' },
  { id: 'low', emo: '🌧️', word: 'low', color: '#9A6FB0', tint: '#F3ECF7' },
  { id: 'wired', emo: '⚡', word: 'wired', color: '#E0A24A', tint: '#FBF1DF' },
  { id: 'content', emo: '🌿', word: 'content', color: '#7AA274', tint: '#EEF4ED' },
  { id: 'inspired', emo: '✨', word: 'inspired', color: '#7AA274', tint: '#EEF4ED' },
  { id: 'lonely', emo: '🌙', word: 'lonely', color: '#9A6FB0', tint: '#F3ECF7' },
  { id: 'overwhelmed', emo: '🌊', word: 'overwhelmed', color: '#6BA4C9', tint: '#E9F2F8' },
  { id: 'playful', emo: '🎈', word: 'playful', color: '#F7B267', tint: '#FBEEE3' },
  { id: 'curious', emo: '🔭', word: 'curious', color: '#F7B267', tint: '#FBEEE3' },
];

export const MOOD_WORD: Record<string, string> = Object.fromEntries(
  MOODS.map((m) => [m.id, m.word])
);

/* ---- Categories ---- */
export const CATS: Record<CatId, Category> = {
  move: {
    label: 'Move',
    emo: '🏃',
    color: '#e8654a',
    tint: '#fdece7',
    fallback:
      "Moving your body is one of the fastest ways to shift a {mood} moment — you can't think your way out of it, but you can move through it.",
  },
  create: {
    label: 'Create',
    emo: '🎨',
    color: '#9a6fb0',
    tint: '#f3ecf7',
    fallback:
      'Making something small gives a {mood} mind a quiet place to land, with no goal but the doing.',
  },
  rest: {
    label: 'Rest',
    emo: '🛋️',
    color: '#6ba4c9',
    tint: '#e9f2f8',
    fallback:
      'Real rest is allowed. A {mood} moment is often a signal to stop pushing and let the tank refill.',
  },
  connect: {
    label: 'Connect',
    emo: '💬',
    color: '#e0a24a',
    tint: '#fbf1df',
    fallback:
      "Reaching toward one person can quietly loosen a {mood} feeling — you don't have to carry it alone.",
  },
  explore: {
    label: 'Explore',
    emo: '🧭',
    color: '#7aa274',
    tint: '#eef4ed',
    fallback:
      'A change of scenery gives a {mood} mood room to breathe and something new to notice.',
  },
  learn: {
    label: 'Learn',
    emo: '📚',
    color: '#5f8fb0',
    tint: '#e9f1f6',
    fallback:
      'Feeding your curiosity gently redirects a {mood} mind toward something absorbing.',
  },
  indulge: {
    label: 'Indulge',
    emo: '🍯',
    color: '#d98b5f',
    tint: '#fbeee3',
    fallback:
      'A small, deliberate comfort is a kind, uncomplicated answer to a {mood} moment.',
  },
  reset: {
    label: 'Reset',
    emo: '🧹',
    color: '#6aa38f',
    tint: '#e9f3ef',
    fallback:
      'Resetting your space and your head clears just enough of the {mood} fog to see the next small step.',
  },
};

/* ---- Ordinal maps + display labels ---- */
export const E: Record<Energy, number> = { low: 0, medium: 1, high: 2 };
export const COST: Record<Cost, number> = { free: 0, cheap: 1, treat: 2 };
export const TIME_LABEL: Record<TimeVal, string> = {
  15: '15 min',
  60: '~1 hr',
  240: 'half-day',
};
export const SOCIAL_LABEL: Record<Social, string> = {
  solo: 'Solo',
  someone: 'With someone',
  group: 'Group',
};
export const PLACE_LABEL: Record<Place, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  either: 'Anywhere',
};
export const COST_LABEL: Record<Cost, string> = {
  free: 'Free',
  cheap: 'Cheap',
  treat: 'Treat',
};
export const ENERGY_LABEL: Record<Energy, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/* ---- Activity library (96) ----
   fields: t title, d desc, cat, moods[], e energy, time (min needed),
   soc[], place, cost, why{mood:reason}
*/
export const ACTIVITIES: Activity[] = [
  // ---------- MOVE ----------
  { id: 'a-10-minute-walk-without-your-phone', t: 'A 10-minute walk without your phone', d: 'Leave it at home. Just you, the pavement, and whatever you notice.', cat: 'move', moods: ['restless', 'anxious', 'overwhelmed', 'wired'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { restless: 'Restlessness is energy with nowhere to go — a walk gives it a direction without asking anything of you.', anxious: 'Rhythmic walking and the phone-free quiet slow a racing mind more reliably than trying to calm down while sitting still.', overwhelmed: 'Stepping away from the screen shrinks the world back down to one street and one step at a time.', wired: 'Burning a little of the buzz through your legs takes the edge off the wired feeling.' } },
  { id: 'dance-to-three-songs-full-out', t: 'Dance to three songs, full-out', d: "Pick loud favorites. No one's watching. Move like the volume tells you to.", cat: 'move', moods: ['low', 'bored', 'playful', 'drained'], e: 'medium', time: 15, soc: ['solo', 'group'], place: 'indoor', cost: 'free',
    why: { low: 'Motion plus music is a shortcut past a low mood — your body can lead your mood somewhere lighter.', bored: 'Three songs is short enough to start and silly enough to break the flatness.', playful: 'This is pure play — permission to be ridiculous for nine minutes.', drained: 'Not rest, but a jolt: big movement can wake up a tired, foggy afternoon.' } },
  { id: 'go-for-a-proper-run', t: 'Go for a proper run', d: 'Whatever your distance is. Let it hurt a little in the good way.', cat: 'move', moods: ['restless', 'wired', 'anxious'], e: 'high', time: 60, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { restless: 'A hard effort gives restless energy somewhere real to spend itself.', wired: 'Nothing discharges an over-charged nervous system like actually tiring yourself out.', anxious: 'The steady effort crowds out anxious loops and leaves you calmer on the other side.' } },
  { id: '20-jumping-jacks-and-a-long-stretch', t: '20 jumping jacks and a long stretch', d: 'Two minutes to jolt the system, then reach for the ceiling and the floor.', cat: 'move', moods: ['drained', 'low', 'wired'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { drained: "A tiny burst gets blood moving without needing willpower you don't have right now.", low: 'Small physical wins are the easiest kind to collect when everything feels heavy.', wired: 'A quick shake-out and stretch releases some of the held tension underneath the buzz.' } },
  { id: 'bike-somewhere-with-no-destination', t: 'Bike somewhere with no destination', d: 'Turn where it looks interesting. Let the ride be the point.', cat: 'move', moods: ['restless', 'bored', 'inspired'], e: 'high', time: 240, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { restless: 'Covering ground scratches the itch to be going somewhere, anywhere.', bored: "Not knowing what's around the next corner is the whole cure for boredom.", inspired: 'Movement and open air are where loose ideas tend to click into place.' } },
  { id: 'follow-a-15-minute-yoga-video', t: 'Follow a 15-minute yoga video', d: "Roll out a towel if you don't have a mat. Gentle counts.", cat: 'move', moods: ['anxious', 'wired', 'overwhelmed', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: "Linking breath to slow movement tells your body the threat has passed, even when your head hasn't caught up.", wired: 'Slow, deliberate movement is the off-ramp from a wired state.', overwhelmed: 'Fifteen guided minutes means zero decisions — just follow the voice.', drained: 'Gentle enough to do while tired, restorative enough to leave you steadier.' } },
  { id: 'shadow-box-or-punch-a-pillow', t: 'Shadow-box or punch a pillow', d: "Two minutes of throwing everything you've got at nothing.", cat: 'move', moods: ['wired', 'restless', 'overwhelmed'], e: 'high', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { wired: 'A safe, physical outlet lets the charged-up feeling out instead of holding it in.', restless: 'Fast, hard movement satisfies restlessness quickly.', overwhelmed: 'Sometimes you need to physically let the pressure out before you can think.' } },
  { id: 'climb-the-stairs-to-the-top-of-something', t: 'Climb the stairs to the top of something', d: 'A building, a hill, a tower. Go up until there\'s a view.', cat: 'move', moods: ['restless', 'bored'], e: 'medium', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { restless: 'A small climb is a clear task with a clear reward at the top.', bored: 'A change of altitude and a new vantage point resets a stale afternoon.' } },
  { id: 'find-water-and-float-in-it', t: 'Find water and float in it', d: 'Pool, lake, sea, even a long bath. Let it hold your weight.', cat: 'move', moods: ['drained', 'overwhelmed', 'wired'], e: 'medium', time: 240, soc: ['solo', 'someone'], place: 'either', cost: 'cheap',
    why: { drained: 'Being held by water is one of the few genuinely restful ways to move.', overwhelmed: 'Weightlessness quiets the body, and a quiet body quiets a flooded mind.', wired: "The cool and the effort together drain excess charge without a workout's intensity." } },
  { id: 'go-bouldering-or-to-a-climbing-gym', t: 'Go bouldering or to a climbing gym', d: 'Problems that make you forget everything but the next hold.', cat: 'move', moods: ['restless', 'bored', 'playful'], e: 'high', time: 240, soc: ['solo', 'group'], place: 'indoor', cost: 'treat',
    why: { restless: 'Total physical focus soaks up restless energy completely.', bored: "Each route is a puzzle — boredom can't survive that kind of absorption.", playful: "It's grown-up play: challenge, chalk, and small triumphs." } },

  // ---------- CREATE ----------
  { id: 'cook-something-you-ve-never-made', t: "Cook something you've never made", d: 'Pick a recipe that slightly scares you and just start.', cat: 'create', moods: ['bored', 'curious', 'content', 'inspired'], e: 'medium', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'cheap',
    why: { bored: 'A new recipe is a small adventure that ends in dinner.', curious: 'Following unfamiliar steps is hands-on learning with a delicious payoff.', content: 'A warm, unhurried project is a lovely way to spend a settled mood.', inspired: 'Channel the spark into something you can taste at the end.' } },
  { id: 'write-a-page-no-editing-allowed', t: 'Write a page, no editing allowed', d: "Pen to paper. Whatever comes. Don't stop to fix anything.", cat: 'create', moods: ['anxious', 'overwhelmed', 'low', 'lonely'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'Getting the loop out of your head and onto paper makes it smaller and more manageable.', overwhelmed: 'A brain-dump clears space so the pile in your head stops feeling infinite.', low: 'Naming how you feel, without judging it, is quietly relieving.', lonely: 'The page listens without needing anything back.' } },
  { id: 'doodle-for-15-minutes', t: 'Doodle for 15 minutes', d: 'Spirals, boxes, a bad cartoon. Let your hand wander.', cat: 'create', moods: ['bored', 'anxious', 'playful'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'Aimless drawing occupies the restless part of your brain and passes time gently.', anxious: 'Repetitive mark-making is meditative — it gives anxious hands a job.', playful: 'No skill required, no result expected — just play with a pen.' } },
  { id: 'start-a-tiny-collage-from-old-magazines', t: 'Start a tiny collage from old magazines', d: 'Tear, arrange, glue. Make one small strange thing.', cat: 'create', moods: ['bored', 'inspired', 'playful'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'Working with your hands is a reliable exit from a bored, screen-tired state.', inspired: 'Collage lets ideas collide and surprise you.', playful: 'There are no rules — cut and stick whatever delights you.' } },
  { id: 'record-a-voice-memo-about-your-day', t: 'Record a voice memo about your day', d: 'Talk to your phone like a friend for five minutes.', cat: 'create', moods: ['lonely', 'overwhelmed', 'low'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { lonely: 'Speaking your day out loud eases the ache of holding it all silently.', overwhelmed: 'Saying it out loud sorts the mess faster than thinking in circles.', low: 'Hearing yourself put words to it can be gently clarifying.' } },
  { id: 'rearrange-one-shelf-or-corner', t: 'Rearrange one shelf or corner', d: 'Just one. Make a single spot look intentional and nice.', cat: 'create', moods: ['restless', 'overwhelmed', 'bored'], e: 'medium', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { restless: 'A hands-on project channels restlessness into something you can see change.', overwhelmed: 'Controlling one small corner gives back a sense of control overall.', bored: 'Rearranging your space makes the familiar feel new again.' } },
  { id: 'take-10-photos-of-small-beautiful-things', t: 'Take 10 photos of small beautiful things', d: 'A shadow, a leaf, the light on a wall. Hunt for them.', cat: 'create', moods: ['low', 'content', 'inspired', 'curious'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { low: 'Looking for beauty on purpose gently tilts your attention away from the heaviness.', content: 'Savoring small details is a way to hold onto a good, quiet mood.', inspired: 'Framing the world through a lens sharpens how you see it.', curious: 'A treasure hunt for detail rewards a curious eye.' } },
  { id: 'write-a-letter-you-ll-never-send', t: "Write a letter you'll never send", d: "To anyone — past you, a person you're mad at, a lost friend.", cat: 'create', moods: ['anxious', 'lonely', 'low', 'overwhelmed'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'Saying the unsayable safely takes the charge out of it.', lonely: 'Writing to someone, even unsent, is a form of connection your heart still feels.', low: 'It lets grief or hurt have somewhere to go.', overwhelmed: 'Emptying a tangled feeling onto paper untangles it.' } },
  { id: 'build-a-playlist-for-exactly-this-mood', t: 'Build a playlist for exactly this mood', d: 'Not to fix it — to soundtrack it honestly.', cat: 'create', moods: ['low', 'content', 'inspired', 'lonely'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { low: 'A mood you can name and score feels less like something happening to you.', content: 'Curating songs is a cozy, low-effort creative pleasure.', inspired: 'Music is fuel — a good playlist keeps the spark going.', lonely: "The right songs make you feel understood when no one's around." } },
  { id: 'bake-something-from-scratch', t: 'Bake something from scratch', d: 'Bread, cookies, a cake. Fill the place with a good smell.', cat: 'create', moods: ['content', 'low', 'lonely'], e: 'medium', time: 240, soc: ['solo', 'someone'], place: 'indoor', cost: 'cheap',
    why: { content: 'A slow, warm project matches and deepens a settled afternoon.', low: 'The structure of a recipe carries you when motivation is thin, and warmth waits at the end.', lonely: 'Something to nurture, and to share, softens an empty house.' } },
  { id: 'learn-to-fold-one-origami-thing', t: 'Learn to fold one origami thing', d: 'A crane, a box, a frog. Follow the folds and finish it.', cat: 'create', moods: ['bored', 'curious', 'playful'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'A small, finishable challenge is exactly what a bored mind wants.', curious: 'Turning flat paper into a shape is quietly fascinating.', playful: "It's fiddly, delightful, and ends in a tiny toy." } },
  { id: 'make-a-bad-drawing-of-the-view', t: 'Make a bad drawing of the view', d: "Whatever's in front of you. Aim for honest, not good.", cat: 'create', moods: ['bored', 'playful', 'content'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { bored: 'Drawing forces you to actually look, which cures the numbness of boredom.', playful: "Lowering the bar to 'bad on purpose' makes it fun.", content: 'Sketching your surroundings is a mellow way to be present.' } },

  // ---------- REST ----------
  { id: 'lie-on-the-floor-and-do-nothing-for-5-mi', t: 'Lie on the floor and do nothing for 5 minutes', d: "Flat on your back. Let the ground take your weight. That's it.", cat: 'rest', moods: ['overwhelmed', 'wired', 'anxious', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { overwhelmed: 'Doing genuinely nothing is a valid, radical response to too much.', wired: "The floor's firmness signals safety and lets the buzz drain out of you.", anxious: 'With nowhere to fall and nothing to do, the body finally lets go a little.', drained: 'Sometimes the honest move is to stop entirely for five minutes.' } },
  { id: 'take-a-real-nap', t: 'Take a real nap', d: "Curtains closed, alarm for 25 minutes if you're worried.", cat: 'rest', moods: ['drained', 'overwhelmed'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { drained: 'There\'s no substitute for actual rest when the tank is empty — the plan is to refill it.', overwhelmed: 'A short sleep resets a flooded mind better than pushing through will.' } },
  { id: 'make-tea-and-drink-it-slowly-by-a-window', t: 'Make tea and drink it slowly by a window', d: "No phone. Watch the steam and whatever's outside.", cat: 'rest', moods: ['anxious', 'low', 'content', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'A warm cup and a slow ritual give anxious hands and eyes somewhere gentle to rest.', low: "Small comforts, taken slowly, are how you're kind to yourself on a heavy day.", content: 'Savoring a quiet cup is the whole point of a content afternoon.', drained: 'A warm, undemanding pause is exactly the right size of effort right now.' } },
  { id: 'do-a-10-minute-body-scan-meditation', t: 'Do a 10-minute body-scan meditation', d: 'Head to toe, noticing without fixing. Any free app or just yourself.', cat: 'rest', moods: ['anxious', 'wired', 'overwhelmed'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'Coming back into the body, part by part, interrupts anxious thought-spirals.', wired: 'Slowing your attention down slows everything else down with it.', overwhelmed: 'Ten minutes of one simple instruction is a rest from deciding.' } },
  { id: 'wrap-in-a-blanket-and-watch-the-clouds', t: 'Wrap in a blanket and watch the clouds', d: 'Window or outside. Just track them drifting for a while.', cat: 'rest', moods: ['drained', 'low', 'overwhelmed'], e: 'low', time: 60, soc: ['solo'], place: 'either', cost: 'free',
    why: { drained: 'Zero-effort watching lets your system idle and recover.', low: 'Slow, soft looking is soothing when everything feels like too much.', overwhelmed: 'Clouds move at a pace that reminds you not everything is urgent.' } },
  { id: 'take-a-long-hot-shower-or-bath', t: 'Take a long hot shower or bath', d: 'Hotter than usual, longer than necessary. No agenda.', cat: 'rest', moods: ['anxious', 'drained', 'overwhelmed'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'Warm water is a physical reset button for a keyed-up nervous system.', drained: 'It asks nothing of you and gives back warmth and a small fresh start.', overwhelmed: 'A closed door and running water is a legitimate place to hide for a bit.' } },
  { id: 'sit-outside-and-just-listen-for-10-minut', t: 'Sit outside and just listen for 10 minutes', d: 'Close your eyes. Count how many different sounds you can find.', cat: 'rest', moods: ['anxious', 'restless', 'content'], e: 'low', time: 15, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { anxious: 'Anchoring to sound pulls you out of your head and into the present.', restless: 'A tiny listening game gives restless attention a gentle place to land.', content: 'Really hearing the world is a quiet pleasure worth ten minutes.' } },
  { id: 'put-on-a-sleep-story-or-rain-sounds', t: 'Put on a sleep story or rain sounds', d: "Dim the lights, lie down, let someone else's calm voice take over.", cat: 'rest', moods: ['wired', 'anxious', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { wired: "An external calm to follow is easier than manufacturing your own when you're buzzing.", anxious: 'A steady voice or steady rain gives an anxious mind something safe to hold.', drained: 'Let sound do the work while you do nothing at all.' } },

  // ---------- CONNECT ----------
  { id: 'text-one-person-you-miss', t: 'Text one person you miss', d: "No agenda. Just 'thought of you today.' Send it before you overthink.", cat: 'connect', moods: ['lonely', 'low', 'content'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { lonely: 'One small reach across the gap is often all it takes to feel less alone.', low: 'Connection lifts a low mood more reliably than waiting to feel better first.', content: 'Sharing a good moment is a lovely way to spend it.' } },
  { id: 'call-a-family-member-just-to-say-hi', t: 'Call a family member just to say hi', d: 'No reason needed. Ten minutes of an ordinary catch-up.', cat: 'connect', moods: ['lonely', 'low', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { lonely: 'A familiar voice is a fast, warm antidote to feeling unseen.', low: 'Being known by someone who loves you softens a heavy day.', drained: 'A low-effort chat gives back more warmth than it costs.' } },
  { id: 'invite-someone-for-a-spontaneous-walk', t: 'Invite someone for a spontaneous walk', d: "Text a nearby friend: 'Walk in 20?' Keep it easy.", cat: 'connect', moods: ['restless', 'lonely', 'bored'], e: 'medium', time: 60, soc: ['someone'], place: 'outdoor', cost: 'free',
    why: { restless: 'Movement plus company burns the restlessness and fills the time.', lonely: 'Side-by-side walking is the easiest kind of togetherness there is.', bored: 'Company plus a change of scene is a quick fix for a flat mood.' } },
  { id: 'cook-dinner-with-a-friend', t: 'Cook dinner with a friend', d: 'One of you chops, one of you stirs. Feed each other.', cat: 'connect', moods: ['content', 'lonely', 'playful'], e: 'medium', time: 240, soc: ['someone', 'group'], place: 'indoor', cost: 'cheap',
    why: { content: 'A shared, unhurried meal is one of the deep pleasures of a good evening.', lonely: 'Making and sharing food together is closeness you can taste.', playful: 'Kitchens get silly — flour, taste tests, and small disasters.' } },
  { id: 'play-a-board-game-or-cards', t: 'Play a board game or cards', d: 'Even two-player. Loser makes the tea.', cat: 'connect', moods: ['bored', 'playful', 'lonely'], e: 'medium', time: 60, soc: ['someone', 'group'], place: 'indoor', cost: 'free',
    why: { bored: 'A game gives a bored evening structure, stakes, and laughs.', playful: "Friendly competition brings out everyone's mischief.", lonely: 'Shared focus and banter is easy, low-pressure togetherness.' } },
  { id: 'write-a-proper-thank-you-to-someone', t: 'Write a proper thank-you to someone', d: 'A message that says exactly why they mattered. Be specific.', cat: 'connect', moods: ['low', 'content', 'lonely'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { low: 'Gratitude, expressed, reliably nudges your own mood upward.', content: 'Naming what you appreciate deepens a warm, settled feeling.', lonely: 'Reaching out to appreciate someone rebuilds a thread of connection.' } },
  { id: 'host-a-tiny-impromptu-hangout', t: 'Host a tiny impromptu hangout', d: 'Two people, snacks, no cleaning first. Low bar, on purpose.', cat: 'connect', moods: ['playful', 'lonely', 'bored'], e: 'medium', time: 240, soc: ['group'], place: 'indoor', cost: 'cheap',
    why: { playful: 'Spontaneous company is where the best silliness happens.', lonely: 'Filling your space with people is a direct answer to an empty evening.', bored: 'Nothing beats boredom like good company that showed up on a whim.' } },
  { id: 'video-call-a-long-distance-friend', t: 'Video-call a long-distance friend', d: 'The one in another city. See their face, not just their texts.', cat: 'connect', moods: ['lonely', 'low', 'drained'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { lonely: 'Seeing a face you love collapses the distance for a while.', low: "An old friend reminds you who you are on a day you've forgotten.", drained: "Comfortable company you don't have to perform for is restorative." } },
  { id: 'ask-someone-how-they-re-really-doing', t: 'Ask someone how they\'re really doing', d: 'Then actually listen. Skip your own update for once.', cat: 'connect', moods: ['lonely', 'content', 'low'], e: 'low', time: 15, soc: ['someone'], place: 'either', cost: 'free',
    why: { lonely: "Turning outward and truly hearing someone builds the connection you're craving.", content: 'Deep listening is a generous, grounding thing to do with a calm mood.', low: 'Being useful to someone else can quietly lift you too.' } },
  { id: 'join-a-local-pickup-game-or-class', t: 'Join a local pickup game or class', d: 'Basketball, five-a-side, a drop-in fitness class. Just show up.', cat: 'connect', moods: ['restless', 'lonely', 'playful'], e: 'high', time: 60, soc: ['group'], place: 'either', cost: 'cheap',
    why: { restless: 'Team energy and effort together burn off restlessness fast.', lonely: 'Playing alongside strangers is surprisingly cheering — you belong for an hour.', playful: 'Games are joy with rules — jump in.' } },

  // ---------- EXPLORE ----------
  { id: 'walk-a-street-you-ve-never-walked', t: "Walk a street you've never walked", d: 'Pick a road off your usual route and just follow it.', cat: 'explore', moods: ['bored', 'restless', 'curious', 'inspired'], e: 'medium', time: 60, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { bored: "Novelty is the cure for boredom, and it's one turn away.", restless: 'Going somewhere new gives restless feet a real purpose.', curious: 'An unfamiliar street is a small world to discover.', inspired: 'New sights knock loose new thoughts.' } },
  { id: 'visit-a-bookstore-with-no-goal', t: 'Visit a bookstore with no goal', d: "Don't buy anything. Just wander and pull things off shelves.", cat: 'explore', moods: ['bored', 'content', 'curious', 'low'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { bored: 'A room full of ideas is an easy escape from a flat afternoon.', content: 'Browsing slowly is a cozy, low-stakes pleasure.', curious: 'Every spine is a door — follow whatever pulls you.', low: 'Quiet, warm, and full of other worlds to slip into for a bit.' } },
  { id: 'take-transit-to-a-random-stop', t: 'Take transit to a random stop', d: "Ride a few stops past where you'd normally get off. Explore there.", cat: 'explore', moods: ['bored', 'restless', 'curious'], e: 'medium', time: 240, soc: ['solo'], place: 'outdoor', cost: 'cheap',
    why: { bored: 'An unplanned trip turns an ordinary day into a small expedition.', restless: 'Motion plus the unknown is the perfect outlet for a restless streak.', curious: "You never know what neighborhood you'll land in." } },
  { id: 'find-the-highest-public-view-nearby', t: 'Find the highest public view nearby', d: 'A hill, a rooftop bar, a lookout. Go see the sweep of it.', cat: 'explore', moods: ['restless', 'inspired', 'bored'], e: 'medium', time: 240, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { restless: 'A destination with a payoff channels restless energy toward a reward.', inspired: 'A wide view has a way of making problems feel smaller and ideas feel bigger.', bored: 'Perspective is a literal cure for a stuck, small day.' } },
  { id: 'visit-a-museum-or-gallery', t: 'Visit a museum or gallery', d: 'Go slowly. Find the one piece that stops you and sit with it.', cat: 'explore', moods: ['content', 'curious', 'inspired', 'low'], e: 'medium', time: 240, soc: ['solo', 'someone', 'group'], place: 'indoor', cost: 'cheap',
    why: { content: 'Unhurried wandering among beautiful things suits a settled mood perfectly.', curious: 'Rooms of ideas and craft are catnip for a curious mind.', inspired: "Other people's genius is rocket fuel for your own.", low: 'Being quietly moved by something is its own gentle medicine.' } },
  { id: 'explore-a-farmers-market', t: 'Explore a farmers market', d: "Taste the samples, learn a vegetable's name, buy one thing.", cat: 'explore', moods: ['content', 'bored', 'curious', 'playful'], e: 'medium', time: 60, soc: ['solo', 'someone'], place: 'outdoor', cost: 'cheap',
    why: { content: 'Color, smell, and friendly stalls are a feast for a mellow mood.', bored: "A market is sensory and lively — boredom doesn't stand a chance.", curious: 'So much to ask about, taste, and discover.', playful: 'Sampling your way around is simple fun.' } },
  { id: 'sit-in-a-park-you-don-t-usually-go-to', t: "Sit in a park you don't usually go to", d: 'Find a bench, watch the place do its thing, stay a while.', cat: 'explore', moods: ['anxious', 'content', 'low'], e: 'low', time: 60, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { anxious: 'Green space and open sky measurably calm a busy mind.', content: 'A new bench and a slow hour is a small, perfect outing.', low: 'A change of scenery, gently, without needing much of you.' } },
  { id: 'wander-a-hardware-or-plant-store', t: 'Wander a hardware or plant store', d: 'No list. Just drift the aisles and imagine projects.', cat: 'explore', moods: ['bored', 'curious', 'content'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'Aisles of possibility spark ideas and pass the time nicely.', curious: 'So many odd tools and plants to wonder about.', content: 'A calm, browse-y errand with no pressure to buy.' } },
  { id: 'go-somewhere-to-watch-the-sunset', t: 'Go somewhere to watch the sunset', d: 'Find a west-facing spot early and just be there for it.', cat: 'explore', moods: ['low', 'content', 'lonely', 'inspired'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { low: 'A daily, free bit of beauty is a reliable, gentle lift.', content: 'Marking the day\'s end with the sky is a lovely ritual.', lonely: 'Even alone, a sunset feels like company somehow.', inspired: 'Big skies tend to open something up in you.' } },
  { id: 'take-yourself-on-a-solo-caf-date', t: 'Take yourself on a solo café date', d: 'A good drink, a corner seat, a book or a notebook. Just you.', cat: 'explore', moods: ['lonely', 'content', 'low', 'drained'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'cheap',
    why: { lonely: 'Being pleasantly alone among people is different from being alone at home.', content: 'Treating yourself to a nice hour is a fine use of a calm mood.', low: 'A small outing and a warm drink is a low-effort kindness.', drained: 'Let a café hold you for a while — no chores, just ambient life.' } },

  // ---------- LEARN ----------
  { id: 'watch-one-great-documentary', t: 'Watch one great documentary', d: 'Something on a subject you know nothing about. Let it teach you.', cat: 'learn', moods: ['bored', 'curious', 'content', 'low'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { bored: 'A well-told story about the real world is an easy, absorbing escape.', curious: 'An hour on something new scratches exactly the right itch.', content: 'Learning something for no reason but interest suits a relaxed evening.', low: 'Getting pulled into someone else\'s world gives yours a rest.' } },
  { id: 'learn-five-words-in-a-new-language', t: 'Learn five words in a new language', d: 'Hello, thank you, and three you choose. Say them out loud.', cat: 'learn', moods: ['bored', 'curious', 'inspired'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'A tiny, doable challenge gives a bored brain a quick win.', curious: 'New sounds and meanings are pure, low-cost novelty.', inspired: 'Starting something new, even five words, feeds momentum.' } },
  { id: 'read-one-chapter-of-a-book', t: 'Read one chapter of a book', d: "Fiction or not. Just one chapter, then you're allowed to stop.", cat: 'learn', moods: ['anxious', 'content', 'low', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'Following a story narrows your focus and quiets the background noise.', content: 'A chapter and a quiet corner is a classic comfort.', low: 'Slipping into another world gives yours a break.', drained: 'Low effort, high comfort — let the words carry you.' } },
  { id: 'watch-a-how-to-then-make-the-thing', t: 'Watch a how-to, then make the thing', d: 'A knot, an omelet, a paper airplane. Learn it and do it.', cat: 'learn', moods: ['bored', 'curious', 'inspired'], e: 'medium', time: 60, soc: ['solo'], place: 'indoor', cost: 'cheap',
    why: { bored: 'Learning-by-doing turns passive time into a small accomplishment.', curious: 'Understanding how something works is deeply satisfying.', inspired: 'Turn the itch to make into an actual made thing.' } },
  { id: 'pick-a-topic-and-fall-down-a-rabbit-hole', t: 'Pick a topic and fall down a rabbit hole', d: 'Deep-sea creatures, a war you half-know, how bread rises. Go deep.', cat: 'learn', moods: ['bored', 'curious', 'wired'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'A good rabbit hole makes an hour vanish in the best way.', curious: "This is your curiosity's natural habitat — let it run.", wired: 'Channeling a busy, buzzing mind into one deep topic focuses the energy.' } },
  { id: 'listen-to-a-podcast-on-a-walk', t: 'Listen to a podcast on a walk', d: 'Something that makes you think, feet moving the whole time.', cat: 'learn', moods: ['restless', 'low', 'curious', 'drained'], e: 'low', time: 60, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { restless: 'Walking soaks up the restlessness while your mind gets fed.', low: 'Good company in your ears plus movement gently lifts a low mood.', curious: 'Ideas and fresh air together are a fine combination.', drained: 'Gentle input while you move is easier than making your own thoughts.' } },
  { id: 'practice-an-instrument-for-15-minutes', t: 'Practice an instrument for 15 minutes', d: 'Even scales. Even badly. Just make sound for a bit.', cat: 'learn', moods: ['bored', 'low', 'content'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'Focused practice is absorbing enough to melt boredom.', low: 'Small progress you can hear is a real, earned lift.', content: 'Making music unhurried is a warm way to spend a calm hour.' } },
  { id: 'master-one-new-keyboard-shortcut-set', t: 'Master one new keyboard shortcut set', d: 'Pick a tool you use daily and learn five shortcuts properly.', cat: 'learn', moods: ['wired', 'bored', 'curious'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { wired: 'A small optimization gives buzzy, get-things-done energy a target.', bored: 'A quick, useful skill turns dead time into a tiny upgrade.', curious: 'Poking at how your tools really work is satisfying.' } },

  // ---------- INDULGE ----------
  { id: 'order-your-comfort-food-zero-guilt', t: 'Order your comfort food, zero guilt', d: 'The exact thing you\'re craving. Enjoy every bite on purpose.', cat: 'indulge', moods: ['low', 'drained', 'content'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'either', cost: 'treat',
    why: { low: 'On a heavy day, a deliberate, guilt-free comfort is a fair kindness to yourself.', drained: 'Sometimes the move is to not cook and just be fed.', content: 'Savoring a favorite is a fine way to celebrate a good day.' } },
  { id: 'watch-a-comfort-movie-under-a-blanket', t: 'Watch a comfort movie under a blanket', d: "The one you've seen ten times. Snacks mandatory.", cat: 'indulge', moods: ['drained', 'low', 'overwhelmed', 'content'], e: 'low', time: 240, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { drained: 'A film you know by heart asks nothing and gives warmth back.', low: 'Familiar comfort is medicine on a low day — no apology needed.', overwhelmed: 'A known, safe story is a break from a world that\'s asking too much.', content: 'Cozy and easy — the perfect shape for a settled evening.' } },
  { id: 'get-a-pastry-and-eat-it-warm', t: 'Get a pastry and eat it warm', d: 'Fresh from a bakery if you can. Eat it slowly, right away.', cat: 'indulge', moods: ['low', 'content', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'cheap',
    why: { low: 'A tiny, immediate pleasure is a small light on a grey day.', content: 'Savoring something sweet is a lovely little full stop.', drained: 'Low effort, warm reward — exactly right when you\'re tired.' } },
  { id: 'book-a-massage-or-spa-hour', t: 'Book a massage or spa hour', d: 'Let someone else take care of the tension for once.', cat: 'indulge', moods: ['overwhelmed', 'drained', 'anxious'], e: 'low', time: 240, soc: ['solo'], place: 'indoor', cost: 'treat',
    why: { overwhelmed: 'Being cared for, hands-on, is a rare and real release valve.', drained: 'Deep physical rest you don\'t have to manufacture yourself.', anxious: 'Touch and warmth calm the nervous system from the outside in.' } },
  { id: 'make-an-elaborate-hot-drink', t: 'Make an elaborate hot drink', d: 'Whisked cocoa, a proper latte, spiced tea. Fuss over it.', cat: 'indulge', moods: ['content', 'low', 'anxious'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'cheap',
    why: { content: 'A small ceremony makes an ordinary moment feel special.', low: 'The warmth and the ritual are a gentle pick-me-up.', anxious: 'The focused little process gives anxious hands a calming job.' } },
  { id: 'rewatch-a-favorite-show-episode', t: 'Rewatch a favorite show episode', d: 'The comfort one. You know exactly which.', cat: 'indulge', moods: ['drained', 'low', 'lonely'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { drained: 'Familiarity is restful — no new information to process.', low: 'Old favorites are a reliable warm blanket for the mind.', lonely: 'Beloved characters can feel like company on a quiet night.' } },
  { id: 'buy-fresh-flowers-for-your-table', t: 'Buy fresh flowers for your table', d: "Even a cheap bunch. Put them where you'll see them all week.", cat: 'indulge', moods: ['low', 'content', 'lonely'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'cheap',
    why: { low: 'A small, living splash of color quietly lifts a room and you with it.', content: 'Beauty for its own sake is a lovely thing to give yourself.', lonely: 'Something alive and lovely in your space makes the room feel less empty.' } },
  { id: 'solo-dance-kitchen-and-snacks-night', t: 'Solo dance-kitchen and snacks night', d: 'Good music, favorite snacks, no plans, just you and the vibe.', cat: 'indulge', moods: ['playful', 'low', 'lonely'], e: 'medium', time: 60, soc: ['solo'], place: 'indoor', cost: 'cheap',
    why: { playful: 'Your own private party is joy with zero audience anxiety.', low: 'Choosing to make your own fun is a defiant little lift.', lonely: 'Enjoying your own company on purpose reframes being alone.' } },

  // ---------- RESET ----------
  { id: 'make-your-bed-and-open-the-windows', t: 'Make your bed and open the windows', d: 'Two minutes. Fresh air in, one surface set right.', cat: 'reset', moods: ['low', 'overwhelmed', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { low: "One tiny accomplished thing is proof the day isn't a write-off.", overwhelmed: 'A single done task and fresh air is a small foothold against the pile.', drained: 'Low effort, immediate payoff — a fresh room lifts a tired body.' } },
  { id: 'clear-just-one-surface-completely', t: 'Clear just one surface completely', d: 'A desk, a nightstand, the kitchen counter. Only one.', cat: 'reset', moods: ['overwhelmed', 'restless', 'anxious'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { overwhelmed: 'Outer order borrows inner order — one clear surface calms the whole room.', restless: 'A quick, physical task gives restless energy a satisfying target.', anxious: 'Controlling one small thing settles a mind that feels out of control.' } },
  { id: 'do-a-10-minute-tidy-with-a-timer', t: 'Do a 10-minute tidy with a timer', d: 'Set 10 minutes, race it, stop when it rings. No perfectionism.', cat: 'reset', moods: ['overwhelmed', 'restless', 'wired'], e: 'medium', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { overwhelmed: 'A timer makes a bottomless task finite and safe to start.', restless: 'A fast, urgent sprint suits restless energy.', wired: 'Channel the buzz into ten focused minutes with a hard stop.' } },
  { id: 'write-tomorrow-s-three-most-important-th', t: "Write tomorrow's three most important things", d: "Only three. Close the notebook. You're done deciding.", cat: 'reset', moods: ['anxious', 'overwhelmed', 'wired'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'Getting tomorrow onto paper lets your mind stop rehearsing it tonight.', overwhelmed: 'Narrowing everything to three makes the mountain a to-do list.', wired: 'Giving the buzzing planner in your head an outlet lets it rest.' } },
  { id: 'delete-20-photos-or-emails', t: 'Delete 20 photos or emails', d: 'Just twenty. A tiny, satisfying dent in the digital clutter.', cat: 'reset', moods: ['bored', 'wired', 'restless'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { bored: 'A mindless-but-productive task is oddly satisfying when bored.', wired: 'Quick, repetitive clearing gives fidgety energy something to do.', restless: 'Small, fast progress soothes the itch to be doing something.' } },
  { id: 'drink-a-big-glass-of-water-and-stretch', t: 'Drink a big glass of water and stretch', d: 'Full glass, slow drink, then reach in every direction.', cat: 'reset', moods: ['drained', 'wired', 'low'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { drained: "Half of 'tired' is often just dehydrated and stiff — start there.", wired: 'A simple bodily reset takes a little of the edge off.', low: 'The smallest bit of care for your body is a fine place to begin.' } },
  { id: 'step-outside-for-five-slow-breaths', t: 'Step outside for five slow breaths', d: 'Just to the doorway. In for four, out for six. Five times.', cat: 'reset', moods: ['anxious', 'overwhelmed', 'wired'], e: 'low', time: 15, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { anxious: "A long exhale is a direct switch for the body's calm-down response.", overwhelmed: 'Air and a pause create just enough space to unstick.', wired: 'Slow breathing is the fastest lever you have on a racing system.' } },
  { id: 'change-into-clean-comfortable-clothes', t: 'Change into clean, comfortable clothes', d: "Even if you're staying in. A small reset for the body.", cat: 'reset', moods: ['drained', 'low', 'overwhelmed'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { drained: 'Fresh clothes are a tiny reset that costs almost nothing.', low: 'A small act of self-care can shift how the rest of the day feels.', overwhelmed: 'Change one comfortable thing and the day gets a soft new start.' } },
  { id: 'brain-dump-everything-on-your-mind-onto', t: 'Brain-dump everything on your mind onto paper', d: 'Every task, worry, and half-thought. Empty the whole tab-stack.', cat: 'reset', moods: ['anxious', 'overwhelmed', 'wired'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { anxious: 'Your head stops looping once the loops live safely on paper.', overwhelmed: "You can't sort a pile you can't see — get it all out first.", wired: 'Emptying a buzzing mind onto the page slows it right down.' } },
  { id: 'put-your-phone-in-another-room-for-an-ho', t: 'Put your phone in another room for an hour', d: 'Physically. Different room. Set a real timer if you must.', cat: 'reset', moods: ['restless', 'wired', 'anxious', 'overwhelmed'], e: 'low', time: 60, soc: ['solo'], place: 'either', cost: 'free',
    why: { restless: 'Removing the easy dopamine forces the restlessness to resolve some other, better way.', wired: 'A lot of the wired feeling is the phone — create real distance from it.', anxious: 'Fewer inputs means fewer sparks for the anxiety to catch on.', overwhelmed: 'One less source of demands is one less thing flooding you.' } },

  // ---------- EXTRA (move / explore / play / connect mix) ----------
  { id: 'kick-a-ball-around-outside', t: 'Kick a ball around outside', d: 'A park, a wall, a willing friend. Just knock it about.', cat: 'move', moods: ['playful', 'bored', 'restless'], e: 'medium', time: 60, soc: ['someone', 'group'], place: 'outdoor', cost: 'free',
    why: { playful: 'Simple ball games are joy in its most basic, best form.', bored: 'Physical play is an instant off-switch for boredom.', restless: 'Chasing a ball gives restless legs a happy job.' } },
  { id: 'go-for-a-golden-hour-photo-walk', t: 'Go for a golden-hour photo walk', d: 'Head out an hour before sunset and shoot the warm light.', cat: 'explore', moods: ['content', 'inspired', 'low', 'lonely'], e: 'medium', time: 60, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { content: 'Warm light and a slow wander is a small, perfect ritual.', inspired: 'Golden hour makes everything photogenic and gets ideas flowing.', low: 'Chasing good light gently pulls your gaze outward and up.', lonely: 'A purposeful solo outing feels companionable, not empty.' } },
  { id: 'try-a-new-workout-class', t: 'Try a new workout class', d: "Spin, boxing, dance-cardio — whatever you'd never normally pick.", cat: 'move', moods: ['restless', 'bored', 'wired'], e: 'high', time: 60, soc: ['solo', 'group'], place: 'indoor', cost: 'treat',
    why: { restless: 'A hard, guided hour spends restless energy completely.', bored: 'Novelty plus effort makes an hour fly.', wired: 'Big exertion is the cleanest way to discharge a wired system.' } },
  { id: 'rollerblade-or-skateboard-around', t: 'Rollerblade or skateboard around', d: 'Wobbly is fine. Feel the speed and the breeze.', cat: 'move', moods: ['playful', 'restless', 'bored'], e: 'high', time: 60, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { playful: 'Wheels and balance bring out the delighted kid in you.', restless: 'Speed and focus give restless energy a thrilling outlet.', bored: "It's hard to be bored while trying not to fall over." } },
  { id: 'do-a-5-color-scavenger-hunt-on-a-walk', t: 'Do a 5-color scavenger hunt on a walk', d: 'Find something red, blue, yellow, green, and purple. Photograph each.', cat: 'explore', moods: ['playful', 'bored', 'low', 'curious'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { playful: 'A little game turns an ordinary walk into a quest.', bored: 'Giving your eyes a mission makes the familiar interesting.', low: 'A gentle, playful focus lifts you without demanding much.', curious: 'Hunting for detail rewards a curious eye.' } },
  { id: 'have-a-water-fight-or-splash-around', t: 'Have a water fight or splash around', d: "Balloons, hose, or a fountain you're allowed in. Get soaked.", cat: 'move', moods: ['playful', 'bored', 'wired'], e: 'high', time: 60, soc: ['group'], place: 'outdoor', cost: 'free',
    why: { playful: 'Pure, shrieking, uncomplicated fun.', bored: 'Chaos and laughter obliterate a boring afternoon.', wired: 'Big, loud, physical release lets the buzz all out at once.' } },
  { id: 'build-a-blanket-fort-and-read-in-it', t: 'Build a blanket fort and read in it', d: 'Chairs, sheets, fairy lights if you have them. Then hide and read.', cat: 'create', moods: ['playful', 'low', 'drained'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { playful: "Making a fort is childhood joy you're allowed to keep.", low: 'A cozy den you built is a soft, comforting place to retreat.', drained: 'Low effort, high coziness — the perfect tired-day project.' } },
  { id: 'play-a-video-game-you-love', t: 'Play a video game you love', d: 'The comfort one, not the stressful one. Sink in for a bit.', cat: 'indulge', moods: ['bored', 'drained', 'wired', 'playful'], e: 'low', time: 60, soc: ['solo', 'group'], place: 'indoor', cost: 'free',
    why: { bored: 'An absorbing game is a reliable, immediate cure for boredom.', drained: 'Low physical effort, high engagement — easy on a tired day.', wired: 'Focused play gives buzzing attention a satisfying place to go.', playful: 'Games are literally play — lean in.' } },
  { id: 'do-a-jigsaw-or-crossword', t: 'Do a jigsaw or crossword', d: 'Something with a satisfying number of pieces or clues.', cat: 'learn', moods: ['anxious', 'bored', 'content'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'cheap',
    why: { anxious: 'Repetitive, absorbing problem-solving quiets an anxious mind.', bored: 'A puzzle gives a bored brain exactly the right amount of challenge.', content: 'A gentle, satisfying puzzle suits a calm, unhurried mood.' } },
  { id: 'garden-or-repot-a-plant', t: 'Garden or repot a plant', d: 'Get your hands in soil. Trim, water, move something to better light.', cat: 'reset', moods: ['content', 'anxious', 'restless', 'low'], e: 'medium', time: 60, soc: ['solo'], place: 'either', cost: 'cheap',
    why: { content: 'Tending growing things is a deeply grounding, quiet pleasure.', anxious: 'Soil, roots, and care pull you out of your head and into your hands.', restless: 'A hands-on task with visible results settles restless energy.', low: 'Nurturing something alive gives a heavy day a small point.' } },
  { id: 'wash-your-car-or-bike-by-hand', t: 'Wash your car or bike by hand', d: 'Bucket, sponge, music. Watch it go from grubby to gleaming.', cat: 'reset', moods: ['restless', 'wired', 'bored'], e: 'medium', time: 60, soc: ['solo'], place: 'outdoor', cost: 'cheap',
    why: { restless: 'Repetitive physical work with a clear result soothes restlessness.', wired: 'Scrubbing burns off buzzy energy and leaves something clean behind.', bored: 'A visible before-and-after is oddly satisfying on a dull day.' } },
  { id: 'go-to-a-library-and-browse', t: 'Go to a library and browse', d: 'Free, warm, quiet. Wander the stacks and leave with an armful.', cat: 'explore', moods: ['content', 'curious', 'low', 'anxious'], e: 'low', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { content: 'Quiet shelves and soft light are a balm for a calm mood.', curious: 'Endless free doors into other subjects and worlds.', low: 'A gentle, warm place to be that asks nothing of you.', anxious: 'The hush of a library is genuinely calming.' } },
  { id: 'watch-the-rain-from-a-covered-spot', t: 'Watch the rain from a covered spot', d: 'Porch, doorway, big window. Just watch it come down.', cat: 'rest', moods: ['low', 'content', 'anxious', 'drained'], e: 'low', time: 15, soc: ['solo'], place: 'outdoor', cost: 'free',
    why: { low: 'Letting the weather match your mood, without fighting it, is its own comfort.', content: "There's a deep coziness in watching rain from somewhere dry.", anxious: 'The steady sound and rhythm of rain is naturally soothing.', drained: 'Zero effort, quietly restorative — just watch and breathe.' } },
  { id: 'watch-birds-or-feed-ducks-at-a-pond', t: 'Watch birds or feed ducks at a pond', d: 'Bring seed or just your attention. Sit and notice them.', cat: 'explore', moods: ['content', 'anxious', 'lonely', 'low'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { content: 'Slow, gentle watching is a small delight on a settled day.', anxious: 'Focusing on animals doing their thing pulls you out of anxious thought.', lonely: 'The quiet company of other living things is soothing.', low: 'Small living beauty is a gentle nudge toward lighter.' } },
  { id: 'cook-with-only-what-s-in-the-fridge', t: "Cook with only what's in the fridge", d: 'No shopping. Make something from the odds and ends. Get inventive.', cat: 'create', moods: ['bored', 'content', 'curious'], e: 'medium', time: 60, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { bored: 'A constraint turns dinner into a fun little puzzle.', content: 'Pottering in the kitchen is a mellow, satisfying way to spend an hour.', curious: 'Improvising with what you have is a small creative experiment.' } },
  { id: 'have-a-solo-karaoke-session', t: 'Have a solo karaoke session', d: 'Headphones or full-volume speakers. Sing the big ones badly.', cat: 'indulge', moods: ['low', 'playful', 'wired', 'lonely'], e: 'medium', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { low: 'Belting a song moves stuck feeling through and out of you.', playful: 'Full-throated, no-audience singing is pure fun.', wired: 'Loud release channels the buzz into something joyful.', lonely: "Filling the room with your own voice pushes back on the quiet." } },
  { id: 'make-a-gratitude-list-of-ten-small-thing', t: 'Make a gratitude list of ten small things', d: 'Ten. Small and specific — the coffee, the light, a text back.', cat: 'reset', moods: ['low', 'anxious', 'overwhelmed', 'content'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { low: 'Deliberately noticing good, even tiny good, gently rebalances a low mood.', anxious: 'Listing what\'s steady and okay counterweights the what-ifs.', overwhelmed: 'Zooming in on small good things shrinks the sense of everything-at-once.', content: 'Savoring what\'s already good deepens a settled, grateful mood.' } },
  { id: 'stretch-on-the-floor-while-a-record-play', t: 'Stretch on the floor while a record plays', d: 'One full album side. Slow stretches, no phone, just sound and body.', cat: 'rest', moods: ['drained', 'wired', 'low', 'content'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { drained: 'Gentle movement plus music revives you without demanding effort.', wired: 'Slow stretching to music eases a body that\'s holding tension.', low: 'Sound and slow motion together are a soft way to shift a mood.', content: 'An album and a stretch is an unhurried, lovely pause.' } },
  { id: 'people-watch-from-a-bench-with-a-coffee', t: 'People-watch from a bench with a coffee', d: 'Somewhere busy. Make up tiny stories about who walks by.', cat: 'explore', moods: ['lonely', 'content', 'curious', 'low'], e: 'low', time: 60, soc: ['solo'], place: 'outdoor', cost: 'cheap',
    why: { lonely: 'Being among the flow of people eases the sense of being cut off.', content: 'Idle watching of the world is a simple, contented pleasure.', curious: 'Every passerby is a small mystery to wonder about.', low: 'Gentle connection to the world, no effort required.' } },
  { id: 'plan-a-future-trip-you-might-take', t: 'Plan a future trip you might take', d: 'Real or dream. Maps, routes, a place to stay you\'d love.', cat: 'learn', moods: ['bored', 'low', 'inspired', 'curious'], e: 'low', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { bored: 'Dreaming up an adventure is an instant escape from a flat day.', low: 'Something to look forward to, even hypothetical, lifts the horizon.', inspired: 'Imagining new places is fuel for a spark that wants to go somewhere.', curious: 'Researching a place you\'ve never been feeds the wanderer in you.' } },

  // ---------- QUICK GROUP-FRIENDLY ----------
  { id: 'play-one-fast-round-of-a-party-game', t: 'Play one fast round of a party game', d: 'Charades, would-you-rather, a quick card game. One round, big laughs.', cat: 'connect', moods: ['playful', 'bored', 'lonely', 'low'], e: 'low', time: 15, soc: ['someone', 'group'], place: 'indoor', cost: 'free',
    why: { playful: "A quick round is instant, silly, shared fun with whoever's around.", bored: 'Fifteen minutes of a game turns a flat moment lively.', lonely: 'Playing together, even briefly, is easy closeness.', low: 'Shared laughter is one of the quickest ways to lighten a heavy mood.' } },
  { id: 'toss-a-frisbee-or-ball-around', t: 'Toss a frisbee or ball around', d: 'Just back and forth in the nearest open space. No score, no rules.', cat: 'move', moods: ['playful', 'restless', 'bored', 'content'], e: 'medium', time: 15, soc: ['someone', 'group'], place: 'outdoor', cost: 'free',
    why: { playful: 'Simple catch is uncomplicated, grinning fun.', restless: 'Light movement with company burns the fidget in fifteen minutes.', bored: 'A quick toss-around beats standing around feeling flat.', content: 'Easy movement outdoors with people is a small, good moment.' } },
  { id: 'do-a-two-minute-group-shake-out-and-chee', t: 'Do a two-minute group shake-out and cheer', d: 'Everyone stands, shakes it out, and does one ridiculous group cheer.', cat: 'move', moods: ['low', 'wired', 'playful', 'drained'], e: 'low', time: 15, soc: ['group'], place: 'either', cost: 'free',
    why: { low: 'A goofy shared burst of movement lifts the whole room, you included.', wired: 'A quick collective shake-out lets everyone discharge some buzz together.', playful: 'Deliberate silliness with people is joy on tap.', drained: 'A tiny, low-effort jolt with others is easier than getting going alone.' } },

  // ---------- GAP FILL: mood & category coverage ----------
  { id: 'send-a-voice-note-instead-of-a-text', t: "Send a voice note instead of a text", d: "Say the actual thing out loud to someone who'll get it — messier and more honest than typing it out.", cat: 'connect', moods: ['anxious', 'overwhelmed', 'wired', 'inspired', 'curious'], e: 'low', time: 15, soc: ['solo'], place: 'either', cost: 'free',
    why: { anxious: "Hearing yourself say the worry out loud often shrinks it faster than typing ever could.", overwhelmed: "You don't have to explain everything — one honest minute, sent, lightens the load.", wired: 'Talking it out burns off some of the buzz and gives the energy somewhere useful to go.', inspired: "Saying the idea out loud is how you find out if it's actually good — and it keeps the spark from fizzling out alone.", curious: 'A voice note is a small, low-stakes way to think out loud with someone instead of just in your own head.' } },
  { id: 'build-something-with-your-hands-for-twen', t: "Build something with your hands for twenty minutes", d: "A model kit, furniture you've been putting off, anything with a clear next step and no screen.", cat: 'create', moods: ['wired', 'bored', 'restless'], e: 'medium', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { wired: 'Channeling the buzz into your hands instead of your head gives restless energy an actual outlet with something to show for it.', bored: "A concrete little project beats scrolling — something to point at when you're done.", restless: 'Building something gives restless hands a job so the rest of you can settle.' } },
  { id: 'take-the-long-way-home', t: "Take the long way home", d: "Add fifteen minutes by a route you don't usually take. No destination pressure, just a different path.", cat: 'explore', moods: ['wired', 'overwhelmed', 'restless'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { wired: 'A change of scenery gives wired energy somewhere new to spend itself instead of circling the same four walls.', overwhelmed: 'A different path shrinks the world down to just this street, which is exactly the size an overwhelmed mind can handle.', restless: 'New scenery gives restlessness something to look at besides the inside of your own head.' } },
  { id: 'learn-a-party-trick-or-one-weird-fact', t: 'Learn a party trick or one weird fact', d: 'A card trick, a bar bet, one wild piece of trivia. Something to pull out to make someone laugh.', cat: 'learn', moods: ['playful', 'lonely', 'bored'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { playful: 'Something silly and shareable is basically playfulness with a purpose.', lonely: 'A fact or trick worth telling gives you a built-in reason to reach out to someone later.', bored: "It's small, a little absurd, and gives boredom somewhere fun to go." } },
  { id: 'watch-one-short-video-on-something-total', t: 'Watch one short video on something totally unrelated to your to-do list', d: 'Five minutes on deep-sea creatures, ancient Rome, anything with zero stakes for you right now.', cat: 'learn', moods: ['overwhelmed', 'anxious'], e: 'low', time: 15, soc: ['solo'], place: 'indoor', cost: 'free',
    why: { overwhelmed: 'Borrowing your attention for something with zero consequences is a genuine, if brief, break from the pile.', anxious: "A few minutes of low-stakes curiosity gives an anxious mind something to hold that isn't the worry." } },
  { id: 'lie-down-and-watch-the-sky-or-the-ceilin', t: 'Lie down and watch the sky, or the ceiling, do nothing in particular', d: 'No phone, no goal beyond ten minutes horizontal. Let your eyes go soft and your mind wander.', cat: 'rest', moods: ['bored', 'curious', 'inspired', 'lonely'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'either', cost: 'free',
    why: { bored: 'Boredom is often just asking for stillness without a screen — give it exactly that and see where your mind wanders.', curious: 'An empty ten minutes is where curiosity gets loud enough to actually hear — nothing to solve, just notice.', inspired: 'Let the spark sit instead of chasing it immediately. The good ideas often surface right after you stop reaching for them.', lonely: "You don't need company to stop feeling like you have to perform — just permission to lie still and be exactly as you are." } },
  { id: 'build-a-blanket-fort-and-lounge-in-it', t: "Build a blanket fort and lounge in it", d: "Cushions, a blanket over two chairs, whatever you've got. Then just be inside it for a while.", cat: 'rest', moods: ['playful', 'bored'], e: 'low', time: 60, soc: ['solo', 'someone', 'group'], place: 'indoor', cost: 'free',
    why: { playful: "A blanket fort is permission to be a little ridiculous about your own comfort — that's the whole point.", bored: "It's a tiny, silly project with an immediate, cozy reward." } },
  { id: 'buy-the-interesting-snack-drink-or-small', t: "Buy the interesting snack, drink, or small thing you've been eyeing", d: 'No occasion needed. Get the strange soda, the specialty tea, the thing that made you curious in the store.', cat: 'indulge', moods: ['curious', 'inspired', 'bored'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'either', cost: 'cheap',
    why: { curious: "Following a small, harmless curiosity all the way to 'yes, I'll try it' is its own kind of reward.", inspired: 'A small, unplanned treat matches the spontaneity of the feeling — enjoy it without needing it to mean anything.', bored: 'A tiny, deliberate treat gives a flat afternoon one genuinely good moment.' } },
  { id: 'rearrange-or-refresh-one-small-corner-of', t: 'Rearrange or refresh one small corner of your space', d: 'A shelf, your desk, the nightstand. Just one corner, made to look the way you actually want it to.', cat: 'reset', moods: ['inspired', 'curious', 'lonely', 'playful', 'bored'], e: 'medium', time: 60, soc: ['solo', 'someone'], place: 'indoor', cost: 'free',
    why: { inspired: 'Shaping a small piece of your space to match how you feel is a tiny, physical way to act on the spark before it fades.', curious: 'Rearranging forces you to actually look at your things again instead of seeing them out of habit.', lonely: 'Making one corner feel intentional is a quiet way to take care of yourself when no one else is around.', playful: 'Doing it purely for the vibe, no practical reason required, is basically permission to play.', bored: 'A small, visible change is a satisfying dent in a flat afternoon.' } },
  { id: 'go-for-a-walk-and-photograph-five-things', t: 'Go for a walk and photograph five things that catch your eye', d: 'No plan, no destination. Just wander and stop for whatever looks interesting.', cat: 'move', moods: ['curious', 'lonely', 'bored'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'outdoor', cost: 'free',
    why: { curious: 'Hunting for five interesting things turns an ordinary walk into an actual search — curiosity loves a small task.', lonely: 'Moving through the world with a tiny mission makes solo time feel chosen instead of just empty.', bored: 'A built-in scavenger hunt gives a walk somewhere to point its attention.' } },
  { id: 'get-an-iced-drink-or-snack-and-people-wa', t: 'Get an iced drink or snack and people-watch for ten minutes', d: 'Somewhere with a bit of foot traffic. No agenda beyond the treat and the view.', cat: 'indulge', moods: ['restless', 'bored'], e: 'low', time: 15, soc: ['solo', 'someone'], place: 'outdoor', cost: 'cheap',
    why: { restless: 'A small treat with somewhere to sit and watch gives restless energy a reason to slow down for a minute.', bored: 'People-watching turns a boring ten minutes into low-key entertainment, snack included.' } },
  { id: 'try-a-new-to-you-sport-or-class-full-eff', t: "Try a new-to-you sport or class, full effort", d: "Climbing, spin, martial arts, anything you haven't tried. Show up and actually go hard.", cat: 'move', moods: ['curious', 'content', 'playful'], e: 'high', time: 60, soc: ['solo', 'someone', 'group'], place: 'either', cost: 'cheap',
    why: { curious: "Full physical effort at something brand-new answers 'what's that like' in the most direct way possible.", content: "You've got the steadiness to try something hard and enjoy the effort itself, win or not.", playful: 'Throwing yourself into something new and physical is play in its most literal form.' } },
];
