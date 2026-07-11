import { useState, useEffect, useCallback } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'critical' | 'secure';
  message: string;
}

const TEMPLATE_LOGS: Omit<LogEntry, 'id' | 'timestamp'>[] = [
  { type: 'info', message: 'EVerest Core v24.2.1 initialized.' },
  { type: 'info', message: 'OCPP 2.0.1 WebSocket connection established: wss://ocpp.grid.shield/node-108' },
  { type: 'secure', message: 'Firmware signature match: Root of Trust verified successfully.' },
  { type: 'info', message: 'ISO 15118: PLC link established with EV (MAC: 02:42:AC:11:00:02)' },
  { type: 'info', message: 'ISO 15118: TLS Session established. Cipher: TLS_AES_256_GCM_SHA384' },
  { type: 'secure', message: 'Secure Handshake completed. Power flow authorized at 150 kW.' },
  { type: 'info', message: 'OCPP: Charging session started. Grid load: 42.8%' },
  { type: 'info', message: 'EVerest Security watchdog active. Threat metrics within normal bounds.' },
  { type: 'warn', message: 'Minor firmware warning: certificate expiring in 45 days. Auto-renew scheduled.' },
  { type: 'info', message: 'EVerest Node #11: OCPP StatusNotification sent: Available.' },
  { type: 'info', message: 'Grid Shield Central: Security policy templates fetched.' },
];

const MALICIOUS_LOGS: Omit<LogEntry, 'id' | 'timestamp'>[] = [
  { type: 'critical', message: 'EVerest Node #42: ISO 15118 Multiple invalid RFID signatures in short burst. POSSIBLE REPLAY ATTACK!' },
  { type: 'critical', message: 'OCPP Connection hijacked: WebSocket token validation failure. Rogue IP: 185.220.101.4' },
  { type: 'critical', message: 'MITM Alert: ARP spoofing detected on local charging switch. Unencrypted payload risk.' },
  { type: 'critical', message: 'EVerest Node #42: Tamper switch triggered. Case open event recorded on secure board.' },
  { type: 'critical', message: 'OCPP Handshake failure: WebSocket downgrading to non-SSL port 80. Handshake blocked.' },
];

function getFormattedTime() {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export function useEverestLogs() {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    return Array.from({ length: 8 }).map((_, idx) => {
      const template = TEMPLATE_LOGS[Math.floor(Math.random() * TEMPLATE_LOGS.length)];
      const d = new Date(Date.now() - (8 - idx) * 30000);
      return {
        id: `init-${idx}`,
        timestamp: d.toTimeString().split(' ')[0],
        type: template.type,
        message: template.message
      };
    });
  });

  // Set up background log ticker
  useEffect(() => {
    const interval = setInterval(() => {
      // 80% chance of info/secure log, 20% warning or critical log from main pool
      const isHealthy = Math.random() > 0.15;
      const pool = isHealthy ? TEMPLATE_LOGS : MALICIOUS_LOGS;
      const selectLog = pool[Math.floor(Math.random() * pool.length)];

      const newLog: LogEntry = {
        id: `ticker-${Date.now()}`,
        timestamp: getFormattedTime(),
        type: selectLog.type,
        message: selectLog.message
      };

      setLogs(prev => [...prev.slice(-49), newLog]); // Keep last 50 logs
    }, 4500); // Add standard log every 4.5 seconds

    return () => clearInterval(interval);
  }, []);

  // Inject a direct custom security incident log when user taps on a compromised charger
  const injectAlertLog = useCallback((chargerName: string, detail: string) => {
    const alertLogs: LogEntry[] = [
      {
        id: `inject-alert-1-${Date.now()}`,
        timestamp: getFormattedTime(),
        type: 'critical',
        message: `[ALERT TRIGGERED] Security breach localized on: ${chargerName}!`
      },
      {
        id: `inject-alert-2-${Date.now()}`,
        timestamp: getFormattedTime(),
        type: 'critical',
        message: `[LOGS DIAGNOSTIC] ${detail}`
      }
    ];

    setLogs(prev => [...prev.slice(-48), ...alertLogs]);
  }, []);

  // Inject a standard secure log when user taps on a secure charger
  const injectSecureLog = useCallback((chargerName: string) => {
    const secureLog: LogEntry = {
      id: `inject-secure-${Date.now()}`,
      timestamp: getFormattedTime(),
      type: 'secure',
      message: `[GRID SECURE] Handshake verified on ${chargerName}. Cryptographic certificates valid.`
    };
    setLogs(prev => [...prev.slice(-49), secureLog]);
  }, []);

  return {
    logs,
    injectAlertLog,
    injectSecureLog
  };
}
