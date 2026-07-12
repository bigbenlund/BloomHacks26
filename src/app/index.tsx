import { db } from "@/config/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EVMap } from "@/components/ev-map";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Charger } from "@/constants/chargers";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const DEFAULT_COORDS = { latitude: 28.6024, longitude: -81.2001 }; // UCF Orlando reference fallback

const createMockChargers = (lat: number, lng: number): Charger[] => {
  return [
    {
      id: "charger-1",
      name: "⚡ EcoShield Secure Station (Alpha)",
      location: { lat: lat + 0.006, lng: lng + 0.008 },
      status: "SAFE",
      risk: 0,
      recommendation: "Safe to connect and charge at maximum speeds.",
      findings: [],
      driver_summary:
        "This charging station is fully secured with verified encrypted handshakes. All security systems are green and safe to connect.",
      firmware: "EVerest v24.2.1",
      log_file: "mock_secure_alpha.csv",
      power: "350 kW Ultra Fast",
      plugs: ["CCS2", "NACS"],
      price: "$0.34/kWh",
      address: "Route Safe Node Alpha",
    },
    {
      id: "charger-2",
      name: "🚨 Compromised Charger #42 (Vulnerable)",
      location: { lat: lat - 0.008, lng: lng - 0.005 },
      status: "COMPROMISED",
      risk: 96,
      recommendation:
        "CRITICAL WARNING. Avoid utilizing this charger to prevent token theft.",
      findings: [
        {
          code: "CVE-2023-4512",
          title: "RFID Cloning & Replay Risk",
          severity: "CRITICAL",
          evidence:
            "Vulnerable firmware version runs insecure, unencrypted ISO 15118 RFID handshakes. Passive eavesdroppers nearby can easily intercept and clone user RFIDs.",
        },
      ],
      driver_summary:
        "Do not use this station. The charger is running an outdated firmware version vulnerable to RFID cloning, and multiple authentication failures have been flagged.",
      firmware: "EVerest v24.1.2",
      log_file: "mock_compromised_42.csv",
      power: "150 kW DC Fast",
      plugs: ["CCS1", "CCS2"],
      price: "$0.28/kWh",
      address: "High-Risk Station #42",
    },
    {
      id: "charger-3",
      name: "⚡ EcoShield Secure Station (Beta)",
      location: { lat: lat - 0.005, lng: lng + 0.012 },
      status: "SAFE",
      risk: 0,
      recommendation: "Safe to charge.",
      findings: [],
      driver_summary:
        "All connection and OCPP handshake components are running with strict TLS encryption. No vulnerabilities or anomalies detected.",
      firmware: "EVerest v24.2.1",
      log_file: "mock_secure_beta.csv",
      power: "250 kW Supercharger",
      plugs: ["NACS"],
      price: "$0.36/kWh",
      address: "Route Safe Node Beta",
    },
    {
      id: "charger-4",
      name: "🚨 Compromised Charger #19 (Vulnerable)",
      location: { lat: lat + 0.012, lng: lng - 0.01 },
      status: "COMPROMISED",
      risk: 84,
      recommendation: "HIGH RISK. Use only in emergency scenarios.",
      findings: [
        {
          code: "CVE-2024-3812",
          title: "Unencrypted OCPP Handshakes",
          severity: "HIGH",
          evidence:
            "OCPP messages fall back to unencrypted HTTP WebSocket on port 80. Exposes active session billing tokens to MITM local area packet sniffing.",
        },
      ],
      driver_summary:
        "Avoid utilizing this charger if possible. It is communicating over an insecure, unencrypted WebSocket protocol, making it vulnerable to local packet interception.",
      firmware: "EVerest v1.2.0",
      log_file: "mock_compromised_19.csv",
      power: "50 kW AC Charge",
      plugs: ["Type 2"],
      price: "$0.22/kWh",
      address: "High-Risk Station #19",
    },
    {
      id: "charger-5",
      name: "⚡ EcoShield Secure Station (Gamma)",
      location: { lat: lat + 0.009, lng: lng - 0.004 },
      status: "SAFE",
      risk: 0,
      recommendation: "Safe to charge.",
      findings: [],
      driver_summary:
        "Runs fortified modular EVerest firmware with CSPRNG token security. Connection integrity is verified.",
      firmware: "EVerest v24.2.1",
      log_file: "mock_secure_gamma.csv",
      power: "150 kW DC Fast",
      plugs: ["CCS2", "NACS"],
      price: "$0.30/kWh",
      address: "Route Safe Node Gamma",
    },
    {
      id: "charger-6",
      name: "🚨 Compromised Charger #81 (Vulnerable)",
      location: { lat: lat - 0.011, lng: lng + 0.006 },
      status: "COMPROMISED",
      risk: 98,
      recommendation: "CRITICAL WARNING. Do not connect.",
      findings: [
        {
          code: "CVE-2024-9021",
          title: "OCPP Session Hijacking",
          severity: "CRITICAL",
          evidence:
            "Weak token prediction algorithms in outdated charging firmwares allow active session hijacking and remote control.",
        },
      ],
      driver_summary:
        "Do not connect your vehicle to this station. Security systems have flagged an active session-hijacking attempt on the EVerest charger rig, posing risk to connected electronics.",
      firmware: "EVerest v1.3.1",
      log_file: "mock_compromised_81.csv",
      power: "150 kW DC Fast",
      plugs: ["CCS2"],
      price: "$0.32/kWh",
      address: "High-Risk Station #81",
    },
  ];
};

