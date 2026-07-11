export interface SecurityAlert {
  cve: string;
  score: number;
  title: string;
  details: string;
  recommendation: string;
}

export interface Charger {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'secure' | 'compromised';
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  power: string;
  plugs: string[];
  price: string;
  address: string;
  securityAlert?: SecurityAlert;
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
    latitude: 34.0194,
    longitude: -118.4912,
    status: 'secure',
    riskLevel: 'none',
    power: '350 kW Ultra Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.34/kWh',
    address: '400 Colorado Ave, Santa Monica, CA 90401',
    securityAlert: {
      cve: 'SECURE-NODE-001',
      score: 0.0,
      title: 'EVerest Core Protected Node',
      details: 'All firmware signatures match the secure hardware root of trust. Connection is fully encrypted over OCPP 2.0.1 using TLS 1.3. Real-time log monitoring active and verified clean.',
      recommendation: 'Perfect security health. No threat vectors active. Recommended charging station.'
    }
  },
  {
    id: 'charger-2',
    name: 'EVerest Node #42 (Ocean Ave)',
    latitude: 34.0115,
    longitude: -118.4950,
    status: 'compromised',
    riskLevel: 'critical',
    power: '150 kW DC Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.28/kWh',
    address: '1515 Ocean Ave, Santa Monica, CA 90401',
    securityAlert: {
      cve: 'CVE-2023-4512',
      score: 9.6,
      title: 'RFID Card Cloning & Replay Exploit',
      details: 'Vulnerable firmware version runs insecure ISO 15118 RFID handshakes. Attackers can clone valid driver RFIDs by passive listening and replay them to charge at the grid expense. Active intrusion detected in EVerest logs: multiple brute-force RFID card failures.',
      recommendation: 'CRITICAL RISK. Avoid this station. Third party may gain access to vehicle billing accounts.'
    }
  },
  {
    id: 'charger-3',
    name: 'Silicon Beach EV Hub',
    latitude: 34.0252,
    longitude: -118.4830,
    status: 'secure',
    riskLevel: 'none',
    power: '150 kW DC Fast',
    plugs: ['CCS2'],
    price: '$0.31/kWh',
    address: '2525 Wilshire Blvd, Santa Monica, CA 90403',
    securityAlert: {
      cve: 'SECURE-NODE-002',
      score: 0.0,
      title: 'OCPP 2.0.1 Encrypted Connection',
      details: 'Secure WebSocket (WSS) and JSON schema verification active. Root certificate verified.',
      recommendation: 'Safe to use. Encryption certificates are up-to-date.'
    }
  },
  {
    id: 'charger-4',
    name: 'Colorado Court Secure Node',
    latitude: 34.0150,
    longitude: -118.4750,
    status: 'secure',
    riskLevel: 'low',
    power: '50 kW DC Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.29/kWh',
    address: '1800 Colorado Ave, Santa Monica, CA 90404',
    securityAlert: {
      cve: 'CVE-2024-1188',
      score: 3.2,
      title: 'Minor Firmware Out-of-Date Alert',
      details: 'Firmware hash mismatch: minor version runs EVerest v24.1.2 instead of the latest v24.2.1. However, all encryption handshakes are intact and safe. No active exploit signatures seen in system logs.',
      recommendation: 'Low threat. Safe to charge, though minor security updates are pending.'
    }
  },
  {
    id: 'charger-5',
    name: 'Lincoln Blvd Retrofit Node',
    latitude: 34.0289,
    longitude: -118.4710,
    status: 'compromised',
    riskLevel: 'high',
    power: '150 kW DC Fast',
    plugs: ['CCS2', 'NACS'],
    price: '$0.35/kWh',
    address: '1000 Lincoln Blvd, Santa Monica, CA 90403',
    securityAlert: {
      cve: 'CVE-2024-3812',
      score: 8.4,
      title: 'Unencrypted OCPP 1.6 Handshake',
      details: 'Unencrypted handshakes over standard HTTP WebSocket port 80. Network sniffer can intercept charging commands, start/stop charge sessions, and access billing details. Active Man-in-the-Middle (MitM) arp spoofing detected on local switch.',
      recommendation: 'HIGH RISK. Unencrypted connection allows billing credential extraction.'
    }
  },
  {
    id: 'charger-6',
    name: 'EVerest Test Rig #7 (Intrusion Node)',
    latitude: 34.0335,
    longitude: -118.4805,
    status: 'compromised',
    riskLevel: 'critical',
    power: '22 kW AC',
    plugs: ['Type 2'],
    price: '$0.22/kWh',
    address: '1200 Arizona Ave, Santa Monica, CA 90404',
    securityAlert: {
      cve: 'CVE-2024-9021',
      score: 9.8,
      title: 'Active OCPP Session Hijack Exploit',
      details: 'OCPP session tokens are insecurely generated and can be predicted. Multiple connections originating from external rogue IPs with cloned token hashes have been recorded. System firmware shows memory injection attempt on the OCPP processing loop.',
      recommendation: 'CRITICAL RISK. Malicious firmware exploit actively running. Vehicle onboard chargers may be damaged by power surge commands.'
    }
  }
];
