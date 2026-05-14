import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface VoiceModeContextType {
  voiceModeEnabled: boolean;
  toggleVoiceMode: () => void;
  setVoiceMode: (enabled: boolean) => void;
}

const VoiceModeContext = createContext<VoiceModeContextType | undefined>(undefined);

export const VoiceModeProvider = ({ children }: { children: ReactNode }) => {
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(() => {
    const saved = localStorage.getItem('voiceModeEnabled');
    return saved === 'true';
  });

  const toggleVoiceMode = useCallback(() => {
    setVoiceModeEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('voiceModeEnabled', String(newValue));
      return newValue;
    });
  }, []);

  const setVoiceMode = useCallback((enabled: boolean) => {
    setVoiceModeEnabled(enabled);
    localStorage.setItem('voiceModeEnabled', String(enabled));
  }, []);

  return (
    <VoiceModeContext.Provider value={{ voiceModeEnabled, toggleVoiceMode, setVoiceMode }}>
      {children}
    </VoiceModeContext.Provider>
  );
};

export const useVoiceMode = () => {
  const context = useContext(VoiceModeContext);
  if (!context) {
    throw new Error('useVoiceMode must be used within a VoiceModeProvider');
  }
  return context;
};
