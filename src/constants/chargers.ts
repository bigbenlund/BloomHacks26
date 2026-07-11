export interface Finding {
  code: string;
  title: string;
  severity: string; // LOW | MEDIUM | HIGH | CRITICAL
  evidence: string;
}

export interface Telemetry {
  event_count?: number;
  duration_seconds?: number;
  current_demand_requests?: number;
  current_demand_responses?: number;
  session_finished?: boolean;
  transaction_finished?: boolean;
}

export interface Charger {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'SAFE' | 'CAUTION' | 'COMPROMISED';
  risk: number; // 0-100
  recommendation: string;
  findings: Finding[];
  driver_summary?: string;
  firmware?: string;
  log_file?: string;
  telemetry?: Telemetry;
  // Fallbacks for display
  power?: string;
  plugs?: string[];
  price?: string;
  address?: string;
}

export const USER_START_LOCATION = {
  latitude: 34.0094,
  longitude: -118.4973,
  address: "Santa Monica Pier, CA"
};

export const chargerData: Charger[] = [
  {
    id: 'charger-1',
    name: 'EcoShield Santa Monica Central',
    location: { lat: 34.0194, lng: -118.4912 },
    status: 'SAFE',
    risk: 0,
    recommendation: 'Perfect security health. No threat vectors active. Recommended charging station.',
    findings: [],
    driver_summary: 'This charging station is fully secured with verified encrypted handshakes. All security systems are green and safe to connect.',
    firmware: 'EVerest v24.2.1',
    log_file: 'santa_monica_central_logs.csv',
    power: '350 kW Ultra Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.34/kWh',
    address: '400 Colorado Ave, Santa Monica, CA 90401',
  },
  {
    id: 'charger-2',
    name: 'EVerest Node #42 (Ocean Ave)',
    location: { lat: 34.0115, lng: -118.4950 },
    status: 'COMPROMISED',
    risk: 96,
    recommendation: 'CRITICAL RISK. Avoid this station. Third party may gain access to vehicle billing accounts.',
    findings: [
      {
        code: 'CVE-2023-4512',
        title: 'RFID Card Cloning & Replay Exploit',
        severity: 'CRITICAL',
        evidence: 'Vulnerable firmware version runs insecure ISO 15118 RFID handshakes. Attackers can clone valid driver RFIDs by passive listening and replay them.'
      }
    ],
    driver_summary: 'Do not use this station. The charger is running an outdated firmware version vulnerable to RFID cloning, and multiple authentication failures have been flagged.',
    firmware: 'EVerest v24.1.2',
    log_file: 'everest_node_42_ocean.csv',
    power: '150 kW DC Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.28/kWh',
    address: '1515 Ocean Ave, Santa Monica, CA 90401',
  },
  {
    id: 'charger-3',
    name: 'Silicon Beach EV Hub',
    location: { lat: 34.0252, lng: -118.4830 },
    status: 'SAFE',
    risk: 0,
    recommendation: 'Safe to use. Encryption certificates are up-to-date.',
    findings: [],
    driver_summary: 'All connection and OCPP handshake components are running with strict TLS encryption. No vulnerabilities or anomalies detected.',
    firmware: 'EVerest v24.2.1',
    log_file: 'silicon_beach_hub.csv',
    power: '150 kW DC Fast',
    plugs: ['CCS2'],
    price: '$0.31/kWh',
    address: '2525 Wilshire Blvd, Santa Monica, CA 90403',
  },
  {
    id: 'charger-4',
    name: 'Colorado Court Secure Node',
    location: { lat: 34.0150, lng: -118.4750 },
    status: 'CAUTION',
    risk: 32,
    recommendation: 'Low threat. Safe to charge, though minor security updates are pending.',
    findings: [
      {
        code: 'CVE-2024-1188',
        title: 'Minor Firmware Out-of-Date Alert',
        severity: 'LOW',
        evidence: 'Firmware hash mismatch: minor version runs EVerest v24.1.2 instead of the latest v24.2.1. However, all encryption handshakes are intact and safe. No active exploit signatures seen in system logs.'
      }
    ],
    driver_summary: 'This charger is running an older firmware release. While its encryption is active and intact, a non-critical software update is pending.',
    firmware: 'EVerest v24.1.2',
    log_file: 'colorado_court_logs.csv',
    power: '50 kW DC Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.29/kWh',
    address: '1800 Colorado Ave, Santa Monica, CA 90404',
  },
  {
    id: 'charger-5',
    name: 'Lincoln Blvd Retrofit Node',
    location: { lat: 34.0289, lng: -118.4710 },
    status: 'COMPROMISED',
    risk: 84,
    recommendation: 'HIGH RISK. Unencrypted connection allows billing credential extraction.',
    findings: [
      {
        code: 'CVE-2024-3812',
        title: 'Unencrypted OCPP 1.6 Handshake',
        severity: 'HIGH',
        evidence: 'Unencrypted handshakes over standard HTTP WebSocket port 80. Network sniffer can intercept charging commands, start/stop charge sessions, and access billing details. Active Man-in-the-Middle (MitM) arp spoofing detected on local switch.'
      }
    ],
    driver_summary: 'Avoid utilizing this charger if possible. It is communicating over an insecure, unencrypted WebSocket protocol, making it vulnerable to local packet interception.',
    firmware: 'EVerest v1.2.0',
    log_file: 'lincoln_blvd_logs.csv',
    power: '150 kW DC Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.35/kWh',
    address: '1000 Lincoln Blvd, Santa Monica, CA 90403',
  },
  {
    id: 'charger-6',
    name: 'EVerest Test Rig #7 (Intrusion Node)',
    location: { lat: 34.0335, lng: -118.4805 },
    status: 'COMPROMISED',
    risk: 98,
    recommendation: 'CRITICAL RISK. Malicious firmware exploit actively running. Vehicle onboard chargers may be damaged by power surge commands.',
    findings: [
      {
        code: 'CVE-2024-9021',
        title: 'Active OCPP Session Hijack Exploit',
        severity: 'CRITICAL',
        evidence: 'OCPP session tokens are insecurely generated and can be predicted. Multiple connections originating from external rogue IPs with cloned token hashes have been recorded. System firmware shows memory injection attempt on the OCPP processing loop.'
      }
    ],
    driver_summary: 'Do not connect your vehicle to this station. Security systems have flagged an active session-hijacking attempt on the EVerest charger rig, posing risk to connected electronics.',
    firmware: 'EVerest v1.3.1',
    log_file: 'everest_test_rig_7_logs.csv',
    power: '22 kW AC',
    plugs: ['Type 2'],
    price: '$0.22/kWh',
    address: '1200 Arizona Ave, Santa Monica, CA 90404',
  }
];
