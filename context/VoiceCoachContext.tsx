import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CoachPersona = 'coach' | 'uncle' | 'student' | 'sister' | 'drill';

export interface PersonaProfile {
  id: CoachPersona;
  labelKey: string;
  emoji: string;
  ttsVoice: string;        // Google Neural2 voice name
  speakingRate: number;    // 0.5 ~ 2.0
  pitch: number;           // -20 ~ 20
}

export const PERSONA_PROFILES: PersonaProfile[] = [
  {
    id: 'coach',
    labelKey: 'style_coach',
    emoji: '🏃',
    ttsVoice: 'ko-KR-Neural2-B',
    speakingRate: 1.0,
    pitch: 0,
  },
  {
    id: 'uncle',
    labelKey: 'style_uncle',
    emoji: '👨',
    ttsVoice: 'ko-KR-Neural2-C',
    speakingRate: 0.95,
    pitch: -2,
  },
  {
    id: 'student',
    labelKey: 'style_student',
    emoji: '🎓',
    ttsVoice: 'ko-KR-Neural2-A',
    speakingRate: 1.1,
    pitch: 2,
  },
  {
    id: 'sister',
    labelKey: 'style_sister',
    emoji: '👩',
    ttsVoice: 'ko-KR-Neural2-D',
    speakingRate: 1.05,
    pitch: 1,
  },
  {
    id: 'drill',
    labelKey: 'style_drill',
    emoji: '💪',
    ttsVoice: 'ko-KR-Neural2-B',
    speakingRate: 1.15,
    pitch: -4,
  },
];

interface VoiceCoachConfig {
  targetDistanceKm: number;
  targetTimeMinutes: number;
  speakDistanceEvent: boolean;
  speakTimeEvent: boolean;
  speakPaceMakerEvent: boolean;
  isPaceMakerActive: boolean;
  persona: CoachPersona;
}

const defaultConfig: VoiceCoachConfig = {
  targetDistanceKm: 5,
  targetTimeMinutes: 25,
  speakDistanceEvent: true,
  speakTimeEvent: false,
  speakPaceMakerEvent: true,
  isPaceMakerActive: false,
  persona: 'coach',
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
