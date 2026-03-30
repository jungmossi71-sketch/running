import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, ImageBackground, ScrollView, Modal, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../context/ThemeContext';
import { useHistoryContext } from '../context/HistoryContext';
import { useVoiceCoachContext } from '../context/VoiceCoachContext';
import { useBuilderContext } from '../context/BuilderContext';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid, ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore
import Map from '../components/Map';
import { useKeepAwake } from 'expo-keep-awake';

import { activeRunStore } from '../context/ActiveRunStore';
import Constants from 'expo-constants';

import { Pedometer } from 'expo-sensors';

// Expo Go에서는 백그라운드 Location Task를 지원하지 않으므로 watchPositionAsync로 폴백
const isExpoGo = Constants.executionEnvironment === 'storeClient';

const { width, height } = Dimensions.get('window');

// Helper for distance calculation (shared)
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

const RADIO_STREAMS: Record<string, string> = {
  neon: 'https://nightride.fm/stream/nightride.mp3', 
  lofi: 'https://nightride.fm/stream/synthwave.mp3', 
  power: 'https://nightride.fm/stream/darksynth.mp3',
  classic: 'https://livestreaming-node-3.srg-ssr.ch/srgssr/rsc_fr/mp3/128',
  cadence: 'https://assets.mixkit.co/sfx/preview/mixkit-simple-countdown-beep-sound-2863.mp3'
};

