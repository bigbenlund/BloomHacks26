import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SecurityThreatCatalogScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="smallBold" style={[styles.badge, { color: theme.neonCyan }]}>
            [ VULNERABILITY CATALOG ]
          </ThemedText>
          <ThemedText type="subtitle" style={styles.mainTitle}>
            EcoShield SecureRoute Catalogue
          </ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            A comprehensive index of EV grid firmware vulnerabilities, CVE metrics, and open-source EVerest defense policies.
          </ThemedText>

          <ExternalLink href="https://everest.github.io/" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.linkButton}>
                <ThemedText type="link" style={{ fontWeight: '600' }}>Explore EVerest Open Source Firmware</ThemedText>
                <SymbolView
                  tintColor={theme.text}
                  name={{ ios: 'arrow.up.right.square', android: 'link', web: 'link' }}
                  size={12}
                />
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          
          <Collapsible title="🛡️ What is EVerest Firmware?">
            <ThemedText type="small" style={styles.bulletText}>
              **EVerest** is an open-source modular firmware stack for EV charging stations, managed under LF Energy (The Linux Foundation). It standardizes communication protocols (OCPP 1.6/2.0.1, ISO 15118) and acts as the brain on the charger hardware.
            </ThemedText>
            <ThemedText type="small" style={styles.bulletText}>
              By leveraging EVerest, EcoShield simulates and monitors charger metadata to verify cryptographic signatures, session hashes, and identify physical or digital intrusions instantly.
            </ThemedText>
          </Collapsible>

          <Collapsible title="🚨 CVE-2023-4512: RFID Card Cloning & Replay">
            <ThemedView type="backgroundElement" style={styles.threatBox}>
              <View style={styles.vulnerabilityHeader}>
                <ThemedText type="smallBold" style={{ color: theme.cyberRed }}>
                  SEVERITY: 9.6 CRITICAL (CVSS v3)
                </ThemedText>
                <ThemedView type="backgroundSelected" style={styles.tag}>
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.cyberRed }}>RFID-REPLAY</ThemedText>
                </ThemedView>
              </View>
              
              <ThemedText type="small" style={styles.bulletText}>
                **Attack Vector:** Attackers use low-cost SDR (Software Defined Radio) devices or RFID readers to capture the wireless handshakes emitted during ISO 15118 card authentication scans.
              </ThemedText>
              <ThemedText type="small" style={styles.bulletText}>
                **Grid Impact:** Once the RFID hash is cloned, attackers replay the auth packet at a legacy node. The central grid system authorizes charging sessions, charging arbitrary accounts.
              </ThemedText>
              <ThemedText type="small" style={styles.bulletText}>
                **EVerest Mitigation:** Enforce encrypted authentication schemes, rotated session keys, and multi-factor validation via mobile APIs before starting high-load charging.
              </ThemedText>
            </ThemedView>
          </Collapsible>

          <Collapsible title="🚨 CVE-2024-3812: Unencrypted OCPP Handshakes">
            <ThemedView type="backgroundElement" style={styles.threatBox}>
              <View style={styles.vulnerabilityHeader}>
                <ThemedText type="smallBold" style={{ color: theme.cyberOrange }}>
                  SEVERITY: 8.4 HIGH (CVSS v3)
                </ThemedText>
                <ThemedView type="backgroundSelected" style={styles.tag}>
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.cyberOrange }}>WS-HTTP-80</ThemedText>
                </ThemedView>
              </View>

              <ThemedText type="small" style={styles.bulletText}>
                **Attack Vector:** Chargers running outdated legacy software fall back to unencrypted OCPP 1.6 messages over standard WebSocket port 80 (ws://) instead of secure secure WebSocket port 443 (wss://).
              </ThemedText>
              <ThemedText type="small" style={styles.bulletText}>
                **Grid Impact:** A bad actor on the local area network can intercept raw packets, hijack payment session tokens, alter grid limitation commands, or issue arbitrary start/stop chargers directives.
              </ThemedText>
              <ThemedText type="small" style={styles.bulletText}>
                **EVerest Mitigation:** Update server schemas to explicitly disable unencrypted HTTP WS ports, enforcing TLS 1.3 for all outgoing and incoming packets.
              </ThemedText>
            </ThemedView>
          </Collapsible>

          <Collapsible title="🚨 CVE-2024-9021: OCPP Session Hijacking">
            <ThemedView type="backgroundElement" style={styles.threatBox}>
              <View style={styles.vulnerabilityHeader}>
                <ThemedText type="smallBold" style={{ color: theme.cyberRed }}>
                  SEVERITY: 9.8 CRITICAL (CVSS v3)
                </ThemedText>
                <ThemedView type="backgroundSelected" style={styles.tag}>
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.cyberRed }}>TOKEN-PREDICTABILITY</ThemedText>
                </ThemedView>
              </View>

              <ThemedText type="small" style={styles.bulletText}>
                **Attack Vector:** Weak pseudo-random number generator (PRNG) algorithms in old charging control software produce predictable session tokens.
              </ThemedText>
              <ThemedText type="small" style={styles.bulletText}>
                **Grid Impact:** Remote exploit nodes scan active charging sessions, predict active token hashes, and inject power surge commands that can fry vehicle onboard chargers or physically damage hardware.
              </ThemedText>
              <ThemedText type="small" style={styles.bulletText}>
                **EVerest Mitigation:** Deploy EVerest cryptographically secure token generation modules (CSPRNG) backed by hardware secure chips (HSM).
              </ThemedText>
            </ThemedView>
          </Collapsible>

        </ThemedView>
        
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingBottom: 40,
  },
  titleContainer: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  badge: {
    letterSpacing: 1.5,
    fontSize: 12,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 4,
  },
  centerText: {
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 22,
    marginBottom: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionsWrapper: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  threatBox: {
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  vulnerabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 2,
  },
});
