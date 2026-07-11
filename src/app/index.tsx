import React, { useState, useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EVMap } from '@/components/ev-map';
import { Charger } from '@/constants/chargers';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const DEFAULT_COORDS = { latitude: 34.0094, longitude: -118.4973 }; // Fallback: Santa Monica Pier

const createMockChargers = (lat: number, lng: number): Charger[] => {
  return [
    {
      id: 'charger-1',
      name: '⚡ EcoShield Secure Station (Alpha)',
      latitude: lat + 0.006,
      longitude: lng + 0.008,
      status: 'secure',
      riskLevel: 'none',
      power: '350 kW Ultra Fast',
      plugs: ['CCS2', 'NACS'],
      price: '$0.34/kWh',
      address: 'Route Safe Node Alpha',
      securityAlert: {
        cve: 'ISO-15118 SECURE',
        score: 0.0,
        title: 'Certified Grid Secure',
        details: 'Connection uses fully verified ISO 15118 certificates with secure TLS 1.3 cryptographic handshakes. Protected against RFID eavesdropping and injection attacks.',
        recommendation: 'Safe to connect and charge at maximum speeds.'
      }
    },
    {
      id: 'charger-2',
      name: '🚨 Compromised Charger #42 (Vulnerable)',
      latitude: lat - 0.008,
      longitude: lng - 0.005,
      status: 'compromised',
      riskLevel: 'critical',
      power: '150 kW DC Fast',
      plugs: ['CCS1', 'CCS2'],
      price: '$0.28/kWh',
      address: 'High-Risk Station #42',
      securityAlert: {
        cve: 'CVE-2023-4512',
        score: 9.6,
        title: 'RFID Cloning & Replay Risk',
        details: 'Vulnerable firmware version runs insecure, unencrypted ISO 15118 RFID handshakes. Passive eavesdroppers nearby can easily intercept and clone user RFIDs to charge legacy vehicles fraudulently.',
        recommendation: 'CRITICAL WARNING. Avoid utilizing this charger to prevent token theft.'
      }
    },
    {
      id: 'charger-3',
      name: '⚡ EcoShield Secure Station (Beta)',
      latitude: lat - 0.005,
      longitude: lng + 0.012,
      status: 'secure',
      riskLevel: 'none',
      power: '250 kW Supercharger',
      plugs: ['NACS'],
      price: '$0.36/kWh',
      address: 'Route Safe Node Beta',
      securityAlert: {
        cve: 'OCPP-2.0.1 SECURE',
        score: 0.0,
        title: 'Certified Grid Secure',
        details: 'EVerest firmware enforces encrypted OCPP 2.0.1 messages over standard TLS sockets. Safe against packet sniffing.',
        recommendation: 'Safe to charge.'
      }
    },
    {
      id: 'charger-4',
      name: '🚨 Compromised Charger #19 (Vulnerable)',
      latitude: lat + 0.012,
      longitude: lng - 0.010,
      status: 'compromised',
      riskLevel: 'high',
      power: '50 kW AC Charge',
      plugs: ['Type 2'],
      price: '$0.22/kWh',
      address: 'High-Risk Station #19',
      securityAlert: {
        cve: 'CVE-2024-3812',
        score: 8.4,
        title: 'Unencrypted OCPP Handshakes',
        details: 'OCPP messages fall back to unencrypted HTTP WebSocket (ws://) on port 80. Exposes active session billing tokens to MITM local area packet sniffing.',
        recommendation: 'HIGH RISK. Use only in emergency scenarios.'
      }
    },
    {
      id: 'charger-5',
      name: '⚡ EcoShield Secure Station (Gamma)',
      latitude: lat + 0.009,
      longitude: lng - 0.004,
      status: 'secure',
      riskLevel: 'none',
      power: '150 kW DC Fast',
      plugs: ['CCS2', 'NACS'],
      price: '$0.30/kWh',
      address: 'Route Safe Node Gamma',
      securityAlert: {
        cve: 'SECURE-NODE-005',
        score: 0.0,
        title: 'Certified Grid Secure',
        details: 'Runs fortified modular EVerest firmware with CSPRNG token security. Connection integrity is verified.',
        recommendation: 'Safe to charge.'
      }
    },
    {
      id: 'charger-6',
      name: '🚨 Compromised Charger #81 (Vulnerable)',
      latitude: lat - 0.011,
      longitude: lng + 0.006,
      status: 'compromised',
      riskLevel: 'critical',
      power: '150 kW DC Fast',
      plugs: ['CCS2'],
      price: '$0.32/kWh',
      address: 'High-Risk Station #81',
      securityAlert: {
        cve: 'CVE-2024-9021',
        score: 9.8,
        title: 'OCPP Session Hijacking',
        details: 'Weak token prediction algorithms in outdated charging firmwares allow active session hijacking and remote control of charge limits.',
        recommendation: 'CRITICAL WARNING. Do not connect.'
      }
    }
  ];
};

