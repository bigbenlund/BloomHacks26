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

// Default Santa Monica dataset in canonical reconciled schema
const defaultSantaMonicaData = [
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
    
    // Custom JSON from backend build-chargers is already in canonical schema format!
    chargerData = parsedData.map((item, index) => {
      return {
        id: String(item.id || `node-${index}`),
        name: item.name || 'Unnamed Station',
        location: item.location || { lat: 28.6024, lng: -81.2001 },
        status: item.status || 'SAFE',
        risk: typeof item.risk === 'number' ? item.risk : 0,
        recommendation: item.recommendation || 'No advisories',
        findings: Array.isArray(item.findings) ? item.findings : [],
        driver_summary: item.driver_summary || item.recommendation || 'This station is fully verified secure.',
        firmware: item.firmware || 'EVerest v24.2.1',
        log_file: item.log_file || 'simulated',
        telemetry: item.telemetry,
        power: item.power || (item.telemetry && item.telemetry.event_count ? `Log Events: ${item.telemetry.event_count}` : '150 kW DC Fast'),
        plugs: Array.isArray(item.plugs) ? item.plugs : ['CCS2', 'NACS'],
        price: item.price || '$0.30/kWh',
        address: item.address || `${item.name || 'Orlando Node'} - Orlando Grid Node`,
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
  
  // 1. Clear old documents in 'chargers' first
  console.log("Clearing existing documents in 'chargers' collection...");
  const collectionRef = db.collection('chargers');
  const snapshot = await collectionRef.get();
  
  const deletePromises = [];
  snapshot.forEach(doc => {
    deletePromises.push(doc.ref.delete());
  });
  await Promise.all(deletePromises);
  console.log(`Cleared ${snapshot.size} existing documents.`);

  // 2. Add new documents
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
