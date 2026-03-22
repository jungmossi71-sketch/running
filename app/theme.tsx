import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useThemeContext, AppThemeType } from '../context/ThemeContext';
import { useHistoryContext } from '../context/HistoryContext';

export default function ThemeStoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { customBackgroundUri, setCustomBackgroundUri, appTheme, setAppTheme, colors, unlockedThemes, unlockTheme } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../context/ThemeContext');
  const { mileageBalance, spendMileage } = useHistoryContext();

  const handleThemePress = (themeId: AppThemeType, price: number) => {
    if (themeId === 'default' || unlockedThemes.includes(themeId)) {
        setAppTheme(themeId);
    } else {
        Alert.alert(
            t('unlock_title'),
            t('unlock_msg', { price, balance: Math.floor(mileageBalance) }),
            [
                { text: t('btn_cancel'), style: 'cancel' },
                { text: t('btn_buy'), onPress: async () => {
                    if (await spendMileage(price)) {
                        await unlockTheme(themeId);
                        setAppTheme(themeId);
                        Alert.alert(t('unlock_success_title'), t('unlock_success_msg'));
                    } else {
                        Alert.alert(t('no_mileage_title'), t('no_mileage_msg', { shortfall: price - Math.floor(mileageBalance) }));
                    }
                }}
            ]
        );
    }
  };

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // 웹과 모바일의 범용성을 위해 일단 이미지 우선
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setCustomBackgroundUri(result.assets[0].uri);
    }
  };

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
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('theme_store_title').split(' ')[0]} <Text style={styles.neonText}>{t('theme_store_title').split(' ')[1] || ''}</Text></Text>
        <View style={styles.mileageBadge}>
          <Ionicons name="flash" size={16} color="#39FF14" />
          <Text style={styles.mileageText}>{mileageBalance.toFixed(1)} M</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>{t('run_to_earn')}</Text>
          <Text style={styles.heroSubtitle}>{t('r2e_desc')}</Text>
        </View>

        {/* Free Customization Section */}
        <Text style={styles.sectionTitle}>{t('free_custom_ui')}</Text>
        
        {customBackgroundUri ? (
          <TouchableOpacity style={[styles.customUploadCard, styles.customUploadCardFilled]} onPress={pickMedia}>
            <ImageBackground source={{ uri: customBackgroundUri }} style={styles.customMediaPreview} imageStyle={{ borderRadius: 19 }}>
              <View style={styles.changeOverlay}>
                <Ionicons name="camera-reverse" size={24} color="#FFF" />
                <Text style={styles.changeOverlayText}>Change Background</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.customUploadCard} onPress={pickMedia}>
            <Ionicons name="image-outline" size={40} color="#888" />
            <Text style={styles.customUploadText}>{t('upload_gallery')}</Text>
          </TouchableOpacity>
        )}

        {/* Premium Neon Themes */}
        <Text style={styles.sectionTitle}>{t('premium_neons')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} style={{marginBottom: 40}}>
          
          {/* Default Theme */}
          <TouchableOpacity 
            style={[styles.themeCard, { borderColor: appTheme === 'default' ? '#39FF14' : '#333' }]}
            onPress={() => setAppTheme('default')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#111' }]}>
              <Ionicons name="color-palette" size={40} color="#39FF14" />
            </View>
            <View style={styles.themeInfo}>
              <Text style={styles.themeName} numberOfLines={1} adjustsFontSizeToFit>기본 (Default)</Text>
              {appTheme === 'default' ? (
                <View style={[styles.priceBtn, { backgroundColor: 'rgba(57,255,20,0.2)' }]}>
                  <Text style={[styles.priceText, { color: '#39FF14' }]}>선택됨</Text>
                </View>
              ) : (
                <View style={[styles.priceBtn, { backgroundColor: '#333' }]}>
                  <Text style={[styles.priceText, { color: '#888' }]}>무료 적용</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Cyberpunk Theme */}
          <TouchableOpacity 
            style={[styles.themeCard, { borderColor: appTheme === 'cyberpunk' ? '#FF00FF' : '#333' }]}
            onPress={() => handleThemePress('cyberpunk', 50)}
          >
            <View style={[styles.themePreview, { backgroundColor: '#200030' }]}>
              <Ionicons name="color-palette" size={40} color="#FF00FF" />
            </View>
            <View style={styles.themeInfo}>
              <Text style={styles.themeName} numberOfLines={1} adjustsFontSizeToFit>{t('cyberpunk_purple')}</Text>
              {appTheme === 'cyberpunk' ? (
                <View style={[styles.priceBtn, { backgroundColor: 'rgba(255,0,255,0.2)' }]}>
                  <Text style={[styles.priceText, { color: '#FF00FF' }]}>선택됨</Text>
                </View>
              ) : unlockedThemes.includes('cyberpunk') ? (
                <View style={[styles.priceBtn, { backgroundColor: '#333' }]}>
                  <Text style={[styles.priceText, { color: '#888' }]}>{t('equip')}</Text>
                </View>
              ) : (
                <View style={[styles.priceBtn, { backgroundColor: '#333' }]}>
                  <Ionicons name="flash" size={14} color="#888" />
                  <Text style={[styles.priceText, { color: '#888' }]}>{t('cost_m', { price: 50 })}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Electric Blue Theme */}
          <TouchableOpacity 
            style={[styles.themeCard, { borderColor: appTheme === 'electric_blue' ? '#00BFFF' : '#333' }]}
            onPress={() => handleThemePress('electric_blue', 100)}
          >
            <View style={[styles.themePreview, { backgroundColor: '#002030' }]}>
              <Ionicons name="color-palette" size={40} color="#00BFFF" />
            </View>
            <View style={styles.themeInfo}>
              <Text style={styles.themeName} numberOfLines={1} adjustsFontSizeToFit>{t('electric_blue')}</Text>
              {appTheme === 'electric_blue' ? (
                <View style={[styles.priceBtn, { backgroundColor: 'rgba(0,191,255,0.2)' }]}>
                  <Text style={[styles.priceText, { color: '#00BFFF' }]}>선택됨</Text>
                </View>
              ) : unlockedThemes.includes('electric_blue') ? (
                <View style={[styles.priceBtn, { backgroundColor: '#333' }]}>
                  <Text style={[styles.priceText, { color: '#888' }]}>{t('equip')}</Text>
                </View>
              ) : (
                <View style={[styles.priceBtn, { backgroundColor: '#333' }]}>
                  <Ionicons name="flash" size={14} color="#888" />
                  <Text style={[styles.priceText, { color: '#888' }]}>{t('cost_m', { price: 100 })}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

        </ScrollView>

        {/* Exclusive Pro Dashboards */}
        <Text style={styles.sectionTitle}>{t('exclusive_pro_huds')}</Text>
        <View style={styles.themeGrid}>
          
          <View style={[styles.themeGridCard, { borderColor: '#FF1493' }]}>
            <View style={[styles.themePreview, { backgroundColor: '#300010', height: 160 }]}>
              <Ionicons name="speedometer-outline" size={60} color="#FF1493" />
            </View>
            <View style={styles.themeInfo}>
              <Text style={styles.themeName} numberOfLines={1} adjustsFontSizeToFit>{t('marathon_elite_hud')}</Text>
              <TouchableOpacity style={styles.priceBtnSpecial}>
                <Ionicons name="flash" size={14} color="#FFF" />
                <Text style={styles.priceTextSpecial}>2,500 M</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  neonText: {
    color: '#B026FF',
  },
  mileageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 255, 20, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
  },
  mileageText: {
    color: '#39FF14',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingBottom: 60,
  },
  heroBanner: {
    backgroundColor: 'rgba(20, 0, 30, 0.85)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(176, 38, 255, 0.4)',
  },
  heroTitle: {
    color: '#B026FF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#FFF',
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    marginHorizontal: 24,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  customUploadCard: {
    height: 120,
    marginHorizontal: 24,
    marginBottom: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,5,0.85)',
  },
  customUploadText: {
    color: '#888',
    marginTop: 8,
    fontWeight: '600',
  },
  customUploadCardFilled: {
    borderStyle: 'solid',
    borderColor: '#39FF14',
    padding: 0,
    backgroundColor: 'transparent',
  },
  customMediaPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  changeOverlayText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  horizontalScroll: {
    marginBottom: 40,
  },
  horizontalScrollContent: {
    paddingLeft: 24,
    paddingRight: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 19, // Leaves precisely 24px of edge padding (19 + 5 child margin)
    marginBottom: 40,
  },
  themeGridCard: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#111',
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  themeCard: {
    width: 200,
    marginRight: 16,
    backgroundColor: '#111',
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  themePreview: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeInfo: {
    padding: 16,
  },
  themeName: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
  },
  priceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#39FF14',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  priceText: {
    color: '#000',
    fontWeight: '900',
  },
  priceBtnSpecial: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF1493',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  priceTextSpecial: {
    color: '#FFF',
    fontWeight: '900',
  }
});
