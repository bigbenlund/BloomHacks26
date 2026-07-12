/** Session greetings — Uber / ChatGPT style. Time-of-day always includes “Good …”. */

const MORNING_GREETINGS = [
  'Good morning',
  'Good morning — glad you’re here',
  'Good morning — ready when you are',
  'Hope you have a good morning',
  'Good morning — let’s find a charge',
] as const;

const AFTERNOON_GREETINGS = [
  'Good afternoon',
  'Good afternoon — glad you’re here',
  'Good afternoon — ready when you are',
  'Hope you’re having a good afternoon',
  'Good afternoon — let’s find a charge',
] as const;

const EVENING_GREETINGS = [
  'Good evening',
  'Good evening — glad you’re here',
  'Good evening — ready when you are',
  'Hope you’re having a good evening',
  'Good evening — let’s find a charge',
] as const;

/** Rotating supporting lines — warm, short, station-locator flavored. */
const TAGLINES = [
  'Find a verified station near you.',
  'Ready when you need a safe charge.',
  'Let’s find a clean charge nearby.',
  'A good day for an easy top-up.',
  'Safe stations. Simple checks. You’re set.',
  'One quick stop — already verified.',
  'Charge with less worry.',
  'Your next station, already checked.',
  'Wherever you are, start with a verified charger.',
  'Battery low? We’ve got nearby options.',
  'What’s the plan for a charge today?',
  'Tap a pin to see a station EcoShield has reviewed.',
] as const;

/** One seed per app open so greeting + tagline stay until reload. */
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
