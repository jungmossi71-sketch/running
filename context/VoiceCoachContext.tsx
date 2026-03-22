import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceCoachConfig {
  targetDistanceKm: number;
  targetTimeMinutes: number;
  speakDistanceEvent: boolean;
  speakTimeEvent: boolean;
  speakPaceMakerEvent: boolean;
  isPaceMakerActive: boolean;
}

const defaultConfig: VoiceCoachConfig = {
  targetDistanceKm: 5,
  targetTimeMinutes: 25,
  speakDistanceEvent: true,
  speakTimeEvent: false,
  speakPaceMakerEvent: true,
  isPaceMakerActive: false,
};

interface VoiceCoachContextType {
  config: VoiceCoachConfig;
  updateConfig: (newConfig: Partial<VoiceCoachConfig>) => Promise<void>;
}

const VoiceCoachContext = createContext<VoiceCoachContextType>({
  config: defaultConfig,
  updateConfig: async () => {},
});

export const VoiceCoachProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<VoiceCoachConfig>(defaultConfig);

  useEffect(() => {
    AsyncStorage.getItem('voice_coach_config').then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConfig(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Failed to parse voice coach config');
        }
      }
    });
  }, []);

  const updateConfig = async (newConfig: Partial<VoiceCoachConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    await AsyncStorage.setItem('voice_coach_config', JSON.stringify(merged));
  };

  return (
    <VoiceCoachContext.Provider value={{ config, updateConfig }}>
      {children}
    </VoiceCoachContext.Provider>
  );
};

export const useVoiceCoachContext = () => useContext(VoiceCoachContext);