export default function SecurityDashboardScreen() {
  const theme = useTheme();

  // Coordinates state from actual browser geolocation
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (typeof window !== 'undefined' && !navigator.geolocation) {
      return DEFAULT_COORDS;
    }
    return null;
  });
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [routeToCharger, setRouteToCharger] = useState<Charger | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && !navigator.geolocation) {
      return 'GPS UNSUPPORTED - FALLBACK';
    }
    return 'ACQUIRING POSITION...';
  });

  // Request browser geolocation on mount and fetch Firestore chargers
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const loadLocalFallback = (lat: number, lng: number) => {
      const mockList = createMockChargers(lat, lng);
      setChargers(mockList);
    };

    const loadFromFirestore = (userLat: number, userLng: number) => {
      setGpsStatus('CONNECTING TO FIRESTORE...');
      try {
        const chargersCol = collection(db, 'chargers');
        
        // Listen to active updates in Firestore
        const unsubscribe = onSnapshot(chargersCol, (snapshot) => {
          if (!snapshot.empty) {
            const list: Charger[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              list.push({
                id: doc.id,
                name: data.name || 'Unnamed Station',
                latitude: typeof data.latitude === 'number' ? data.latitude : userLat,
                longitude: typeof data.longitude === 'number' ? data.longitude : userLng,
                status: data.status === 'compromised' ? 'compromised' : 'secure',
                riskLevel: data.riskLevel || 'none',
                power: data.power || '150 kW DC Fast',
                plugs: Array.isArray(data.plugs) ? data.plugs : ['CCS2', 'NACS'],
                price: data.price || '$0.30/kWh',
                address: data.address || 'Santa Monica, CA',
                securityAlert: data.securityAlert ? {
                  cve: data.securityAlert.cve || 'N/A',
                  score: typeof data.securityAlert.score === 'number' ? data.securityAlert.score : 0,
                  title: data.securityAlert.title || 'Protected Firmware',
                  details: data.securityAlert.details || 'No security alerts.',
                  recommendation: data.securityAlert.recommendation || 'Perfect security compliance.'
                } : undefined
              });
            });

            setChargers(list);
            setGpsStatus('FIRESTORE DATA STREAM ACTIVE');
          } else {
            console.warn("Firestore collection 'chargers' is empty. Falling back to local simulated dataset.");
            setGpsStatus('FIRESTORE EMPTY - FALLBACK ACTIVE');
            loadLocalFallback(userLat, userLng);
          }
        }, (error) => {
          console.error("Firestore subscription error, falling back:", error);
          setGpsStatus('FIRESTORE ERROR - FALLBACK ACTIVE');
          loadLocalFallback(userLat, userLng);
        });

        unsubscribeFirestore = unsubscribe;
      } catch (err) {
        console.error("Failed to set up Firestore snapshot listener:", err);
        setGpsStatus('FIRESTORE OFFLINE - FALLBACK ACTIVE');
        loadLocalFallback(userLat, userLng);
      }
    };

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });
          
          // Start the live Firestore listener
          loadFromFirestore(lat, lng);
        },
        (error) => {
          console.warn("Geolocation access denied or failed. Fallback to default center.", error);
          setUserLocation(DEFAULT_COORDS);
          loadFromFirestore(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      loadFromFirestore(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
    }

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  const currentBase = userLocation || DEFAULT_COORDS;

  const handleSelectCharger = (charger: Charger) => {
    setSelectedCharger(charger);
  };

  // Find nearest secure alternative for rerouting
  const findSecureAlternative = () => {
    const secureList = chargers.filter(c => c.status === 'secure');
    if (secureList.length > 0) {
      const alt = secureList[0];
      setSelectedCharger(alt);
      setRouteToCharger(alt);
    }
  };

  // Launch Google/Apple Maps with directions from current geolocation
  const openExternalDirections = (charger: Charger) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentBase.latitude},${currentBase.longitude}&destination=${charger.latitude},${charger.longitude}&travelmode=driving`;
    Linking.openURL(url).catch((err) => console.error("Could not launch maps application", err));
  };

  const isWeb = Platform.OS === 'web';

  return (
    <ThemedView style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        
        {/* FULL SCREEN GOOGLE MAP VIEW */}
        <View style={styles.mapContainer}>
          <EVMap
            chargers={chargers}
            selectedCharger={selectedCharger}
            onSelectCharger={handleSelectCharger}
            routeToCharger={routeToCharger}
            userLocation={userLocation}
          />
        </View>

        {/* FLOATING glassmorphism NAVIGATION CARD */}
        <View style={[styles.floatingCard, isWeb ? styles.webCardFloating : styles.mobileCardFloating]}>
          <ScrollView contentContainerStyle={styles.cardScrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Header / Logo */}
            <View style={styles.headerBanner}>
              <ThemedText type="smallBold" style={styles.logoTitle}>
                🛡️ ECOSHIELD ROUTING API
              </ThemedText>
              <View style={[styles.gpsTag, { backgroundColor: userLocation ? 'rgba(0,240,255,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                <ThemedText type="code" style={{ fontSize: 9, color: userLocation ? '#00f0ff' : theme.cyberOrange }}>
                  {gpsStatus}
                </ThemedText>
              </View>
            </View>

            {!selectedCharger ? (
              // PROMPT SCREEN
              <View style={styles.promptContainer}>
                <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 18 }}>
                  Click on any secure (emerald shield) or compromised (red octagon) EV station on the map to test the routing and safety core API.
                </ThemedText>

                <View style={styles.statDashboardCard}>
                  <ThemedText type="code" style={styles.statsHeader}>
                    [ LIVE STATION GRID DATA ]
                  </ThemedText>
                  
                  <View style={styles.statProgressRow}>
                    <ThemedText type="code" style={styles.progressLabel}>GRID INTEGRIY COMPLIANCE: 50%</ThemedText>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: '50%', backgroundColor: theme.cyberOrange }]} />
                    </View>
                  </View>

                  <View style={styles.statGridSplit}>
                    <View style={styles.statBox}>
                      <ThemedText type="subtitle" style={{ color: theme.cyberGreen, fontWeight: '800' }}>3</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 9 }}>GRID SECURE</ThemedText>
                    </View>
                    <View style={styles.statBox}>
                      <ThemedText type="subtitle" style={{ color: theme.cyberRed, fontWeight: '800' }}>3</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 9 }}>VULNERABLE</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              // ACTIVE SELECTION DETAIL CARD
              <View style={styles.detailContainer}>
                <View style={styles.detailTitleRow}>
                  <ThemedText type="subtitle" style={styles.detailTitle}>
                    {selectedCharger.name}
                  </ThemedText>
                </View>
                
                <ThemedText type="code" style={{ fontSize: 10, color: theme.cyberCyan, marginBottom: 4 }}>
                  DATABASE NODE ID: {selectedCharger.id}
                </ThemedText>
                
                <ThemedText type="small" themeColor="textSecondary" style={styles.detailAddress}>
                  📍 {selectedCharger.address}
                </ThemedText>

                {/* Specs */}
                <View style={styles.specsGrid}>
                  <View style={styles.specBox}>
                    <ThemedText type="code" style={styles.specLabel}>POWER CAPACITY</ThemedText>
                    <ThemedText type="smallBold" style={styles.specValue}>⚡ {selectedCharger.power}</ThemedText>
                  </View>
                  <View style={styles.specBox}>
                    <ThemedText type="code" style={styles.specLabel}>SESSION COST</ThemedText>
                    <ThemedText type="smallBold" style={styles.specValue}>💵 {selectedCharger.price}</ThemedText>
                  </View>
                </View>

                {/* VULNERABILITY AUDIT METRICS */}
                <View style={[
                  styles.threatBoard,
                  { 
                    borderColor: selectedCharger.status === 'secure' ? theme.cyberGreen : theme.cyberRed,
                    backgroundColor: selectedCharger.status === 'secure' ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)'
                  }
                ]}>
                  <View style={styles.threatHeader}>
                    <ThemedText type="smallBold" style={{ fontSize: 11, color: selectedCharger.status === 'secure' ? theme.cyberGreen : theme.cyberRed }}>
                      {selectedCharger.status === 'secure' ? '🛡️ CERTIFIED SECURE' : '🚨 COMPROMISED NODE'}
                    </ThemedText>
                    {selectedCharger.securityAlert && (
                      <View style={[styles.cveBadge, { backgroundColor: selectedCharger.status === 'secure' ? theme.cyberGreen : theme.cyberRed }]}>
                        <ThemedText type="code" style={styles.cveText}>
                          {selectedCharger.securityAlert.cve}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {selectedCharger.securityAlert && (
                    <View style={styles.threatBody}>
                      <ThemedText type="smallBold" style={styles.threatTitle}>
                        {selectedCharger.securityAlert.title}
                      </ThemedText>
                      
                      {selectedCharger.status === 'compromised' && (
                        <ThemedText type="code" style={{ fontSize: 10, color: theme.cyberRed, fontWeight: 'bold' }}>
                          CVSS SCORE SEVERITY: {selectedCharger.securityAlert.score} / 10
                        </ThemedText>
                      )}

                      <ThemedText type="small" style={styles.threatDetails} themeColor="textSecondary">
                        {selectedCharger.securityAlert.details}
                      </ThemedText>

                      <View style={styles.divider} />

                      <ThemedText type="code" style={styles.mitigationLabel}>
                        RECOMMENDED ACTION:
                      </ThemedText>
                      <ThemedText type="small" style={styles.mitigationDetails}>
                        {selectedCharger.securityAlert.recommendation}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* ACTIVE ACTION BUTTONS */}
                <View style={styles.actionBtnContainer}>
                  {selectedCharger.status === 'secure' ? (
                    <Pressable 
                      style={({ pressed }) => [
                        styles.actionBtn, 
                        { backgroundColor: theme.cyberGreen },
                        pressed && styles.pressed
                      ]}
                      onPress={() => setRouteToCharger(selectedCharger)}
                    >
                      <ThemedText type="smallBold" style={styles.actionBtnText}>
                        🗺️ ROUTE TO SAFE CHARGER
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable 
                      style={({ pressed }) => [
                        styles.actionBtn, 
                        { backgroundColor: theme.cyberBlue },
                        pressed && styles.pressed
                      ]}
                      onPress={findSecureAlternative}
                    >
                      <ThemedText type="smallBold" style={styles.actionBtnText}>
                        🛡️ REROUTE TO SAFE ALTERNATIVE
                      </ThemedText>
                    </Pressable>
                  )}

                  {/* Launch native Maps directions */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionBtnSecondary,
                      { borderColor: 'rgba(255, 255, 255, 0.12)' },
                      pressed && styles.pressed
                    ]}
                    onPress={() => openExternalDirections(selectedCharger)}
                  >
                    <ThemedText type="smallBold" style={{ color: theme.text, fontSize: 12 }}>
                      ↗️ OPEN EXTERNAL MAP DIRECTIONS
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.deselectBtn,
                      pressed && styles.pressed
                    ]}
                    onPress={() => {
                      setSelectedCharger(null);
                      setRouteToCharger(null);
                    }}
                  >
                    <ThemedText type="code" themeColor="textSecondary" style={{ textAlign: 'center', fontSize: 11 }}>
                      [ CLOSE DETAILS ]
                    </ThemedText>
                  </Pressable>
                </View>

              </View>
            )}

          </ScrollView>
        </View>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    height: '100%',
  },
  safeArea: {
    flex: 1,
    height: '100%',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  floatingCard: {
    position: 'absolute',
    backgroundColor: 'rgba(9, 13, 22, 0.88)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    overflow: 'hidden',
    zIndex: 10,
  },
  webCardFloating: {
    top: 20,
    left: 20,
    width: 380,
    maxHeight: '90%',
  },
  mobileCardFloating: {
    bottom: 20,
    left: 10,
    right: 10,
    maxHeight: '40%',
  },
  cardScrollContent: {
    padding: Spacing.four,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  logoTitle: {
    color: '#00f0ff',
    fontSize: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,240,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  gpsTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  promptContainer: {
    gap: Spacing.three,
  },
  statDashboardCard: {
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  statsHeader: {
    color: '#00f0ff',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  statProgressRow: {
    gap: 4,
    marginBottom: Spacing.three,
  },
  progressLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statGridSplit: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    gap: 1,
  },
  detailContainer: {
    gap: Spacing.two,
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  detailAddress: {
    fontSize: 11,
    marginBottom: Spacing.one,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  specBox: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  specLabel: {
    fontSize: 8,
    color: '#64748b',
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  threatBoard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  threatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  cveBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  cveText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  threatBody: {
    gap: 3,
  },
  threatTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  threatDetails: {
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 6,
  },
  mitigationLabel: {
    fontSize: 8,
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  mitigationDetails: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  actionBtnContainer: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  deselectBtn: {
    paddingVertical: 6,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
