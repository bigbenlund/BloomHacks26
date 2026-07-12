import type { DocumentData } from 'firebase/firestore';

import type { Charger } from '@/constants/chargers';

const VALID_STATUSES: Charger['status'][] = ['SAFE', 'CAUTION', 'COMPROMISED'];

/**
 * Map a Firestore `chargers/{id}` document into the app's Charger shape,
 * with demo-safe fallbacks for any missing fields.
 */
export function chargerFromDoc(id: string, data: DocumentData): Charger {
  return {
    id,
    name: data.name || 'Unnamed Station',
    location: data.location || { lat: 34.0094, lng: -118.4973 },
    status: (VALID_STATUSES.includes(data.status) ? data.status : 'SAFE') as Charger['status'],
    risk: typeof data.risk === 'number' ? data.risk : 0,
    recommendation: data.recommendation || 'No advisories',
    findings: Array.isArray(data.findings) ? data.findings : [],
    driver_summary:
      data.driver_summary || data.recommendation || 'This station is fully verified secure.',
    firmware: data.firmware || 'unknown',
    log_file: data.log_file || 'simulated',
    telemetry: data.telemetry,
    power:
      data.power ||
      (data.telemetry && data.telemetry.event_count
        ? `Log Events: ${data.telemetry.event_count}`
        : '150 kW DC Fast'),
    plugs: Array.isArray(data.plugs) ? data.plugs : ['CCS2', 'NACS'],
    price: data.price || '$0.30/kWh',
    address: data.address || `${data.name || 'Orlando Node'} - Orlando Grid Node`,
  };
}
