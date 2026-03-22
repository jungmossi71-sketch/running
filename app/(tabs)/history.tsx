import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../context/ThemeContext';
import { useHistoryContext } from '../../context/HistoryContext';
// @ts-ignore
import Map from '../../components/Map';

export default function HistoryScreen() {
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const { t } = useTranslation();
  const { customBackgroundUri, appTheme, colors } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../../context/ThemeContext');
  const { history } = useHistoryContext();

  return (
    <ImageBackground 
      source={
        customBackgroundUri 
          ? { uri: customBackgroundUri } 
          : appTheme === 'cyberpunk' ? THEME_BACKGROUNDS.cyberpunk 
          : appTheme === 'electric_blue' ? THEME_BACKGROUNDS.electric_blue 
          : undefined
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
                <Ionicons name="chevron-forward" size={20} color="#555" />
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
                <View style={{ height: 220, marginTop: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: `${colors.main}50` }}>
                  <Map route={run.route} lineColor={colors.main} />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
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
