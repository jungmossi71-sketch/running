import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Modal, ImageBackground } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { useThemeContext } from '../../context/ThemeContext';
import { useHistoryContext } from '../../context/HistoryContext';
import { useVoiceCoachContext } from '../../context/VoiceCoachContext';
import { Switch } from 'react-native';

const { width } = Dimensions.get('window');

const LANGS = ['en', 'ko', 'zh', 'ja', 'es', 'hi'];
const LANG_LABELS: Record<string, string> = { en: 'English', ko: '한국어', zh: '中文', ja: '日本語', es: 'Español', hi: 'हिन्दी' };

export default function HomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'outdoor' | 'indoor'>('outdoor');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const { customBackgroundUri, appTheme, colors } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../../context/ThemeContext');
  const { history, weeklyGoal, updateWeeklyGoal, mileageBalance } = useHistoryContext();
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [tempGoal, setTempGoal] = useState(weeklyGoal);
  
  const { config: coachConfig, updateConfig: updateCoachConfig } = useVoiceCoachContext();
  const [coachModalVisible, setCoachModalVisible] = useState(false);
  const [tempCoach, setTempCoach] = useState(coachConfig);
  
  const handleSaveCoach = async () => {
    await updateCoachConfig(tempCoach);
    setCoachModalVisible(false);
  };

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    date.setDate(diff);
    date.setHours(0,0,0,0);
    return date;
  };

  const currentWeekRuns = history.filter(run => {
    const runTimeMs = parseInt(run.id, 10);
    if (isNaN(runTimeMs)) return true; // 방어 로직
    
    // (월~일) 달력 알고리즘을 기준으로 이번 주 월요일 0시 ~ 다음 주 월요일 0시 바운더리 검증
    const today = new Date();
    const thisMonday = getMonday(today);
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);

    return runTimeMs >= thisMonday.getTime() && runTimeMs < nextMonday.getTime();
  });

  const wkKm = currentWeekRuns.reduce((acc, run) => acc + parseFloat(run.distance || '0'), 0);
  const wkCount = currentWeekRuns.length;

  let totalS = 0;
  currentWeekRuns.forEach(r => {
    const parts = r.time.split(':');
    if (parts.length === 2) {
      totalS += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
  });
  const wkPace = wkKm > 0 ? (totalS / 60) / wkKm : 0;
  const paceM = Math.floor(wkPace);
  const paceS = Math.floor((wkPace - paceM) * 60);
  const formattedPace = wkKm > 0 ? `${paceM}'${paceS < 10 ? '0' : ''}${paceS}"` : `-'-"`;

  const progressPercent = Math.min((wkKm / weeklyGoal) * 100, 100);

  const handleSaveGoal = async () => {
    await updateWeeklyGoal(tempGoal);
    setGoalModalVisible(false);
  };

  return (
    <ImageBackground 
      source={
        customBackgroundUri 
          ? { uri: customBackgroundUri } 
          : THEME_BACKGROUNDS[appTheme]
      } 
      style={[styles.container, !customBackgroundUri && appTheme === 'default' && { backgroundColor: '#000' }]}
      imageStyle={{ opacity: 0.3 }}
    >
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.greeting}>{t('welcome')}</Text>
            <Text style={styles.appTitle} numberOfLines={1} adjustsFontSizeToFit>
              HAPPY<Text style={[styles.neonText, { color: colors.main }]}> RUN</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0, paddingRight: 4 }}>
            <TouchableOpacity 
              style={[styles.mileageBadge, { borderColor: 'rgba(255, 255, 255, 0.4)', backgroundColor: 'transparent' }]} 
              onPress={() => setLangModalVisible(true)}
            >
              <Ionicons name="globe-outline" size={16} color="#FFF" />
              <Text style={[styles.mileageText, { color: '#FFF' }]}>{LANG_LABELS[i18n.language] || i18n.language?.toUpperCase()}</Text>
            </TouchableOpacity>
            <View style={[styles.mileageBadge, { borderColor: colors.main, backgroundColor: `${colors.main}20` }]}>
              <Ionicons name="flash" size={16} color={colors.main} />
              <Text style={[styles.mileageText, { color: colors.main }]}>{Math.floor(mileageBalance).toLocaleString()} M</Text>
            </View>
          </View>
        </View>

        {/* Weekly Progress Card (Glassmorphism Concept) */}
        <View style={styles.card}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.cardTitle}>{t('progress_title')}</Text>
            <TouchableOpacity 
              style={{flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.sub}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12}}
              onPress={() => {
                setTempGoal(weeklyGoal);
                setGoalModalVisible(true);
              }}
            >
              <Text style={{color: colors.sub, fontWeight: 'bold', fontSize: 13, marginRight: 6}}>
                {wkKm.toFixed(1)} / {weeklyGoal} km
              </Text>
              <Ionicons name="pencil" size={14} color={colors.sub} />
            </TouchableOpacity>
          </View>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.statsValue}>{wkKm.toFixed(1)}</Text>
              <Text style={styles.statsLabel}>{t('kilometers')}</Text>
            </View>
            <View>
              <Text style={styles.statsValue}>{wkCount}</Text>
              <Text style={styles.statsLabel}>{t('runs')}</Text>
            </View>
            <View>
              <Text style={styles.statsValue}>{formattedPace}</Text>
              <Text style={styles.statsLabel}>{t('avg_pace')}</Text>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: colors.sub }]} />
          </View>
        </View>

        {/* Dynamic Mode Selector */}
        <View style={styles.modeContainer}>
          <TouchableOpacity 
            style={[styles.modeButton, mode === 'outdoor' && styles.modeButtonActive]}
            onPress={() => setMode('outdoor')}
          >
            <Ionicons name="navigate" size={20} color={mode === 'outdoor' ? '#fff' : '#888'} />
            <Text style={[styles.modeText, mode === 'outdoor' && styles.modeTextActive]}>{t('mode_outdoor')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeButton, mode === 'indoor' && styles.modeButtonActive]}
            onPress={() => setMode('indoor')}
          >
            <Ionicons name="barbell" size={20} color={mode === 'indoor' ? '#fff' : '#888'} />
            <Text style={[styles.modeText, mode === 'indoor' && styles.modeTextActive]}>{t('mode_indoor')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/theme')}
          >
            <Ionicons name="color-palette" size={24} color={appTheme === 'cyberpunk' ? '#FF00FF' : '#B026FF'} />
            <Text style={styles.actionText}>{t('theme')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/history')}
          >
            <Ionicons name="time" size={24} color={colors.sub} />
            <Text style={styles.actionText}>{t('history_title')}</Text>
          </TouchableOpacity>
        </View>

        {/* Voice Coach Toggle */}
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: coachConfig.isPaceMakerActive ? colors.main : 'rgba(255,255,255,0.1)' }}
          onPress={() => { setTempCoach(coachConfig); setCoachModalVisible(true); }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="headset" size={24} color={coachConfig.isPaceMakerActive ? colors.main : '#888'} />
            <View>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{t('voice_coach_title')}</Text>
              <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                {coachConfig.isPaceMakerActive ? t('target_pace_summary', { m: Math.floor(coachConfig.targetTimeMinutes / coachConfig.targetDistanceKm), s: Math.round((coachConfig.targetTimeMinutes / coachConfig.targetDistanceKm % 1) * 60) }) : t('voice_coach_off')}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        {/* Massive Start Button */}
        <TouchableOpacity 
          style={[styles.startButton, { backgroundColor: colors.main, shadowColor: colors.main }]}
          onPress={() => router.push(`/run?mode=${mode}`)}
        >
          <Text style={styles.startButtonText}>{t('start_run')}</Text>
          <Ionicons name="play" size={28} color="#000" />
        </TouchableOpacity>

      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('lang_select')}</Text>
            {LANGS.map(lang => (
              <TouchableOpacity 
                key={lang} 
                style={styles.langOption} 
                onPress={() => { i18n.changeLanguage(lang); setLangModalVisible(false); }}
              >
                <Text style={[styles.langOptionText, i18n.language === lang && styles.langOptionTextActive]}>
                  {LANG_LABELS[lang]}
                </Text>
                {i18n.language === lang && <Ionicons name="checkmark-circle" size={20} color="#39FF14" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setLangModalVisible(false)}>
              <Text style={styles.modalCloseText}>{t('close_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Goal Customization Modal */}
      <Modal visible={goalModalVisible} animationType="slide" transparent={true}>
        <View style={styles.goalModalOverlay}>
          <View style={styles.goalModalContent}>
            <Text style={styles.goalModalTitle}>{t('weekly_goal_title')}</Text>
            <Text style={styles.goalModalDesc}>{t('weekly_goal_desc')}</Text>
            
            <View style={styles.goalAdjuster}>
              <TouchableOpacity onPress={() => setTempGoal(Math.max(5, tempGoal - 5))} style={styles.goalBtn}>
                <Ionicons name="remove" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.goalValueText}>{tempGoal} km</Text>
              <TouchableOpacity onPress={() => setTempGoal(Math.min(200, tempGoal + 5))} style={styles.goalBtn}>
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveGoal}>
                <Text style={styles.confirmBtnText}>{t('btn_save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Voice Coach Modal */}
      <Modal visible={coachModalVisible} animationType="slide" transparent={true}>
        <View style={styles.goalModalOverlay}>
          <View style={styles.goalModalContent}>
            <Text style={styles.goalModalTitle}>{t('voice_coach_settings')}</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{t('pacemaker_active')}</Text>
              <Switch 
                value={tempCoach.isPaceMakerActive}
                onValueChange={(v) => setTempCoach({...tempCoach, isPaceMakerActive: v})}
                trackColor={{ false: '#333', true: colors.main }}
              />
            </View>

            {tempCoach.isPaceMakerActive && (
              <>
                <Text style={styles.goalModalDesc}>{t('target_dist_km')}</Text>
                <View style={styles.goalAdjuster}>
                  <TouchableOpacity onPress={() => setTempCoach({...tempCoach, targetDistanceKm: Math.max(1, tempCoach.targetDistanceKm - 1)})} style={styles.goalBtn}><Ionicons name="remove" size={24} color="#FFF" /></TouchableOpacity>
                  <Text style={styles.goalValueText}>{tempCoach.targetDistanceKm} km</Text>
                  <TouchableOpacity onPress={() => setTempCoach({...tempCoach, targetDistanceKm: Math.min(100, tempCoach.targetDistanceKm + 1)})} style={styles.goalBtn}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
                </View>

                <Text style={styles.goalModalDesc}>{t('target_time_min')}</Text>
                <View style={styles.goalAdjuster}>
                  <TouchableOpacity onPress={() => setTempCoach({...tempCoach, targetTimeMinutes: Math.max(1, tempCoach.targetTimeMinutes - 1)})} style={styles.goalBtn}><Ionicons name="remove" size={24} color="#FFF" /></TouchableOpacity>
                  <Text style={styles.goalValueText}>{tempCoach.targetTimeMinutes}</Text>
                  <TouchableOpacity onPress={() => setTempCoach({...tempCoach, targetTimeMinutes: Math.min(600, tempCoach.targetTimeMinutes + 1)})} style={styles.goalBtn}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
                </View>
                
                <Text style={{ color: colors.main, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' }}>
                  {t('expected_pace', { m: Math.floor(tempCoach.targetTimeMinutes / tempCoach.targetDistanceKm), s: Math.round((tempCoach.targetTimeMinutes / tempCoach.targetDistanceKm % 1) * 60) })}
                </Text>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#333' }}>
              <Text style={{ color: '#CCC' }}>{t('speak_dist_event')}</Text>
              <Switch value={tempCoach.speakDistanceEvent} onValueChange={(v) => setTempCoach({...tempCoach, speakDistanceEvent: v})} trackColor={{ true: colors.main }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 20 }}>
              <Text style={{ color: '#CCC' }}>{t('speak_time_event')}</Text>
              <Switch value={tempCoach.speakTimeEvent} onValueChange={(v) => setTempCoach({...tempCoach, speakTimeEvent: v})} trackColor={{ true: colors.main }} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCoachModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.main }]} onPress={handleSaveCoach}>
                <Text style={{...styles.confirmBtnText, color: '#000'}}>{t('btn_save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  greeting: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  appTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  neonText: {
    color: '#39FF14', // Neon Green Accents
  },
  mileageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 255, 20, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
  },
  mileageText: {
    color: '#39FF14',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  statsLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00F0FF', // Neon Blue Accent
    borderRadius: 4,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 6,
    marginBottom: 32,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeText: {
    color: '#888',
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFF',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionText: {
    color: '#FFF',
    marginTop: 12,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#39FF14',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 100,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    gap: 12,
  },
  startButtonText: {
    color: '#000',
    fontSize: 22,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#151515',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  langOptionText: {
    color: '#888',
    fontSize: 16,
  },
  langOptionTextActive: {
    color: '#39FF14',
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    marginTop: 20,
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  modalCloseText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  goalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalModalContent: {
    backgroundColor: '#111',
    width: '85%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  goalModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  goalModalDesc: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
  },
  goalAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
  },
  goalBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalValueText: {
    color: '#00F0FF',
    fontSize: 36,
    fontWeight: '900',
    width: 100,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  confirmBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#00F0FF',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#000',
    fontWeight: 'bold',
  }
});