export default function SecurityDashboardScreen() {
  const theme = useTheme();

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [routeToCharger, setRouteToCharger] = useState<Charger | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>(() => {
    if (typeof window !== "undefined" && !navigator.geolocation) {
      return "GPS UNSUPPORTED - FALLBACK";
    }
    return "ACQUIRING POSITION...";
  });

  // Request browser geolocation on mount and fetch Firestore chargers
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const loadLocalFallback = (lat: number, lng: number) => {
      const mockList = createMockChargers(lat, lng);
      setChargers(mockList);
    };

    const loadFromFirestore = (userLat: number, userLng: number) => {
      setGpsStatus("CONNECTING TO FIRESTORE...");
      try {
        const chargersCol = collection(db, "chargers");

        // Listen to active updates in Firestore
        const unsubscribe = onSnapshot(
          chargersCol,
          (snapshot) => {
            if (!snapshot.empty) {
              const list: Charger[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                list.push({
                  id: doc.id,
                  name: data.name || "Unnamed Station",
                  location: data.location || { lat: userLat, lng: userLng },
                  status: (["SAFE", "CAUTION", "COMPROMISED"].includes(
                    data.status,
                  )
                    ? data.status
                    : "SAFE") as Charger["status"],
                  risk: typeof data.risk === "number" ? data.risk : 0,
                  recommendation: data.recommendation || "No advisories",
                  findings: Array.isArray(data.findings) ? data.findings : [],
                  driver_summary:
                    data.driver_summary ||
                    data.recommendation ||
                    "This station is fully verified secure.",
                  firmware: data.firmware || "unknown",
                  log_file: data.log_file || "simulated",
                  telemetry: data.telemetry,
                  power:
                    data.power ||
                    (data.telemetry && data.telemetry.event_count
                      ? `Log Events: ${data.telemetry.event_count}`
                      : "150 kW DC Fast"),
                  plugs: Array.isArray(data.plugs)
                    ? data.plugs
                    : ["CCS2", "NACS"],
                  price: data.price || "$0.30/kWh",
                  address:
                    data.address ||
                    `${data.name || "Orlando Node"} - Orlando Grid Node`,
                });
              });

              setChargers(list);
              setGpsStatus("FIRESTORE DATA STREAM ACTIVE");
            } else {
              console.warn(
                "Firestore collection 'chargers' is empty. Falling back to local simulated dataset.",
              );
              setGpsStatus("FIRESTORE EMPTY - FALLBACK ACTIVE");
              loadLocalFallback(userLat, userLng);
            }
          },
          (error) => {
            console.error("Firestore subscription error, falling back:", error);
            setGpsStatus("FIRESTORE ERROR - FALLBACK ACTIVE");
            loadLocalFallback(userLat, userLng);
          },
        );

        unsubscribeFirestore = unsubscribe;
      } catch (err) {
        console.error("Failed to set up Firestore snapshot listener:", err);
        setGpsStatus("FIRESTORE OFFLINE - FALLBACK ACTIVE");
        loadLocalFallback(userLat, userLng);
      }
    };

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });
          loadFromFirestore(lat, lng);
        },
        () => {
          setGpsStatus("GPS BLOCKED - FALLBACK TO UCF");
          loadFromFirestore(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
        },
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
    const secureList = chargers.filter((c) => c.status === "SAFE");
    if (secureList.length > 0) {
      const alt = secureList[0];
      setSelectedCharger(alt);
      setRouteToCharger(alt);
    }
  };

  // Launch Google/Apple Maps with directions from current geolocation
  const openExternalDirections = (charger: Charger) => {
    const destLat = charger.location?.lat ?? DEFAULT_COORDS.latitude;
    const destLng = charger.location?.lng ?? DEFAULT_COORDS.longitude;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentBase.latitude},${currentBase.longitude}&destination=${destLat},${destLng}&travelmode=driving`;
    Linking.openURL(url).catch((err) =>
      console.error("Could not launch maps application", err),
    );
  };

  const isWeb = Platform.OS === "web";

  // Statistics calculations
  const safeCount = chargers.filter((c) => c.status === "SAFE").length;
  const cautionCount = chargers.filter((c) => c.status === "CAUTION").length;
  const compromisedCount = chargers.filter(
    (c) => c.status === "COMPROMISED",
  ).length;
  const totalCount = chargers.length;
  const complianceRate =
    totalCount > 0 ? Math.round((safeCount / totalCount) * 100) : 100;
  const complianceColor =
    complianceRate > 75
      ? theme.cyberGreen
      : complianceRate > 40
        ? theme.cyberOrange
        : theme.cyberRed;

  return (
    <ThemedView style={styles.outerContainer}>
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "left", "right", "bottom"]}
      >
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
        <View
          style={[
            styles.floatingCard,
            isWeb ? styles.webCardFloating : styles.mobileCardFloating,
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.cardScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header / Logo */}
            <View style={styles.headerBanner}>
              <ThemedText type="smallBold" style={styles.logoTitle}>
                🛡️ ECOSHIELD ROUTING API
              </ThemedText>
              <View
                style={[
                  styles.gpsTag,
                  {
                    backgroundColor: userLocation
                      ? "rgba(0,240,255,0.1)"
                      : "rgba(245,158,11,0.1)",
                  },
                ]}
              >
                <ThemedText
                  type="code"
                  style={{
                    fontSize: 9,
                    color: userLocation ? "#00f0ff" : theme.cyberOrange,
                  }}
                >
                  {gpsStatus}
                </ThemedText>
              </View>
            </View>

            {!selectedCharger ? (
              // PROMPT SCREEN
              <View style={styles.promptContainer}>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, lineHeight: 18 }}
                >
                  Click on any secure (shield), warning (triangle) or
                  compromised (red octagon) EV station on the map to audit
                  routing, safety alerts, and micro-summaries.
                </ThemedText>

                <View style={styles.statDashboardCard}>
                  <ThemedText type="code" style={styles.statsHeader}>
                    [ LIVE STATION GRID DATA ]
                  </ThemedText>

                  <View style={styles.statProgressRow}>
                    <ThemedText type="code" style={styles.progressLabel}>
                      GRID INTEGRITY COMPLIANCE: {complianceRate}%
                    </ThemedText>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${complianceRate}%`,
                            backgroundColor: complianceColor,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.statGridSplit}>
                    <View style={styles.statBox}>
                      <ThemedText
                        type="subtitle"
                        style={{ color: theme.cyberGreen, fontWeight: "800" }}
                      >
                        {safeCount}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 9 }}>
                        GRID SECURE
                      </ThemedText>
                    </View>
                    <View style={styles.statBox}>
                      <ThemedText
                        type="subtitle"
                        style={{ color: theme.cyberOrange, fontWeight: "800" }}
                      >
                        {cautionCount}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 9 }}>
                        CAUTION
                      </ThemedText>
                    </View>
                    <View style={styles.statBox}>
                      <ThemedText
                        type="subtitle"
                        style={{ color: theme.cyberRed, fontWeight: "800" }}
                      >
                        {compromisedCount}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 9 }}>
                        COMPROMISED
                      </ThemedText>
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

                <ThemedText
                  type="code"
                  style={{
                    fontSize: 10,
                    color: theme.cyberBlue,
                    marginBottom: 4,
                  }}
                >
                  DATABASE NODE ID: {selectedCharger.id}
                </ThemedText>

                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.detailAddress}
                >
                  📍 {selectedCharger.address}
                </ThemedText>

                {/* Specs */}
                <View style={styles.specsGrid}>
                  <View style={styles.specBox}>
                    <ThemedText type="code" style={styles.specLabel}>
                      POWER CAPACITY
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.specValue}>
                      ⚡ {selectedCharger.power}
                    </ThemedText>
                  </View>
                  <View style={styles.specBox}>
                    <ThemedText type="code" style={styles.specLabel}>
                      SESSION COST
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.specValue}>
                      💵 {selectedCharger.price}
                    </ThemedText>
                  </View>
                </View>

                {/* VULNERABILITY AUDIT METRICS */}
                <View
                  style={[
                    styles.threatBoard,
                    {
                      borderColor:
                        selectedCharger.status === "SAFE"
                          ? theme.cyberGreen
                          : selectedCharger.status === "CAUTION"
                            ? theme.cyberOrange
                            : theme.cyberRed,
                      backgroundColor:
                        selectedCharger.status === "SAFE"
                          ? "rgba(16, 185, 129, 0.04)"
                          : selectedCharger.status === "CAUTION"
                            ? "rgba(245, 158, 11, 0.04)"
                            : "rgba(239, 68, 68, 0.04)",
                    },
                  ]}
                >
                  <View style={styles.threatHeader}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        fontSize: 11,
                        color:
                          selectedCharger.status === "SAFE"
                            ? theme.cyberGreen
                            : selectedCharger.status === "CAUTION"
                              ? theme.cyberOrange
                              : theme.cyberRed,
                      }}
                    >
                      {selectedCharger.status === "SAFE"
                        ? "🛡️ CERTIFIED SECURE"
                        : selectedCharger.status === "CAUTION"
                          ? "⚠️ WARNING ADVISORY"
                          : "🚨 COMPROMISED NODE"}
                    </ThemedText>
                    {selectedCharger.findings &&
                      selectedCharger.findings.length > 0 && (
                        <View
                          style={[
                            styles.cveBadge,
                            {
                              backgroundColor:
                                selectedCharger.status === "SAFE"
                                  ? theme.cyberGreen
                                  : selectedCharger.status === "CAUTION"
                                    ? theme.cyberOrange
                                    : theme.cyberRed,
                            },
                          ]}
                        >
                          <ThemedText type="code" style={styles.cveText}>
                            {selectedCharger.findings[0].code}
                          </ThemedText>
                        </View>
                      )}
                  </View>

                  <View style={styles.threatBody}>
                    <ThemedText type="smallBold" style={styles.threatTitle}>
                      {selectedCharger.findings &&
                      selectedCharger.findings.length > 0
                        ? selectedCharger.findings[0].title
                        : selectedCharger.status === "SAFE"
                          ? "EVerest Core Protected Node"
                          : "Firmware Advisory"}
                    </ThemedText>

                    {selectedCharger.status !== "SAFE" && (
                      <ThemedText
                        type="code"
                        style={{
                          fontSize: 10,
                          color:
                            selectedCharger.status === "CAUTION"
                              ? theme.cyberOrange
                              : theme.cyberRed,
                          fontWeight: "bold",
                        }}
                      >
                        INTELLIGENCE RISK FACTOR: {selectedCharger.risk} / 100
                      </ThemedText>
                    )}

                    <ThemedText
                      type="small"
                      style={styles.threatDetails}
                      themeColor="textSecondary"
                    >
                      {selectedCharger.driver_summary ||
                        selectedCharger.recommendation}
                    </ThemedText>

                    {selectedCharger.findings &&
                      selectedCharger.findings.length > 0 && (
                        <>
                          <View style={styles.divider} />
                          <ThemedText
                            type="code"
                            style={styles.mitigationLabel}
                          >
                            TECHNICAL EVIDENCE:
                          </ThemedText>
                          <ThemedText
                            type="small"
                            style={[
                              styles.threatDetails,
                              { fontStyle: "italic", fontSize: 10 },
                            ]}
                            themeColor="textSecondary"
                          >
                            {selectedCharger.findings[0].evidence}
                          </ThemedText>
                        </>
                      )}

                    <View style={styles.divider} />

                    <ThemedText type="code" style={styles.mitigationLabel}>
                      RECOMMENDED ACTION:
                    </ThemedText>
                    <ThemedText type="small" style={styles.mitigationDetails}>
                      {selectedCharger.recommendation}
                    </ThemedText>
                  </View>
                </View>

                {/* ACTIVE ACTION BUTTONS */}
                <View style={styles.actionBtnContainer}>
                  {selectedCharger.status === "SAFE" ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { backgroundColor: theme.cyberGreen },
                        pressed && styles.pressed,
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
                        pressed && styles.pressed,
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
                      { borderColor: "rgba(255, 255, 255, 0.12)" },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => openExternalDirections(selectedCharger)}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.text, fontSize: 12 }}
                    >
                      ↗️ OPEN EXTERNAL MAP DIRECTIONS
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.deselectBtn,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setSelectedCharger(null);
                      setRouteToCharger(null);
                    }}
                  >
                    <ThemedText
                      type="code"
                      themeColor="textSecondary"
                      style={{ textAlign: "center", fontSize: 11 }}
                    >
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
    height: "100%",
  },
  safeArea: {
    flex: 1,
    height: "100%",
  },
  mapContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  floatingCard: {
    position: "absolute",
    backgroundColor: "rgba(9, 13, 22, 0.88)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    overflow: "hidden",
    zIndex: 10,
  },
  webCardFloating: {
    top: 20,
    left: 20,
    width: 380,
    maxHeight: "90%",
  },
  mobileCardFloating: {
    bottom: 20,
    left: 10,
    right: 10,
    maxHeight: "40%",
  },
  cardScrollContent: {
    padding: Spacing.four,
  },
  headerBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  logoTitle: {
    color: "#00f0ff",
    fontSize: 12,
    letterSpacing: 1,
    textShadowColor: "rgba(0,240,255,0.3)",
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
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  statsHeader: {
    color: "#00f0ff",
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
    color: "#64748b",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  statGridSplit: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    gap: 1,
  },
  detailContainer: {
    gap: Spacing.two,
  },
  detailTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  detailAddress: {
    fontSize: 11,
    marginBottom: Spacing.one,
  },
  specsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  specBox: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  specLabel: {
    fontSize: 8,
    color: "#64748b",
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  threatBoard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  threatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.one,
  },
  cveBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  cveText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
  },
  threatBody: {
    gap: 3,
  },
  threatTitle: {
    fontSize: 12,
    fontWeight: "bold",
  },
  threatDetails: {
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 6,
  },
  mitigationLabel: {
    fontSize: 8,
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  mitigationDetails: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  actionBtnContainer: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtnSecondary: {
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  deselectBtn: {
    paddingVertical: 6,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
