import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CoachPersona } from '../context/LlmCoachService';
import { speakNeural } from '../context/TtsService';

interface Props {
  selectedPersona: CoachPersona;
  onSelect: (persona: CoachPersona) => void;
  language: string;
}

export default function CoachPersonaSelector({ selectedPersona, onSelect, language }: Props) {
  const { t } = useTranslation();
  const [playingId, setPlayingId] = useState<CoachPersona | null>(null);

  // 페르소나별 메타데이터 (아이콘 및 샘플 대사)
  const personas: { id: CoachPersona; icon: string; nameKey: string; sampleKey: string }[] = [
    { 
      id: 'coach', 
      icon: '🏃‍♂️', 
      nameKey: 'style_coach', 
      sampleKey: 'sample_coach' 
    },
    { 
      id: 'uncle', 
      icon: '👴', 
      nameKey: 'style_uncle', 
      sampleKey: 'sample_uncle' 
    },
    { 
      id: 'student', 
      icon: '🎓', 
      nameKey: 'style_student', 
      sampleKey: 'sample_student' 
    },
    { 
      id: 'sister', 
      icon: '👩', 
      nameKey: 'style_sister', 
      sampleKey: 'sample_sister' 
    },
    { 
      id: 'drill', 
      icon: '🪖', 
      nameKey: 'style_drill', 
      sampleKey: 'sample_drill' 
    },
  ];

  const handleSelect = async (persona: typeof personas[0]) => {
    onSelect(persona.id);
    if (playingId) return; // 이미 재생 중인 경우 중복 실행 방지
    setPlayingId(persona.id);
    try {
      await speakNeural(t(persona.sampleKey), language, persona.id);
    } catch (e) {
      console.log('Audio preview failed', e);
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('coach_style', '코치 스타일')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {personas.map((p) => {
          const isSelected = selectedPersona === p.id;
          const isPlaying = playingId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.card, isSelected && styles.selectedCard]}
              onPress={() => handleSelect(p)}
              activeOpacity={0.7}
              disabled={playingId !== null}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{p.icon}</Text>
                {isPlaying && (
                  <View style={styles.spinnerOverlay}>
                    <ActivityIndicator size="small" color="#007AFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.name, isSelected && styles.selectedText]}>
                {t(p.nameKey)}
              </Text>
              <Text style={styles.sample} numberOfLines={2}>
                "{t(p.sampleKey)}"
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#333',
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  card: {
    width: 140,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: { backgroundColor: '#eef2ff', borderColor: '#007AFF' },
  iconContainer: { position: 'relative', marginBottom: 8 },
  icon: { fontSize: 32 },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  name: { fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#444' },
  selectedText: { color: '#007AFF' },
  sample: { fontSize: 11, color: '#777', textAlign: 'center', fontStyle: 'italic' },
});