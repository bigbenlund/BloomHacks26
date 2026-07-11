import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type SettingsNavContextValue = {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const SettingsNavContext = createContext<SettingsNavContextValue | null>(null);

export function SettingsNavProvider({ children }: { children: ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const value = useMemo(
    () => ({
      isSettingsOpen,
      openSettings: () => setIsSettingsOpen(true),
      closeSettings: () => setIsSettingsOpen(false),
    }),
    [isSettingsOpen],
  );

  return <SettingsNavContext.Provider value={value}>{children}</SettingsNavContext.Provider>;
}

export function useSettingsNav() {
  const context = useContext(SettingsNavContext);
  if (!context) {
    throw new Error('useSettingsNav must be used within SettingsNavProvider');
  }
  return context;
}