export default function ActiveRunScreen() {
  const router = useRouter();
  const { mode, source } = useLocalSearchParams<{ mode: 'outdoor' | 'indoor', source?: string }>();
  const isIndoor = mode === 'indoor';
  useKeepAwake();

  useEffect(() => {
    // 오디오 모드 초기화 (무음 모드 재생 및 백그라운드 유지)
    const initAudio = async () => {
      try {
        await Audio.setIsEnabledAsync(true);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.log('Audio mode init error', e);
      }
    };
    initAudio();
  }, []);

  const [isPaused, setIsPaused] = useState(false);
  const { t, i18n } = useTranslation();
  const { customBackgroundUri, appTheme, colors } = useThemeContext();
  const { THEME_BACKGROUNDS } = require('../context/ThemeContext');
  const { addRun } = useHistoryContext();
  const { config: coachConfig } = useVoiceCoachContext();
  const { currentRoutine, currentRoutineName } = useBuilderContext();

  const [seconds, setSeconds] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const unlockAnim = useRef(new Animated.Value(1)).current;
  
  // Media states
  const [mediaMode, setMediaMode] = useState<'map' | 'video' | 'music'>('map');
  const [activeChannel, setActiveChannel] = useState('cadence'); // Default to Cadence as requested
  const visualizerAnims = useRef(Array(8).fill(0).map(() => new Animated.Value(0.2))).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioStatus, setAudioStatus] = useState<string>('INIT');
  const [metronomeStatus, setMetronomeStatus] = useState<string>('INIT');
  const [metronomeBpm, setMetronomeBpm] = useState(170);
  const metronomeTimer = useRef<any>(null);
  const metronomeSoundRef = useRef<Audio.Sound | null>(null);
  const foregroundLocationSub = useRef<Location.LocationSubscription | null>(null);
  
  // Indoor-specific state
  const [indoorSubMode, setIndoorSubMode] = useState<'active' | 'passive' | null>(null);
  const [isSelectingMode, setIsSelectingMode] = useState(isIndoor);
  const [manualDistanceStr, setManualDistanceStr] = useState('0.00');
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Start the run in the global store
  useEffect(() => {
    if (!isSelectingMode) {
      const startRun = async () => {
        // 이미 실행 중이면 중복 실행 방지
        const currentState = activeRunStore.getState();
        if (currentState.isActive) return;

        // 필요한 모든 번역 키를 명시적으로 추출 (fallback 방지)
        const keys = [
          'builder_start_routine', 'builder_next_segment', 'builder_routine_finished',
          'builder_segment_alert', 'builder_routine_ending',
          'speech_start_summary', 'builder_first_segment_hint',
          'hint_warmup', 'hint_steady', 'hint_interval', 'hint_recovery', 'hint_cooldown',
          'segment_type_warmup', 'segment_type_steady', 'segment_type_interval', 'segment_type_recovery', 'segment_type_cooldown',
          'unit_min', 'unit_km',
          'speech_km_passed', 'speech_time_passed', 'speech_pace_slow', 'speech_pace_fast', 'speech_pace_perfect'
        ];
        const translationsObject: Record<string, string> = {};
        keys.forEach(k => {
          translationsObject[k] = t(k);
        });

        const routineToStart = source === 'builder' ? currentRoutine : [];
        const routineName = source === 'builder' ? currentRoutineName : '';
        
        activeRunStore.start(coachConfig, i18n.language, translationsObject, indoorSubMode, routineToStart, routineName);
      };
      startRun();
    }
  }, [isSelectingMode, indoorSubMode, source, currentRoutine, currentRoutineName]);

  useEffect(() => {
    return () => {
      activeRunStore.stop();
    };
  }, []);

  // Sync UI state with global store
  const [runState, setRunState] = useState(activeRunStore.getState());
  useEffect(() => {
    const unsubscribe = activeRunStore.subscribe(() => {
      const state = activeRunStore.getState();
      setRunState(state);
    });
    return unsubscribe;
  }, []);

  // Accurate Timer logic using timestamps
  useEffect(() => {
    if (isSelectingMode) return;
    let interval: any;
    if (!isPaused) {
      interval = setInterval(() => {
        const state = activeRunStore.getState();
        if (state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000) + state.accumulatedSeconds;
          setSeconds(elapsed);
        }
      }, 500); 
    }
    return () => clearInterval(interval);
  }, [isPaused, isSelectingMode]);

  // Indoor Pedometer Tracking
  useEffect(() => {
    if (!isIndoor || indoorSubMode !== 'active' || isPaused || isSelectingMode) return;

    let sub: any = null;
    (async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      let initialStepCount = 0;
      sub = Pedometer.watchStepCount(result => {
        if (initialStepCount === 0) {
           initialStepCount = result.steps;
        }
        activeRunStore.updateSteps(result.steps - initialStepCount);
      });
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, [isIndoor, indoorSubMode, isPaused, isSelectingMode]);

  // GPS Tracking logic
  // Expo Go: watchPositionAsync (포그라운드 전용)
  // Standalone 빌드: startLocationUpdatesAsync (백그라운드 지원)
  useEffect(() => {
    if (isIndoor || isSelectingMode) return;

    let cancelled = false;

    (async () => {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));

      if (cancelled) return;
      if (fgStatus !== 'granted') {
        setLocationPermissionDenied(true);
        return;
      }

      if (isExpoGo) {
        // Expo Go 환경: 포그라운드 위치 추적
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
          (location) => { if (!cancelled) activeRunStore.updateLocation([location]); }
        ).catch(e => { console.warn('Foreground location error:', e); return null; });
        foregroundLocationSub.current = sub;
      } else {
        // 독립 빌드: 백그라운드 위치 추적
        await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' }));
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
      cancelled = true;
      if (isExpoGo) {
        foregroundLocationSub.current?.remove();
        foregroundLocationSub.current = null;
      } else {
        Location.stopLocationUpdatesAsync('background-location-task').catch(() => {});
      }
    };
  }, [isIndoor, isSelectingMode]);

  const handlePauseResume = () => {
    if (isPaused) {
      activeRunStore.resume();
    } else {
      activeRunStore.pause();
    }
    setIsPaused(!isPaused);
  };

  const handleStopRun = async () => {
    const finalState = activeRunStore.getState();
    if (finalState.distanceKm > 0.01 || seconds > 3) {
      const today = new Date();
      const dateStr = today.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      await addRun({
        date: dateStr,
        title: finalState.indoorMode ? `Indoor Run (${finalState.indoorMode})` : 'Outdoor Run',
        distance: finalState.distanceKm.toFixed(2),
        pace: formattedPace,
        time: formatTime(seconds),
        route: finalState.route,
      });
    }
    activeRunStore.stop();
    router.back();
  };

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

  const handleVideoReset = () => setVideoUri(null);

  const handleUnlockPressIn = () => {
    Animated.timing(unlockAnim, {
      toValue: 1.5,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  };

  const handleUnlockPressOut = () => {
    Animated.spring(unlockAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (mediaMode !== 'music' || isPaused) return;

    if (activeChannel === 'cadence') {
      const ms = (60 / metronomeBpm) * 1000;
      const animations = visualizerAnims.map((anim, i) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(i * 10), // Subtle wave
            Animated.timing(anim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.2, duration: ms - 110, useNativeDriver: true })
          ])
        );
      });
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    } else {
      const animations = visualizerAnims.map(anim => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: Math.random() * 0.8 + 0.2,
              duration: 300 + Math.random() * 200,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: 300 + Math.random() * 200,
              useNativeDriver: true,
            })
          ])
        );
      });
      animations.forEach(a => a.start());
      return () => animations.forEach(a => a.stop());
    }
  }, [mediaMode, isPaused, activeChannel, metronomeBpm]);

  // Pre-load and manage metronome sound
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    const loadMetronome = async () => {
        if (activeChannel === 'cadence' && mediaMode === 'music') {
            try {
                setMetronomeStatus('LOADING...');
                const { sound } = await Audio.Sound.createAsync(
                    require('../assets/sounds/tick.mp3'),
                    { volume: 1.0, shouldPlay: false }
                );
                metronomeSoundRef.current = sound;
                soundObj = sound;
                setMetronomeStatus('READY');
            } catch (e: any) {
                console.log('Metronome load error', e);
                setMetronomeStatus(`ERR: ${e?.message || 'Unknown'}`);
            }
        } else {
            setMetronomeStatus('IDLE');
        }
    };
    loadMetronome();
    return () => {
        if (soundObj) {
            soundObj.unloadAsync().catch(() => {});
            metronomeSoundRef.current = null;
        }
    };
  }, [activeChannel, mediaMode]);

  useEffect(() => {
    if (activeChannel === 'cadence' && !isPaused && mediaMode === 'music') {
      const ms = (60 / metronomeBpm) * 1000;
      metronomeTimer.current = setInterval(async () => {
        if (metronomeSoundRef.current) {
            try {
                // More robust playback for short ticks
                await metronomeSoundRef.current.setPositionAsync(0);
                await metronomeSoundRef.current.playAsync();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {
                console.log('Metronome play error', e);
            }
        }
      }, ms);
    } else {
      if (metronomeTimer.current) clearInterval(metronomeTimer.current);
    }
    return () => { if (metronomeTimer.current) clearInterval(metronomeTimer.current); };
  }, [activeChannel, metronomeBpm, isPaused, mediaMode]);

  useEffect(() => {
    let cancelled = false;

    const manageAudio = async () => {
        // mediaMode가 music이 아니거나 일시 중지 중이거나 케이던스 모드이면 라디오 정지
        if (mediaMode !== 'music' || isPaused || activeChannel === 'cadence') {
            if (soundRef.current) {
                try {
                    await soundRef.current.pauseAsync();
                } catch (e) { /* ignore */ }
            }
            if (activeChannel === 'cadence' && mediaMode === 'music') setAudioStatus('CADENCE');
            return;
        }

        try {
            setAudioStatus('LOADING');
            // 기존 소리가 있다면 해제
            if (soundRef.current) {
                try { await soundRef.current.unloadAsync(); } catch (e) {}
                soundRef.current = null;
            }

            if (cancelled) return;

            console.log(`Loading stream: ${activeChannel}...`);
            const sound = new Audio.Sound();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (cancelled) return;
                if (status.isLoaded) {
                    if (status.isPlaying) setAudioStatus('PLAYING');
                    else if (status.didJustFinish) setAudioStatus('FINISHED');
                    else setAudioStatus('LOADED');
                } else if (!status.isLoaded && status.error) {
                    setAudioStatus('ERR');
                }
            });

            await sound.loadAsync(
                { uri: RADIO_STREAMS[activeChannel] },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );

            if (cancelled) {
                sound.unloadAsync().catch(() => {});
                return;
            }

            soundRef.current = sound;
            console.log(`Playing audio: ${activeChannel} Success!`);
        } catch (e) {
            if (!cancelled) {
                setAudioStatus('FAILED');
                console.log('Audio stream error details:', e);
            }
        }
    };

    manageAudio();

    return () => {
        cancelled = true;
        if (soundRef.current) {
            soundRef.current.unloadAsync().catch(() => {});
            soundRef.current = null;
        }
    };
  }, [mediaMode, activeChannel, isPaused]);

  const formatTime = (totalS: number) => {
    const m = Math.floor(totalS / 60);
    const s = totalS % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentPace = runState.distanceKm > 0 ? (seconds / 60) / runState.distanceKm : 0;
  const paceM = Math.floor(currentPace);
  const paceS = Math.floor((currentPace - paceM) * 60);
  const formattedPace = runState.distanceKm > 0 ? `${paceM}'${paceS < 10 ? '0' : ''}${paceS}"` : `-'-"`;

  const speedKmh = runState.currentSpeed * 3.6;
  const instantPace = speedKmh > 0.5 ? 60 / speedKmh : 0;
  const iPaceM = Math.floor(instantPace);
  const iPaceS = Math.floor((instantPace - iPaceM) * 60);
  const formattedInstantPace = instantPace > 0 ? `${iPaceM}'${iPaceS < 10 ? '0' : ''}${iPaceS}"` : `-'-"`;

  const formattedTime = formatTime(seconds);

  return (
    <View style={styles.container}>
      {/* Background Media Placeholder (In real app: expo-av Video or local Image) */}
      <ImageBackground 
        source={
          customBackgroundUri 
            ? { uri: customBackgroundUri } 
            : THEME_BACKGROUNDS[appTheme] || { uri: 'https://images.unsplash.com/photo-1541252876598-6aa76d05afec' }
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
              <TouchableOpacity style={styles.iconButton} onPress={() => setIsLocked(true)}>
                <Ionicons name="lock-closed" size={20} color={colors.main} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.mediaButton, mediaMode === 'map' && { backgroundColor: 'rgba(255,255,255,0.1)' }]} 
                onPress={() => setMediaMode('map')}
              >
                <Ionicons name="map" size={18} color={mediaMode === 'map' ? colors.main : '#AAA'} />
              </TouchableOpacity>

              {isIndoor && (
                <TouchableOpacity 
                  style={[styles.mediaButton, mediaMode === 'video' && { backgroundColor: 'rgba(255,255,255,0.1)' }]} 
                  onPress={() => setMediaMode('video')}
                >
                  <Ionicons name="videocam" size={18} color={mediaMode === 'video' ? colors.main : '#AAA'} />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.mediaButton, mediaMode === 'music' && { backgroundColor: 'rgba(255,255,255,0.1)' }]} 
                onPress={() => setMediaMode('music')}
              >
                <Ionicons name="musical-notes" size={18} color={mediaMode === 'music' ? colors.main : '#AAA'} />
                <Text style={styles.mediaBtnText}>{t('run_music')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Center Stats (Glassmorphism Overlay) */}
            <View style={styles.statsContainer}>
            {runState.currentSegmentIndex !== -1 && runState.routine[runState.currentSegmentIndex] && (
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                {runState.routineName ? <Text style={{ color: colors.main, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>{runState.routineName.toUpperCase()}</Text> : null}
                <View style={[styles.segmentLabel, { backgroundColor: colors.main }]}>
                  <Text style={styles.segmentText}>
                    {runState.routine[runState.currentSegmentIndex].type.toUpperCase()} ({runState.currentSegmentIndex + 1}/{runState.routine.length})
                  </Text>
                </View>
              </View>
            )}
              <Text style={[styles.timeText, { color: colors.main }]} adjustsFontSizeToFit numberOfLines={1}>{formattedTime}</Text>
              
              {/* Distance Row (Mainly highlighted) */}
              <View style={[styles.statBox, { marginTop: 20 }]}>
                 <Text style={[styles.statValue, { fontSize: 48, lineHeight: 52 }]}>{runState.distanceKm.toFixed(2)}</Text>
                 <Text style={styles.statLabel}>{t('kilometers').toUpperCase()}</Text>
              </View>

              {/* Paces Row */}
              <View style={[styles.rowStats, { marginTop: 30, width: '100%', justifyContent: 'space-evenly' }]}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{formattedInstantPace}</Text>
                  <Text style={styles.statLabel}>CURRENT PACE</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{formattedPace}</Text>
                  <Text style={styles.statLabel}>AVG PACE</Text>
                </View>
              </View>
              
              {/* Bottom KM/H & Status */}
              <View style={[styles.heartRateBox, { marginTop: 30 }]}>
                <Ionicons name="flash" size={18} color={colors.main} />
                <Text style={[styles.hrText, { color: colors.main }]}>{(runState.currentSpeed * 3.6).toFixed(1)} KM/H</Text>
              </View>

              {/* Manual Distance Input for Passive Mode */}
              {indoorSubMode === 'passive' && (
                <View style={[styles.manualInputRow, { marginTop: 20 }]}>
                    <Text style={{ color: '#AAA', fontSize: 13, marginRight: 10 }}>{t('manual_distance')}:</Text>
                    <TextInput
                      style={[styles.manualTextInput, { color: colors.main, borderColor: colors.main }]}
                      keyboardType="numeric"
                      value={manualDistanceStr}
                      onChangeText={(val) => {
                        setManualDistanceStr(val);
                        const km = parseFloat(val);
                        if (!isNaN(km)) activeRunStore.setManualDistance(km);
                      }}
                    />
                    <Text style={{ color: colors.main, fontSize: 16, fontWeight: 'bold', marginLeft: 10 }}>KM</Text>
                </View>
              )}
            </View>

            {/* Real GPS Map or Video or Music Dashboard */}
            <View style={[styles.mapContainer, { height: 400, borderColor: colors.sub }]}>
              {mediaMode === 'map' && (
                isIndoor ? (
                  <View style={styles.placeholderMap}>
                    <Ionicons name="walk" size={100} color="rgba(0,184,148,0.2)" />
                    <Text style={{ color: '#555', marginTop: 10 }}>INDOOR MODE — GPS OFF</Text>
                  </View>
                ) : locationPermissionDenied ? (
                  <View style={styles.placeholderMap}>
                    <Ionicons name="location-outline" size={100} color="rgba(255,80,80,0.3)" />
                    <Text style={{ color: '#e55', marginTop: 10, textAlign: 'center' }}>위치 권한이 거부되었습니다.{'\n'}설정에서 권한을 허용해 주세요.</Text>
                  </View>
                ) : (
                  <Map route={runState.route} lineColor={colors.main} />
                )
              )}

              {mediaMode === 'video' && isIndoor && (
                <View style={styles.videoPlayer}>
                    {videoUri ? (
                        <View style={{ flex: 1, backgroundColor: '#000', borderRadius: 24, overflow: 'hidden' }}>
                            <Video
                              source={{ uri: videoUri }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode={ResizeMode.COVER}
                              shouldPlay={!isPaused}
                              isLooping
                              volume={1.0}
                            />
                            <TouchableOpacity onPress={handleVideoReset} style={{ position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15 }}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.videoUploadArea} onPress={handlePickVideo}>
                             <Ionicons name="cloud-upload" size={60} color={colors.main} />
                             <Text style={{ color: colors.main, marginTop: 15, fontWeight: 'bold' }}>{t('upload_gallery')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
              )}

              {mediaMode === 'music' && (
                <View style={styles.musicDashboard}>
                    {/* Visualizer */}
                    <View style={styles.visualizerContainer}>
                        {visualizerAnims.map((anim, i) => (
                            <Animated.View 
                              key={i} 
                              style={[
                                styles.visualizerBar, 
                                { 
                                  backgroundColor: activeChannel === 'neon' ? colors.main : activeChannel === 'power' ? '#E84118' : colors.sub,
                                  transform: [{ scaleY: anim }] 
                                }
                              ]} 
                            />
                        ))}
                    </View>

                    <Text style={styles.nowPlayingLabel}>{t('now_playing')}</Text>
                    <Text style={[styles.channelTitle, { color: colors.main }]}>{activeChannel === 'cadence' ? `${metronomeBpm} SPM` : t(`radio_${activeChannel}`)}</Text>
                    <Text style={{ color: audioStatus === 'FAILED' ? '#e55' : '#555', fontSize: 10, marginTop: -15, marginBottom: 15 }}>
                        {activeChannel === 'cadence'
                          ? `METRONOME: ${metronomeStatus}`
                          : audioStatus === 'FAILED'
                            ? '⚠ 네트워크 연결을 확인해 주세요'
                            : `STATUS: ${audioStatus}`}
                    </Text>

                    {activeChannel === 'cadence' && (
                        <View style={styles.bpmControls}>
                            <TouchableOpacity onPress={() => setMetronomeBpm(b => Math.max(100, b - 5))} style={styles.bpmBtn}>
                                <Ionicons name="remove" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMetronomeBpm(b => Math.min(240, b + 5))} style={styles.bpmBtn}>
                                <Ionicons name="add" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.channelScroll}>
                        {['cadence', 'neon', 'lofi', 'power', 'classic'].map(ch => (
                            <TouchableOpacity 
                              key={ch} 
                              style={[styles.channelCard, activeChannel === ch && { borderColor: colors.main, backgroundColor: 'rgba(255,255,255,0.1)' }]}
                              onPress={() => setActiveChannel(ch)}
                            >
                                <Ionicons name={ch === 'neon' ? 'flash' : ch === 'lofi' ? 'leaf' : ch === 'power' ? 'rocket' : ch === 'classic' ? 'musical-notes' : 'footsteps'} size={24} color={activeChannel === ch ? colors.main : '#AAA'} />
                                <Text style={[styles.channelCardText, { color: activeChannel === ch ? '#FFF' : '#AAA' }]}>{t(`radio_${ch}`).split(' (')[0]}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={[styles.playPauseBtn, isPaused && styles.playPauseBtnPaused]}
              onPress={handlePauseResume}
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

      {/* Indoor Mode Selection Modal */}
      <Modal visible={isSelectingMode} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.modeCard}>
                  <Text style={styles.modeTitle}>{t('indoor_mode_select')}</Text>
                  <Text style={styles.modeSubtitle}>{t('indoor_mode_desc')}</Text>
                  
                  <TouchableOpacity 
                    style={[styles.modeOption, { borderColor: colors.main }]}
                    onPress={() => {
                        setIndoorSubMode('active');
                        setIsSelectingMode(false);
                    }}
                  >
                      <Ionicons name="walk" size={32} color={colors.main} />
                      <View>
                          <Text style={styles.optionTitle}>{t('indoor_mode_active')}</Text>
                          <Text style={styles.optionDesc}>{t('indoor_mode_active_desc')}</Text>
                      </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modeOption, { borderColor: colors.sub }]}
                    onPress={() => {
                        setIndoorSubMode('passive');
                        setIsSelectingMode(false);
                        setVideoUri('https://assets.mixkit.co/videos/preview/mixkit-running-in-the-forest-441-large.mp4'); 
                    }}
                  >
                      <Ionicons name="videocam" size={32} color={colors.sub} />
                      <View>
                          <Text style={styles.optionTitle}>{t('indoor_mode_passive')}</Text>
                          <Text style={styles.optionDesc}>{t('indoor_mode_passive_desc')}</Text>
                      </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                      <Text style={styles.cancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* Screen Lock Overlay */}
      {isLocked && (
        <View style={styles.lockOverlay}>
            <View style={styles.lockContent}>
                <Ionicons name="lock-closed" size={80} color={colors.main} style={{ marginBottom: 20, opacity: 0.5 }} />
                <Text style={styles.lockTitle}>{t('lock_screen')}</Text>
                <Text style={styles.lockSubtitle}>{t('long_press_unlock')}</Text>
                
                <Animated.View style={{ transform: [{ scale: unlockAnim }] }}>
                    <TouchableOpacity 
                    style={[styles.unlockBtn, { borderColor: colors.main }]} 
                    delayLongPress={1500}
                    onPressIn={handleUnlockPressIn}
                    onPressOut={handleUnlockPressOut}
                    onLongPress={() => {
                        setIsLocked(false);
                        handleUnlockPressOut();
                    }}
                    >
                        <Ionicons name="power" size={32} color={colors.main} />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
      )}
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
    height: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  videoPlayer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  videoUploadArea: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modeCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modeTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  modeSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    borderWidth: 1,
  },
  optionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  optionDesc: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  cancelBtn: {
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
  },
  manualTextInput: {
    fontSize: 24,
    fontWeight: '900',
    borderBottomWidth: 2,
    width: 80,
    textAlign: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  lockContent: {
    alignItems: 'center',
  },
  lockTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  lockSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 50,
  },
  segmentLabel: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  segmentText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
  unlockBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  musicDashboard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    width: '100%',
    marginBottom: 20,
  },
  visualizerBar: {
    width: 10,
    height: 80,
    marginHorizontal: 3,
    borderRadius: 5,
  },
  nowPlayingLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  channelTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 25,
    textAlign: 'center',
  },
  channelScroll: {
    maxHeight: 80,
    marginTop: 10,
  },
  channelCard: {
    paddingHorizontal: 20,
    height: 60,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelCardText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  bpmControls: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 20,
  },
  bpmBtn: {
    width: 60,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  }
});
