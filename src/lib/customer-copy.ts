import type { Charger } from '@/constants/chargers';

/** Customer-facing labels — no technical security details. */
export function customerStatusLabel(status: Charger['status']) {
  switch (status) {
    case 'SAFE':
      return 'Verified';
    case 'CAUTION':
      return 'Use with care';
    case 'COMPROMISED':
      return 'Not recommended';
    default:
      return 'Checked';
  }
}

export function customerStatusColor(status: Charger['status']) {
  switch (status) {
    case 'SAFE':
      return '#00B89C';
    case 'CAUTION':
      return '#F5A623';
    case 'COMPROMISED':
      return '#FF3B30';
    default:
      return '#6B6B76';
  }
}

/**
 * Plain-language station summary for drivers.
 * Vague on purpose — no CVEs, firmware, protocols, or exploit details.
 */
export function customerChargerSummary(charger: Charger) {
  switch (charger.status) {
    case 'SAFE':
      return 'EcoShield verified this station against known malware and vulnerabilities that could steal personal or payment details, or put your EV at risk.';
    case 'CAUTION':
      return 'This station passed a basic review, but we suggest choosing a verified station nearby if you can.';
    case 'COMPROMISED':
      return 'We recommend skipping this station. Pick a verified charger nearby instead.';
    default:
      return 'EcoShield reviews stations to help protect your vehicle and personal information while you charge.';
  }
}

export function customerChargerTitle(charger: Charger) {
  if (/test rig|node #|everest/i.test(charger.name) && charger.status !== 'SAFE') {
    return 'Charging station nearby';
  }
  return charger.name;
}

/** Plain-language plug names for everyday drivers. */
export function customerPlugLabel(plug: string) {
  switch (plug.trim().toUpperCase()) {
    case 'CCS':
    case 'CCS1':
    case 'CCS2':
      return 'Fast charge (CCS)';
    case 'NACS':
      return 'Tesla plug (NACS)';
    case 'TYPE 2':
    case 'TYPE2':
      return 'Standard plug';
    case 'TYPE 1':
    case 'J1772':
      return 'Standard plug (J1772)';
    case 'CHADEMO':
      return 'Fast charge (CHAdeMO)';
    default:
      return plug;
  }
}

export function customerPlugsLabel(plugs: string[] | undefined) {
  if (!plugs?.length) {
    return null;
  }
  return plugs.map(customerPlugLabel).join(' · ');
}

/**
 * Rough “typical top-up” time for everyday drivers (not a precise calculator).
 * Assumes a common EV getting a partial charge, not empty → full.
 */
export function customerChargeTimeEstimate(charger: Charger): string | null {
  const match = charger.power?.match(/(\d+(?:\.\d+)?)\s*kW/i);
  if (!match) {
    return null;
  }

  const kw = Number(match[1]);
  if (!Number.isFinite(kw) || kw <= 0) {
    return null;
  }

  if (kw >= 250) {
    return 'Est. charge time: about 10–15 min';
  }
  if (kw >= 100) {
    return 'Est. charge time: about 20–30 min';
  }
  if (kw >= 40) {
    return 'Est. charge time: about 45–60 min';
  }
  if (kw >= 20) {
    return 'Est. charge time: about 1.5–2.5 hours';
  }
  return 'Est. charge time: about 3–5 hours';
}

/** Soften raw power strings for the station sheet. */
export function customerPowerLabel(power: string | undefined) {
  if (!power) {
    return null;
  }
  const match = power.match(/(\d+(?:\.\d+)?)\s*kW/i);
  const kw = match ? Number(match[1]) : null;

  if (kw != null && kw >= 250) {
    return 'Ultra-fast charging';
  }
  if (kw != null && kw >= 100) {
    return 'Fast charging';
  }
  if (kw != null && kw >= 40) {
    return 'Quick charging';
  }
  if (/ac/i.test(power)) {
    return 'Standard charging';
  }
  return power;
}

/** Stable demo “last checked” time derived from station id (not live telemetry). */
export function customerLastCheckedLabel(charger: Charger, now = Date.now()): string {
  let hash = 0;
  for (let i = 0; i < charger.id.length; i += 1) {
    hash = (hash + charger.id.charCodeAt(i) * (i + 1)) % 97;
  }

  const hoursAgo = 1 + (hash % 10);
  const checkedAt = now - hoursAgo * 60 * 60 * 1000;
  const diffMs = Math.max(0, now - checkedAt);
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 60) {
    return minutes <= 1 ? 'Last checked just now' : `Last checked ${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? 'Last checked 1 hour ago' : `Last checked ${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? 'Last checked yesterday' : `Last checked ${days} days ago`;
}

export const ABOUT_ECOSHIELD = [
  'EcoShield helps you find EV charging stations that have been verified for common digital risks.',
  'We look for signs of malware and vulnerabilities that could expose personal or financial information, or interfere with your vehicle while charging.',
  'You get a simple go / no-go for everyday drivers — not a technical security report.',
] as const;
