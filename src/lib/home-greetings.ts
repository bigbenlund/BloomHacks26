/** Session greetings — ChatGPT/Uber style, driving & charging themed. */

const MORNING_GREETINGS = [
  'Good morning',
  'Rise and charge',
  'Morning',
  'Hey',
] as const;

const AFTERNOON_GREETINGS = [
  'Good afternoon',
  'Hey',
  'Welcome back',
  'Ready when you are',
] as const;

const EVENING_GREETINGS = [
  'Good evening',
  'Hey',
  'Welcome back',
  'Evening',
] as const;

const TAGLINES = [
  'Where are you headed?',
  'Let’s find a clean charge for the road ahead.',
  'A good day for an easy top-up.',
  'Safe roads. Solid charge. You’re set.',
  'Keep the wheels turning — we’ll watch the station.',
  'One quick stop, then back on your way.',
  'Make today a smooth drive.',
  'Fuel the day without the worry.',
  'Your next charge, already checked.',
  'Wherever you’re going, start charged.',
  'Take the scenic route — we’ve got the station.',
  'Battery low? We’ve got you.',
] as const;

/** One seed per app open so the greeting stays until reload. */
let sessionSeed: number | null = null;

function getSessionSeed() {
  if (sessionSeed == null) {
    sessionSeed = Date.now();
  }
  return sessionSeed;
}

function hourBucket(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) {
    return 'morning' as const;
  }
  if (hour < 17) {
    return 'afternoon' as const;
  }
  return 'evening' as const;
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

export type HomeGreeting = {
  lead: string;
  firstName: string;
  tagline: string;
};

export function buildHomeGreeting(displayName: string | null | undefined): HomeGreeting {
  const firstName = displayName?.trim().split(/\s+/)[0] || 'there';
  const seed = getSessionSeed();
  const bucket = hourBucket();
  const greetings =
    bucket === 'morning'
      ? MORNING_GREETINGS
      : bucket === 'afternoon'
        ? AFTERNOON_GREETINGS
        : EVENING_GREETINGS;

  return {
    lead: pick(greetings, seed),
    firstName,
    tagline: pick(TAGLINES, Math.floor(seed / 1000) + 7),
  };
}
