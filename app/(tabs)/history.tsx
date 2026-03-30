import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, ImageBackground, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../context/ThemeContext';
import { useHistoryContext, RunRecord } from '../../context/HistoryContext';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
// @ts-ignore
import Map from '../../components/Map';

export default function HistoryScreen() {
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [fullScreenRoute, setFullScreenRoute] = useState<any[] | null>(null);
  const { t } = useTranslation();
  const { customBackgroundUri, appTheme, colors } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../../context/ThemeContext');
  const { history, deleteRun } = useHistoryContext();

  const handleDelete = (id: string) => {
    Alert.alert(
      t('delete_confirm_title'),
      t('delete_confirm_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRun(id);
            } catch (e) {
              Alert.alert('오류', '기록 삭제에 실패했습니다. 다시 시도해 주세요.');
            }
          }
        }
      ]
    );
  };

  const handleShare = async (run: RunRecord) => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
      return;
    }
    const text = `🏃 Happy Run 기록\n\n📅 ${run.date}\n🏷 ${run.title}\n📏 ${run.distance} km\n⏱ ${run.time}\n⚡ ${run.pace} /km\n\nHappy Run 앱으로 기록했습니다.`;
    // expo-sharing은 파일 공유만 지원하므로 텍스트를 임시 파일로 저장 후 공유
    const fileUri = (FileSystem.cacheDirectory ?? '') + `run_${run.id}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: '런 기록 공유' });
  };

  return (
    <ImageBackground 
      source={
        customBackgroundUri 
          ? { uri: customBackgroundUri } 
          : THEME_BACKGROUNDS[appTheme]
      } 
      style={[styles.container, !customBackgroundUri && appTheme === 'default' && { backgroundColor: '#0A0A0A' }]}
      imageStyle={{ opacity: 0.3 }}
    >
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>{t('history_title').split(' ')[0]} <Text style={[styles.neonText, { color: colors.main }]}>{t('history_title').split(' ')[1] || ''}</Text></Text>
          <Text style={styles.subtitle}>{t('history_subtitle')}</Text>
        </View>
        {history.length === 0 ? (
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 40, fontSize: 16 }}>
            {t('no_history') || '아직 달린 기록이 없습니다. 시작해 보세요!'}
          </Text>
        ) : (
          history.map(run => (
            <TouchableOpacity key={run.id} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.dateBadge, { backgroundColor: `${colors.sub}20` }]}>
                  <Ionicons name="calendar-outline" size={14} color={colors.sub} />
                  <Text style={[styles.dateText, { color: colors.sub }]}>{run.date}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => handleShare(run)}>
                    <Ionicons name="share-outline" size={20} color={colors.sub} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(run.id)}>
                    <Ionicons name="trash-outline" size={20} color="#FF4444" />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color="#555" />
                </View>
              </View>

              <Text style={styles.runTitle}>{run.title}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{run.distance}</Text>
                  <Text style={styles.statLbl}>KM</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{run.time}</Text>
                  <Text style={styles.statLbl}>{t('time_label')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{run.pace}</Text>
                  <Text style={styles.statLbl}>PACE</Text>
                </View>
              </View>

              {/* Mini Map Toggle */}
              <TouchableOpacity 
                style={[styles.miniMap, { backgroundColor: `${colors.main}10`, borderColor: `${colors.main}30` }]}
                onPress={() => setExpandedMapId(expandedMapId === run.id ? null : run.id)}
              >
                <Ionicons name="map" size={24} color={colors.main} />
                <Text style={[styles.mapText, { color: colors.main }]}>
                  {expandedMapId === run.id ? '지도 닫기 (Close Map)' : `${t('view_gps_map')} (${run.route ? run.route.length : 0} points)`}
                </Text>
              </TouchableOpacity>
              
              {expandedMapId === run.id && run.route && run.route.length > 0 && (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={{ height: 220, marginTop: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: `${colors.main}50` }}
                  onPress={() => setFullScreenRoute(run.route)}
                >
                  <Map route={run.route} lineColor={colors.main} />
                  <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{t('click_fullscreen') || '클릭하여 크게보기 🔍'}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}

      </ScrollView>

      {/* Full Screen Map Modal */}
      <Modal visible={!!fullScreenRoute} animationType="slide" transparent={false}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ flex: 1 }}>
              {fullScreenRoute && <Map route={fullScreenRoute} lineColor={colors.main} />}
              
              {/* Overlay Close Button */}
              <TouchableOpacity 
                style={{ 
                  position: 'absolute', 
                  top: 50, 
                  right: 20, 
                  width: 44, 
                  height: 44, 
                  borderRadius: 22, 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)'
                }}
                onPress={() => setFullScreenRoute(null)}
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>

              <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>GPS Route Summary</Text>
              </View>
            </View>
          </SafeAreaView>
      </Modal>

    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 100 },
  header: { 
    marginBottom: 30,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  appTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  neonText: { color: '#00F0FF' },
  subtitle: { color: '#888', marginTop: 8 },
  historyCard: {
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 240, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  dateText: { color: '#00F0FF', fontWeight: 'bold', fontSize: 12 },
  runTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statItem: { alignItems: 'flex-start' },
  statVal: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  statLbl: { color: '#888', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  miniMap: {
    height: 50,
    backgroundColor: 'rgba(57, 255, 20, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.2)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mapText: { color: '#39FF14', fontWeight: 'bold', fontSize: 13 }
});
