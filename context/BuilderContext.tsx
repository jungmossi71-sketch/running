import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SegmentType = 'warmup' | 'steady' | 'interval' | 'recovery' | 'cooldown';

export interface RoutineSegment {
  id: string;
  type: SegmentType;
  targetType: 'time' | 'distance';
  value: number; // minutes or km
  targetPaceM?: number; // Target pace minutes
  targetPaceS?: number; // Target pace seconds
}

export interface RoutineProgram {
  id: string;
  name: string;
  segments: RoutineSegment[];
}

interface BuilderContextType {
  currentRoutine: RoutineSegment[];
  currentRoutineName: string;
  addSegment: (type: SegmentType) => void;
  removeSegment: (id: string) => void;
  updateSegment: (id: string, updates: Partial<RoutineSegment>) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
  clearRoutine: () => void;
  saveAsPreset: (name: string) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  presets: RoutineProgram[];
  loadPreset: (id: string) => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export const BuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoutine, setCurrentRoutine] = useState<RoutineSegment[]>([]);
  const [currentRoutineName, setCurrentRoutineName] = useState<string>('');
  const [presets, setPresets] = useState<RoutineProgram[]>([]);

  useEffect(() => {
    // Load presets from storage
    AsyncStorage.getItem('run_presets').then(data => {
      if (data) {
        try {
          setPresets(JSON.parse(data));
        } catch (e) {
          console.error('run_presets 파싱 실패, 초기화합니다.', e);
          AsyncStorage.removeItem('run_presets');
        }
      }
    });
  }, []);

  const addSegment = (type: SegmentType) => {
    const newSegment: RoutineSegment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      targetType: type === 'steady' || type === 'interval' ? 'distance' : 'time',
      value: type === 'warmup' || type === 'cooldown' ? 5 : 1,
    };
    setCurrentRoutine([...currentRoutine, newSegment]);
  };

  const removeSegment = (id: string) => {
    setCurrentRoutine(currentRoutine.filter(s => s.id !== id));
  };

  const updateSegment = (id: string, updates: Partial<RoutineSegment>) => {
    setCurrentRoutine(currentRoutine.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const reorderSegments = (fromIndex: number, toIndex: number) => {
    const nextArr = [...currentRoutine];
    const [moved] = nextArr.splice(fromIndex, 1);
    nextArr.splice(toIndex, 0, moved);
    setCurrentRoutine(nextArr);
  };

  const clearRoutine = () => {
    setCurrentRoutine([]);
    setCurrentRoutineName('');
  };

  const saveAsPreset = async (name: string) => {
    const newPreset: RoutineProgram = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      segments: [...currentRoutine],
    };
    const newPresets = [...presets, newPreset];
    setPresets(newPresets);
    setCurrentRoutineName(name);
    await AsyncStorage.setItem('run_presets', JSON.stringify(newPresets));
  };

  const deletePreset = async (id: string) => {
    const newPresets = presets.filter(p => p.id !== id);
    setPresets(newPresets);
    await AsyncStorage.setItem('run_presets', JSON.stringify(newPresets));
  };

  const loadPreset = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
        setCurrentRoutine([...preset.segments]);
        setCurrentRoutineName(preset.name);
    }
  };

  return (
    <BuilderContext.Provider value={{
      currentRoutine, currentRoutineName, addSegment, removeSegment, updateSegment, reorderSegments, clearRoutine, saveAsPreset, deletePreset, presets, loadPreset
    }}>
      {children}
    </BuilderContext.Provider>
  );
};

export const useBuilderContext = () => {
  const context = useContext(BuilderContext);
  if (!context) throw new Error('useBuilderContext must be used within a BuilderProvider');
  return context;
};
