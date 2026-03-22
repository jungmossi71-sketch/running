import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../context/ThemeContext';

export default function BuilderScreen() {
  const { t } = useTranslation();
  const { customBackgroundUri, appTheme, colors } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../../context/ThemeContext');

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
          <Text style={styles.appTitle}>{t('builder_title').split(' ')[0]} <Text style={[styles.neonText, { color: colors.main }]}>{t('builder_title').split(' ')[1] || ''}</Text></Text>
          <Text style={styles.subtitle}>{t('builder_subtitle')}</Text>
        </View>

        {/* Existing Blocks */}
        <View style={styles.blocksContainer}>
          
          {/* Warmup Block */}
          <View style={[styles.block, { borderColor: 'rgba(255, 165, 0, 0.4)' }]}>
            <View style={styles.blockRow}>
              <Ionicons name="sunny" size={24} color="#FFA500" />
              <View style={styles.blockText}>
                <Text style={styles.blockName}>Warmup Walk</Text>
                <Text style={styles.blockDetails}>5:00 • 10'00"/km</Text>
              </View>
            </View>
            <Ionicons name="menu" size={24} color="#555" />
          </View>

          {/* Interval Sprint Block */}
          <View style={[styles.block, { borderColor: 'rgba(255, 20, 147, 0.4)' }]}>
            <View style={styles.blockRow}>
              <Ionicons name="flame" size={24} color="#FF1493" />
              <View style={styles.blockText}>
                <Text style={styles.blockName}>High Intensity Sprint</Text>
                <Text style={styles.blockDetails}>1:00 • 4'00"/km</Text>
              </View>
            </View>
            <Ionicons name="menu" size={24} color="#555" />
          </View>

          {/* Recovery Jog Block */}
          <View style={[styles.block, { borderColor: 'rgba(57, 255, 20, 0.4)' }]}>
            <View style={styles.blockRow}>
              <Ionicons name="walk" size={24} color="#39FF14" />
              <View style={styles.blockText}>
                <Text style={styles.blockName}>Recovery Jog</Text>
                <Text style={styles.blockDetails}>2:00 • 7'00"/km</Text>
              </View>
            </View>
            <Ionicons name="menu" size={24} color="#555" />
          </View>

          {/* Add New Block Button */}
          <TouchableOpacity style={[styles.addBlockBtn, { borderColor: `${colors.sub}40` }]}>
            <Ionicons name="add" size={24} color={colors.sub} />
            <Text style={[styles.addBlockText, { color: colors.sub }]}>{t('add_segment')}</Text>
          </TouchableOpacity>

        </View>

        {/* Suggested Presets Section */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>{t('starter_presets')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            <TouchableOpacity style={styles.presetCard}>
              <Text style={styles.presetTitle}>Galloway Run-Walk</Text>
              <Text style={styles.presetDesc}>3m Run / 1m Walk x8</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetCard}>
              <Text style={styles.presetTitle}>5K Pace Test</Text>
              <Text style={styles.presetDesc}>Basic speedwork</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={{ ...styles.saveButton, backgroundColor: colors.main, shadowColor: colors.main }}>
          <Text style={{ ...styles.saveButtonText, color: '#000' }}>SAVE & START</Text>
        </TouchableOpacity>

      </ScrollView>
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
    paddingBottom: 100, // Room for bottom tab
  },
  header: {
    marginBottom: 30,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  appTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  neonText: {
    color: '#00F0FF', // Neon Blue
  },
  subtitle: {
    color: '#888',
    marginTop: 8,
    fontSize: 14,
  },
  blocksContainer: {
    gap: 12,
    marginBottom: 40,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  blockText: {
    justifyContent: 'center',
  },
  blockName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  blockDetails: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
  },
  addBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 240, 255, 0.3)',
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    marginTop: 10,
    gap: 8,
  },
  addBlockText: {
    color: '#00F0FF',
    fontWeight: '700',
    fontSize: 16,
  },
  presetsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  routineBoard: {
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    borderRadius: 24,
    padding: 20,
    minHeight: 250,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  presetScroll: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  presetCard: {
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 12,
    width: 200,
  },
  presetTitle: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  presetDesc: {
    color: '#888',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#00F0FF',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  }
});
