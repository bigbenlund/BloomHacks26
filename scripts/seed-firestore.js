/**
 * EcoShield SecureRoute - Firestore Seeding Utility (Modular Admin SDK Version)
 * 
 * To run this script with a custom JSON file:
 *   node scripts/seed-firestore.js ./backend/chargers.json
 * 
 * If no argument is provided, it defaults to seeding the 6 Santa Monica template nodes.
 */

const { initializeApp, cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: service-account.json not found at project root.');
  console.error('Please download your Service Account Key from Firebase Console and place it at the project root.\n');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

console.log(`Initializing Firebase Admin for project: "${serviceAccount.project_id}"...`);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Default Santa Monica dataset
const defaultSantaMonicaData = [
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

// Determine input dataset
let chargerData = defaultSantaMonicaData;
const customPathArg = process.argv[2];

if (customPathArg) {
  const resolvedPath = path.resolve(process.cwd(), customPathArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\n❌ ERROR: Custom JSON file not found at path: "${resolvedPath}"\n`);
    process.exit(1);
  }
  
  try {
    const rawContent = fs.readFileSync(resolvedPath, 'utf8');
    const parsedData = JSON.parse(rawContent);
    
    if (!Array.isArray(parsedData)) {
      throw new Error("JSON file root must be an array of charger objects.");
    }
    
    // Auto-convert schemas on the fly if backend-formatted data is detected
    chargerData = parsedData.map((item, index) => {
      // Check if it is backend-formatted (has .location but no flat .latitude)
      const isBackendSchema = item.location && typeof item.location.lat === 'number' && typeof item.latitude !== 'number';
      
      if (isBackendSchema) {
        // Map STATUS: SAFE -> secure, WARNING -> compromised, COMPROMISED -> compromised
        let status = 'secure';
        if (item.status === 'WARNING' || item.status === 'COMPROMISED') {
          status = 'compromised';
        }

        let riskLevel = 'none';
        if (item.status === 'WARNING') {
          riskLevel = 'high';
        } else if (item.status === 'COMPROMISED') {
          riskLevel = 'critical';
        }

        // Compile findings detail summaries
        let details = item.recommendation || 'No major findings.';
        if (item.findings && item.findings.length > 0) {
          details = item.findings.map((f) => `${f.title}\nSeverity: ${f.severity} | Risk: +${f.risk_points} pts\nEvidence: ${f.evidence}`).join('\n\n');
        }

        return {
          id: String(item.id || `orlando-${index}`),
          name: item.name || `Orlando Node #${index}`,
          latitude: item.location.lat,
          longitude: item.location.lng,
          status: status,
          riskLevel: riskLevel,
          power: item.telemetry && item.telemetry.event_count ? `Log Events: ${item.telemetry.event_count}` : '150 kW DC Fast',
          plugs: ['CCS2', 'NACS'],
          price: '$0.30/kWh',
          address: (item.name || 'Orlando Node') + ' - Orlando Grid Node',
          securityAlert: {
            cve: item.findings && item.findings.length > 0 ? item.findings[0].code : (item.status === 'SAFE' ? 'SECURE-NODE' : 'VULN-NODE'),
            score: (item.risk || 0) / 10,
            title: item.findings && item.findings.length > 0 ? item.findings[0].title : (item.status === 'SAFE' ? 'Grid-Secure Firmware Verified' : 'Vulnerable Firmware Profile'),
            details: details,
            recommendation: item.recommendation || 'No advisories'
          }
        };
      }
      
      // If it's already in the frontend schema format, return as is
      return {
        id: String(item.id || `node-${index}`),
        name: item.name || 'Unnamed Station',
        latitude: item.latitude || 34.0,
        longitude: item.longitude || -118.0,
        status: item.status === 'compromised' ? 'compromised' : 'secure',
        riskLevel: item.riskLevel || 'none',
        power: item.power || '150 kW DC Fast',
        plugs: Array.isArray(item.plugs) ? item.plugs : ['CCS2', 'NACS'],
        price: item.price || '$0.30/kWh',
        address: item.address || 'Santa Monica, CA',
        securityAlert: item.securityAlert ? {
          cve: item.securityAlert.cve || 'N/A',
          score: typeof item.securityAlert.score === 'number' ? item.securityAlert.score : 0,
          title: item.securityAlert.title || 'Protected Firmware',
          details: item.securityAlert.details || 'No security alerts.',
          recommendation: item.securityAlert.recommendation || 'Perfect security compliance.'
        } : undefined
      };
    });
    
    console.log(`✅ Loaded and parsed custom dataset from: "${resolvedPath}" (${chargerData.length} records processed).`);
  } catch (err) {
    console.error(`\n❌ ERROR: Failed to parse custom JSON file:`, err.message, `\n`);
    process.exit(1);
  }
} else {
  console.log('💡 Information: No custom JSON file specified. Seeding standard Santa Monica mock dataset.');
}

async function seed() {
  console.log(`\n🚀 Starting admin database seeding to collection "chargers" (total: ${chargerData.length} records)...`);
  
  for (const charger of chargerData) {
    try {
      const docRef = db.collection('chargers').doc(charger.id);
      await docRef.set(charger);
      console.log(`  🔹 Seeded document [${charger.id}]: "${charger.name}"`);
    } catch (err) {
      console.error(`  ❌ Failed to seed document [${charger.id}]:`, err);
    }
  }

  console.log('\n🎉 Admin seeding process completed successfully!\n');
  process.exit(0);
}

seed();
