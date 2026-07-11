import type { Charger } from '@/constants/chargers';

/** Customer-facing labels — no technical security details. */
export function customerStatusLabel(status: Charger['status']) {
  switch (status) {
    case 'SAFE':
      return 'Looks good';
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
 * Never expose CVE codes, firmware versions, protocols, or exploit details.
 */
export function customerChargerSummary(charger: Charger) {
  switch (charger.status) {
    case 'SAFE':
      return 'EcoShield checked this station and it looks safe to use for charging.';
    case 'CAUTION':
      return 'This station passed our basic checks, but we suggest choosing another if you can.';
    case 'COMPROMISED':
      return 'We recommend skipping this station and picking a safer one nearby.';
    default:
      return 'EcoShield reviewed this station for your safety.';
  }
}

export function customerChargerTitle(charger: Charger) {
  // Prefer friendly public names; avoid sounding like internal/test nodes
  if (/test rig|node #|everest/i.test(charger.name) && charger.status !== 'SAFE') {
    return 'Charging station nearby';
  }
  return charger.name;
}
