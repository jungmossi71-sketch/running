import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, ImageBackground, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useThemeContext } from '../../context/ThemeContext';
import { useBuilderContext, RoutineSegment, SegmentType } from '../../context/BuilderContext';

const { width } = Dimensions.get('window');

const BLOCK_COLORS: Record<SegmentType, string> = {
  warmup: '#FFA500',
  steady: '#00F0FF',
  interval: '#FF1493',
  recovery: '#39FF14',
  cooldown: '#B026FF'
};

const BLOCK_ICONS: Record<SegmentType, any> = {
  warmup: 'sunny',
  steady: 'analytics',
  interval: 'flame',
  recovery: 'walk',
  cooldown: 'snow'
};

export default function BuilderScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { customBackgroundUri, appTheme, colors } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../../context/ThemeContext');
  const { currentRoutine, addSegment, removeSegment, updateSegment, presets, loadPreset, saveAsPreset, deletePreset, clearRoutine } = useBuilderContext();

  // Modal & Selection State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);

  const selectedSegment = currentRoutine.find(s => s.id === selectedSegmentId);

  const handleOpenEdit = (id: string) => {
    setSelectedSegmentId(id);
    setIsEditModalVisible(true);
  };

  const handleSaveRoutine = async () => {
    if (!presetName.trim()) return;
    await saveAsPreset(presetName);
    setPresetName('');
    setIsSaveModalVisible(false);
  };

  const handleStartRun = () => {
    if (currentRoutine.length === 0) return;
    router.push(`/run?mode=outdoor&source=builder`);
  };

  // Calculate Summary
  const totalTime = currentRoutine.reduce((acc, s) => s.targetType === 'time' ? acc + s.value : acc + (s.value * 5), 0); // Assume 5min/km for est
  const totalDist = currentRoutine.reduce((acc, s) => s.targetType === 'distance' ? acc + s.value : acc + (s.value / 5), 0); // Assume 5min/km for est

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.appTitle}>{t('builder_title').split(' ')[0]} <Text style={[styles.neonText, { color: colors.main }]}>{t('builder_title').split(' ')[1] || ''}</Text></Text>
              <Text style={styles.subtitle}>{t('builder_subtitle')}</Text>
            </View>
            <TouchableOpacity onPress={clearRoutine} style={styles.clearBtn}>
              <Ionicons name="refresh" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Routine Summary Stats */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{totalTime.toFixed(0)}</Text>
            <Text style={styles.summaryLbl}>EST. MIN</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{totalDist.toFixed(1)}</Text>
            <Text style={styles.summaryLbl}>EST. KM</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{currentRoutine.length}</Text>
            <Text style={styles.summaryLbl}>BLOCKS</Text>
          </View>
        </View>

        {/* Build Timeline */}
        <View style={styles.blocksContainer}>
          {currentRoutine.length === 0 ? (
            <View style={styles.emptyBoard}>
              <Ionicons name="construct-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={{ color: '#555', marginTop: 10 }}>루틴을 구성해 보세요.</Text>
            </View>
          ) : (
            currentRoutine.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.block, { borderColor: `${BLOCK_COLORS[item.type]}40` }]}
                onPress={() => handleOpenEdit(item.id)}
              >
                <View style={styles.blockRow}>
                  <View style={[styles.typeIndicator, { backgroundColor: BLOCK_COLORS[item.type] }]} />
                  <Ionicons name={BLOCK_ICONS[item.type]} size={20} color={BLOCK_COLORS[item.type]} />
                  <View style={styles.blockText}>
                    <Text style={styles.blockName}>{item.type.toUpperCase()}</Text>
                    <Text style={styles.blockDetails}>
                        {item.value} {item.targetType === 'time' ? 'MIN' : 'KM'}
                        {item.targetPaceM ? ` • ${item.targetPaceM}'${item.targetPaceS || '00'}"` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeSegment(item.id)}>
                    <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

          {/* Add Menu Toggle */}
          <View style={{ marginTop: 10 }}>
            {isAddMenuVisible ? (
              <View style={styles.addMenu}>
                {(['warmup', 'steady', 'interval', 'recovery', 'cooldown'] as SegmentType[]).map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.addMenuItem, { backgroundColor: `${BLOCK_COLORS[type]}20`, borderColor: BLOCK_COLORS[type] }]}
                    onPress={() => {
                        addSegment(type);
                        setIsAddMenuVisible(false);
                    }}
                  >
                    <Ionicons name={BLOCK_ICONS[type]} size={18} color={BLOCK_COLORS[type]} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addMenuClose} onPress={() => setIsAddMenuVisible(false)}>
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.addBlockBtn, { borderColor: `${colors.main}40` }]}
                onPress={() => setIsAddMenuVisible(true)}
              >
                <Ionicons name="add" size={24} color={colors.main} />
                <Text style={[styles.addBlockText, { color: colors.main }]}>{t('add_segment')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Starter Presets Section */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>{t('starter_presets')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {presets.length === 0 ? (
                <TouchableOpacity style={styles.presetCard} onPress={() => {
                    clearRoutine();
                    addSegment('warmup');
                    addSegment('interval');
                    addSegment('recovery');
                    addSegment('interval');
                    addSegment('cooldown');
                }}>
                    <Text style={styles.presetTitle}>Basic Intervals</Text>
                    <Text style={styles.presetDesc}>Warmup + 2x Sprints</Text>
                </TouchableOpacity>
            ) : (
                presets.map(p => (
                    <View key={p.id} style={styles.presetCardContainer}>
                      <TouchableOpacity style={styles.presetCard} onPress={() => loadPreset(p.id)}>
                          <Text style={styles.presetTitle} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.presetDesc}>{p.segments.length} segments</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.presetDeleteBtn} onPress={() => deletePreset(p.id)}>
                        <Ionicons name="trash-outline" size={14} color="rgba(255,255,255,0.4)" />
                      </TouchableOpacity>
                    </View>
                ))
            )}
          </ScrollView>
        </View>

        {/* Main Save & Launch */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
             style={[styles.miniSaveBtn, { borderColor: `${colors.main}50`, opacity: currentRoutine.length > 0 ? 1 : 0.5 }]}
             onPress={() => setIsSaveModalVisible(true)}
             disabled={currentRoutine.length === 0}
          >
            <Ionicons name="save-outline" size={20} color={colors.main} />
          </TouchableOpacity>

          <TouchableOpacity 
             style={[styles.saveButton, { flex: 1, backgroundColor: colors.main, shadowColor: colors.main, opacity: currentRoutine.length > 0 ? 1 : 0.5 }]}
             onPress={handleStartRun}
             disabled={currentRoutine.length === 0}
          >
            <Text style={styles.saveButtonText}>{t('save_start').toUpperCase()}</Text>
            <Ionicons name="play" size={24} color="#000" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Segment Edit Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.editCard}>
                  {selectedSegment && (
                      <>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                              <View style={[styles.typeIndicatorLarge, { backgroundColor: BLOCK_COLORS[selectedSegment.type] }]} />
                              <Text style={styles.editTitle}>{selectedSegment.type.toUpperCase()} SETTINGS</Text>
                          </View>

                          <Text style={styles.inputLabel}>TARGET TYPE</Text>
                          <View style={styles.toggleRow}>
                              <TouchableOpacity 
                                style={[styles.toggleBtn, selectedSegment.targetType === 'time' && { backgroundColor: colors.main }]} 
                                onPress={() => updateSegment(selectedSegment.id, { targetType: 'time' })}
                              >
                                  <Text style={[styles.toggleText, selectedSegment.targetType === 'time' && { color: '#000' }]}>TIME</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.toggleBtn, selectedSegment.targetType === 'distance' && { backgroundColor: colors.main }]} 
                                onPress={() => updateSegment(selectedSegment.id, { targetType: 'distance' })}
                              >
                                  <Text style={[styles.toggleText, selectedSegment.targetType === 'distance' && { color: '#000' }]}>DIST</Text>
                              </TouchableOpacity>
                          </View>

                          <Text style={styles.inputLabel}>VALUE ({selectedSegment.targetType === 'time' ? 'MIN' : 'KM'})</Text>
                          <TextInput 
                             style={styles.textInput}
                             keyboardType="numeric"
                             placeholder="5.0"
                             placeholderTextColor="#555"
                             value={selectedSegment.value.toString()}
                             onChangeText={(v) => {
                               const parsed = parseFloat(v);
                               const clamped = isNaN(parsed) ? 0.1 : Math.max(0.1, Math.min(parsed, 999));
                               updateSegment(selectedSegment.id, { value: clamped });
                             }}
                          />

                          <Text style={styles.inputLabel}>TARGET PACE (Optional)</Text>
                          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <TextInput
                                style={[styles.textInput, { flex: 1 }]}
                                keyboardType="numeric"
                                placeholder="Min"
                                value={selectedSegment.targetPaceM?.toString() || ''}
                                onChangeText={(v) => {
                                  const parsed = parseInt(v);
                                  updateSegment(selectedSegment.id, { targetPaceM: isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 59)) });
                                }}
                            />
                            <Text style={{ color: '#FFF' }}>'</Text>
                            <TextInput
                                style={[styles.textInput, { flex: 1 }]}
                                keyboardType="numeric"
                                placeholder="Sec"
                                value={selectedSegment.targetPaceS?.toString() || ''}
                                onChangeText={(v) => {
                                  const parsed = parseInt(v);
                                  updateSegment(selectedSegment.id, { targetPaceS: isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 59)) });
                                }}
                            />
                            <Text style={{ color: '#FFF' }}>"</Text>
                          </View>

                          <TouchableOpacity 
                            style={[styles.doneBtn, { backgroundColor: colors.main }]}
                            onPress={() => setIsEditModalVisible(false)}
                          >
                            <Text style={styles.doneBtnText}>DONE</Text>
                          </TouchableOpacity>
                      </>
                  )}
              </View>
          </View>
      </Modal>

      {/* Routine Save Name Modal */}
      <Modal visible={isSaveModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlayCenter}>
              <View style={styles.saveCard}>
                  <Text style={styles.editTitle}>SAVE ROUTINE</Text>
                  <Text style={styles.inputLabel}>ROUTINE NAME</Text>
                  <TextInput 
                      style={styles.textInput}
                      placeholder="e.g. Morning 5K Sprints"
                      placeholderTextColor="#555"
                      value={presetName}
                      onChangeText={setPresetName}
                      autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 30 }}>
                    <TouchableOpacity 
                      style={[styles.doneBtn, { flex: 1, backgroundColor: '#333' }]}
                      onPress={() => setIsSaveModalVisible(false)}
                    >
                      <Text style={[styles.doneBtnText, { color: '#FFF' }]}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.doneBtn, { flex: 2, backgroundColor: colors.main }]}
                      onPress={handleSaveRoutine}
                    >
                      <Text style={styles.doneBtnText}>SAVE PRESET</Text>
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
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 100 },
  header: {
    marginBottom: 24,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  appTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  neonText: { color: '#00F0FF' },
  subtitle: { color: '#888', marginTop: 8, fontSize: 13 },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  summaryLbl: { color: '#666', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  blocksContainer: { gap: 12, marginBottom: 40 },
  emptyBoard: { height: 180, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  typeIndicator: { width: 4, height: 24, borderRadius: 2, marginRight: 12 },
  blockRow: { flexDirection: 'row', alignItems: 'center' },
  blockText: { marginLeft: 12 },
  blockName: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  blockDetails: { color: '#888', fontSize: 12, marginTop: 2 },
  addBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 8,
  },
  addBlockText: { fontWeight: '800', fontSize: 14 },
  addMenu: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#151515', borderRadius: 20, padding: 10, borderWidth: 1, borderColor: '#333' },
  addMenuItem: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  addMenuClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  presetsSection: { marginBottom: 40 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  presetScroll: { overflow: 'visible' },
  presetCard: { backgroundColor: 'rgba(5, 5, 5, 0.85)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginRight: 12, width: 180 },
  presetTitle: { color: '#FFF', fontWeight: '800', fontSize: 14, marginBottom: 4 },
  presetDesc: { color: '#666', fontSize: 12 },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 20,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  saveButtonText: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  editCard: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, borderTopWidth: 2, borderColor: '#333' },
  editTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  typeIndicatorLarge: { width: 8, height: 32, borderRadius: 4 },
  inputLabel: { color: '#666', fontSize: 12, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#222', alignItems: 'center' },
  toggleText: { color: '#FFF', fontWeight: 'bold' },
  textInput: { backgroundColor: '#222', borderRadius: 12, padding: 15, color: '#FFF', fontSize: 18, fontWeight: '700' },
  doneBtn: { marginTop: 30, padding: 18, borderRadius: 100, alignItems: 'center' },
  doneBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  clearBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bottomActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  miniSaveBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 30 },
  saveCard: { backgroundColor: '#111', borderRadius: 30, padding: 30, borderWidth: 2, borderColor: '#333' },
  presetCardContainer: { position: 'relative', marginRight: 12 },
  presetDeleteBtn: { position: 'absolute', top: -5, right: -5, width: 24, height: 24, borderRadius: 12, backgroundColor: '#222', borderWidth: 1, borderColor: '#444', justifyContent: 'center', alignItems: 'center' }
});
