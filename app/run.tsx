import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, ImageBackground, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../context/ThemeContext';
import { useHistoryContext } from '../context/HistoryContext';
import { useVoiceCoachContext } from '../context/VoiceCoachContext';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid, ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore
import Map from '../components/Map';

const { width, height } = Dimensions.get('window');

function getTTSLanguage(lang: string) {
  switch(lang) {
    case 'en': return 'en-US';
    case 'zh': return 'zh-CN';
    case 'ja': return 'ja-JP';
    case 'es': return 'es-ES';
    case 'hi': return 'hi-IN';
    case 'ko':
    default: return 'ko-KR';
  }
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export default function ActiveRunScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  const isIndoor = mode === 'indoor';

  const [isPaused, setIsPaused] = useState(false);
  const { t, i18n } = useTranslation();
  const { customBackgroundUri, appTheme, colors } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../context/ThemeContext');
  const { addRun } = useHistoryContext();
  const { config: coachConfig } = useVoiceCoachContext();

  const [seconds, setSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [route, setRoute] = useState<{latitude: number, longitude: number}[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  
  const isPausedRef = useRef(isPaused);
  const lastSpokenKm = useRef(0);
  const lastSpokenMin = useRef(0);
  
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  // GPS Tracking logic
  useEffect(() => {
    if (isIndoor) {
      // 실내 러닝일 경우 GPS 측정 중단 (배터리 및 프라이버시 고려)
      // 대신 임의의 평균 속도로 가상 거리 축적 타이머 등록 (예: 시속 8km 가정 시 초당 0.00222km)
      let indoorInterval: NodeJS.Timeout;
      if (!isPaused) {
         indoorInterval = setInterval(() => {
            setDistanceKm(d => d + 0.00222);
         }, 1000);
      }
      return () => { if (indoorInterval) clearInterval(indoorInterval); };
    }

    let sub: Location.LocationSubscription | null = null;
    (async () => {
      // 웹 환경 등 퍼미션 에러 방지 처리
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' }));
      
      if (fgStatus !== 'granted') return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          if (!isPausedRef.current) {
            const newCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setRoute(prev => {
              if (prev.length > 0) {
                const last = prev[prev.length - 1];
                const d = getDistanceKm(last.latitude, last.longitude, newCoord.latitude, newCoord.longitude);
                setDistanceKm(currDist => currDist + d);
              }
              return [...prev, newCoord];
            });
          }
        }
      );

      if (bgStatus === 'granted') {
        await Location.startLocationUpdatesAsync('background-location-task', {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "ANTIGRAVITY.RUN",
            notificationBody: "Tracking your run...",
            notificationColor: "#39FF14",
          }
        }).catch(e => console.warn('Background Location error:', e));
      }

    })();
    return () => { 
      if (sub && typeof sub.remove === 'function') {
        try {
          sub.remove();
        } catch (e) {
          // Expo Web Location bug
        }
      }
      Location.stopLocationUpdatesAsync('background-location-task').catch(() => {});
    };
  }, [isIndoor, isPaused]);

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Video pick error', e);
    }
  };

  const formatTime = (totalS: number) => {
    const m = Math.floor(totalS / 60);
    const s = totalS % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentPace = distanceKm > 0 ? (seconds / 60) / distanceKm : 0;
  const paceM = Math.floor(currentPace);
  const paceS = Math.floor((currentPace - paceM) * 60);
  const formattedPace = distanceKm > 0 ? `${paceM}'${paceS < 10 ? '0' : ''}${paceS}"` : `-'-"`;

  // --- Smart Voice Coach Engine ---
  useEffect(() => {
    if ((!coachConfig.isPaceMakerActive && !coachConfig.speakDistanceEvent) || distanceKm === 0) return;

    const currentKmFloor = Math.floor(distanceKm);
    
    if (currentKmFloor > lastSpokenKm.current) {
      lastSpokenKm.current = currentKmFloor;
      
      let paceFeedback = '';
      if (coachConfig.isPaceMakerActive) {
        const targetPaceTotalSec = (coachConfig.targetTimeMinutes / coachConfig.targetDistanceKm) * 60;
        const currentPaceTotalSec = paceM * 60 + paceS;
        
        if (currentPaceTotalSec > targetPaceTotalSec + 15) {
          paceFeedback = t('speech_pace_slow');
        } else if (currentPaceTotalSec < targetPaceTotalSec - 15) {
          paceFeedback = t('speech_pace_fast');
        } else {
          paceFeedback = t('speech_pace_perfect');
        }
      }

      const text = t('speech_km_passed', { km: currentKmFloor, m: paceM, s: paceS, feedback: paceFeedback });
      
      Audio.setAudioModeAsync({ 
        playsInSilentModeIOS: true, 
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true
      }).then(() => {
        Speech.speak(text, { 
          language: getTTSLanguage(i18n.language), 
          rate: 1.05,
          onDone: () => {
            Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
              interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
              shouldDuckAndroid: false,
            }).catch(() => {});
          }
        });
      });
    }
  }, [distanceKm]);

  useEffect(() => {
    if (!coachConfig.speakTimeEvent || seconds === 0) return;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0 && minutes % 5 === 0 && minutes > lastSpokenMin.current) {
      lastSpokenMin.current = minutes;
      const text = t('speech_time_passed', { min: minutes, km: distanceKm.toFixed(1) });
      
      Audio.setAudioModeAsync({ 
        playsInSilentModeIOS: true, 
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true
      }).then(() => {
        Speech.speak(text, { 
          language: getTTSLanguage(i18n.language), 
          rate: 1.05,
          onDone: () => {
            Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
              interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
              shouldDuckAndroid: false,
            }).catch(() => {});
          }
        });
      });
    }
  }, [seconds]);

  const handleStopRun = async () => {
    // 거리가 조금이라도 있거나 시간이 흐른 경우에만 로컬 저장소에 기록
    if (distanceKm > 0.01 || seconds > 3) {
      const today = new Date();
      const dateStr = today.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      await addRun({
        date: dateStr,
        title: 'Free Run',
        distance: distanceKm.toFixed(2),
        pace: formattedPace,
        time: formatTime(seconds),
        route: route,
      });
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Background Media Placeholder (In real app: expo-av Video or local Image) */}
      <ImageBackground 
        source={
          customBackgroundUri 
            ? { uri: customBackgroundUri } 
            : appTheme === 'cyberpunk' ? THEME_BACKGROUNDS.cyberpunk 
            : appTheme === 'electric_blue' ? THEME_BACKGROUNDS.electric_blue 
            : { uri: 'https://images.unsplash.com/photo-1541252876598-6aa76d05afec' }
        } 
        style={styles.backgroundMedia}
        imageStyle={{ opacity: customBackgroundUri || appTheme !== 'default' ? 0.6 : 0.4 }}
      >
        <SafeAreaView style={styles.safeArea}>
          
          {/* Top Bar: Back & Media Settings */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="chevron-down" size={28} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.mediaControls}>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="image" size={20} color={colors.sub} />
                <Text style={styles.mediaBtnText}>{t('run_background')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton} onPress={handlePickVideo}>
                <Ionicons name="videocam" size={20} color={colors.main} />
                <Text style={styles.mediaBtnText}>{t('run_video')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Center Stats (Glassmorphism Overlay) */}
            <View style={styles.statsContainer}>
              <Text style={[styles.timeText, { color: colors.main }]} adjustsFontSizeToFit numberOfLines={1}>{formatTime(seconds)}</Text>
              
              <View style={styles.rowStats}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{distanceKm.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>{t('kilometers').toUpperCase()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{formattedPace}</Text>
                  <Text style={styles.statLabel}>AVG PACE</Text>
                </View>
              </View>
              
              <View style={styles.heartRateBox}>
                <Ionicons name="heart" size={20} color="#FF1493" />
                <Text style={styles.hrText}>-- BPM</Text>
              </View>
            </View>

            {/* Real GPS Map or Video Interface */}
            <View style={[styles.mapContainer, isIndoor && { height: 280, borderColor: colors.sub }]}>
              {isIndoor ? (
                videoUri ? (
                  <Video
                    source={{ uri: videoUri }}
                    style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden' }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={!isPaused}
                    isLooping
                    isMuted
                  />
                ) : (
                  <TouchableOpacity 
                    style={{ alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}
                    onPress={handlePickVideo}
                  >
                    <Ionicons name="film-outline" size={40} color={colors.sub} style={{ marginBottom: 10 }} />
                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>{t('upload_gallery')} 🎬</Text>
                    <Text style={{ color: '#888', fontSize: 11, marginTop: 6, paddingHorizontal: 30, textAlign: 'center', lineHeight: 16 }}>
                      실내 트레드밀 모드입니다. 달리는 동안 시청할 영화, 드라마, 혹은 유튜브 녹화 영상을 추가하세요. 화면 밖 배경으로 자연스럽게 어우러집니다.
                    </Text>
                  </TouchableOpacity>
                )
              ) : (
                <Map route={route} lineColor={colors.main} />
              )}
            </View>
          </ScrollView>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={[styles.playPauseBtn, isPaused && styles.playPauseBtnPaused]}
              onPress={() => setIsPaused(!isPaused)}
            >
              <Ionicons name={isPaused ? "play" : "pause"} size={36} color="#000" />
            </TouchableOpacity>
            
            {isPaused && (
              <TouchableOpacity style={styles.stopBtn} onPress={handleStopRun}>
                <Ionicons name="square" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>

        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundMedia: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingVertical: 20,
    gap: 30, // 통계창과 지도 사이에 충분한 간격 부여
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaControls: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mediaBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    marginHorizontal: 16,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapOverlay: {
    alignItems: 'center',
  },
  mapLoadingText: {
    color: '#39FF14',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  mapSubText: {
    color: '#AAA',
    fontSize: 10,
    marginTop: 4,
  },
  statsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 5, 5, 0.75)',
    marginHorizontal: 30,
    paddingVertical: 40,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  timeText: {
    fontSize: 80,
    fontWeight: '900',
    color: '#39FF14', // Neon Green
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(57, 255, 20, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  rowStats: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 4,
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heartRateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(255, 20, 147, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  hrText: {
    color: '#FF1493',
    fontWeight: '700',
    fontSize: 16,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 20,
  },
  playPauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#39FF14',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  playPauseBtnPaused: {
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
  },
  stopBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
