import { LocationObject } from 'expo-location';
import * as Speech from 'expo-speech';

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

// Helper for distance calculation (same as in run.tsx)
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

export interface RunState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  accumulatedSeconds: number;
  distanceKm: number;
  route: { latitude: number; longitude: number }[];
  currentSpeed: number;
  lastSpokenKm: number;
  lastSpokenMin: number;
  indoorMode: 'active' | 'passive' | null;
  strideLengthM: number;
  config: {
    isPaceMakerActive: boolean;
    targetDistanceKm: number;
    targetTimeMinutes: number;
    speakDistanceEvent: boolean;
    speakTimeEvent: boolean;
  };
  language: string;
}

class ActiveRunStore {
  private state: RunState = {
    isActive: false,
    isPaused: false,
    startTime: null,
    accumulatedSeconds: 0,
    distanceKm: 0,
    route: [],
    currentSpeed: 0,
    lastSpokenKm: 0,
    lastSpokenMin: 0,
    indoorMode: null,
    strideLengthM: 0.75, // Default stride length
    config: {
      isPaceMakerActive: false,
      targetDistanceKm: 10,
      targetTimeMinutes: 50,
      speakDistanceEvent: true,
      speakTimeEvent: false,
    },
    language: 'ko',
  };

  private listeners: (() => void)[] = [];

  getState() {
    return this.state;
  }

  start(config: any, language: string, indoorMode: 'active' | 'passive' | null = null) {
    this.state = {
      ...this.state,
      isActive: true,
      isPaused: false,
      startTime: Date.now(),
      accumulatedSeconds: 0,
      distanceKm: 0,
      route: [],
      currentSpeed: 0,
      lastSpokenKm: 0,
      lastSpokenMin: 0,
      indoorMode,
      config,
      language,
    };
    this.notify();
  }

  pause() {
    if (this.state.startTime) {
      this.state.accumulatedSeconds += Math.floor((Date.now() - this.state.startTime) / 1000);
      this.state.startTime = null;
      this.state.isPaused = true;
      this.notify();
    }
  }

  resume() {
    this.state.startTime = Date.now();
    this.state.isPaused = false;
    this.notify();
  }

  stop() {
    this.state.isActive = false;
    this.state.startTime = null;
    this.notify();
  }

  updateSteps(steps: number) {
    if (!this.state.isActive || this.state.isPaused || this.state.indoorMode !== 'active') return;
    
    // Calculate distance based on steps * stride
    const d = (steps * this.state.strideLengthM) / 1000;
    this.state.distanceKm = d;
    this.checkVoiceCoach();
    this.notify();
  }

  setManualDistance(km: number) {
    this.state.distanceKm = km;
    this.notify();
  }

  updateLocation(locations: LocationObject[]) {
    if (!this.state.isActive || this.state.isPaused || this.state.indoorMode) return;

    for (const loc of locations) {
      const newCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      const speed = loc.coords.speed || 0;
      this.state.currentSpeed = speed;

      if (this.state.route.length > 0) {
        const last = this.state.route[this.state.route.length - 1];
        const d = getDistanceKm(last.latitude, last.longitude, newCoord.latitude, newCoord.longitude);
        this.state.distanceKm += d;
      }
      this.state.route.push(newCoord);
      
      this.checkVoiceCoach();
    }
    this.notify();
  }

  private checkVoiceCoach() {
    const { distanceKm, lastSpokenKm, lastSpokenMin, startTime, accumulatedSeconds, config, language } = this.state;
    if (distanceKm === 0) return;

    const seconds = startTime ? Math.floor((Date.now() - startTime) / 1000) + accumulatedSeconds : accumulatedSeconds;

    // 1. Distance-based triggers (KM)
    const currentKmFloor = Math.floor(distanceKm);
    if (config.speakDistanceEvent && currentKmFloor > lastSpokenKm) {
        this.state.lastSpokenKm = currentKmFloor;
        
        let feedback = '';
        if (config.isPaceMakerActive) {
            const targetPaceTotalSec = (config.targetTimeMinutes / config.targetDistanceKm) * 60;
            const avgPaceTotalSec = distanceKm > 0 ? seconds / distanceKm : 0;
            
            if (avgPaceTotalSec > targetPaceTotalSec + 15) {
                feedback = language === 'ko' ? '페이스가 조금 느립니다. 힘내세요!' : 'Pace is a bit slow. Keep it up!';
            } else if (avgPaceTotalSec < targetPaceTotalSec - 15) {
                feedback = language === 'ko' ? '페이스가 아주 좋습니다! 너무 무리하지 마세요.' : 'Great pace! Don\'t overdo it.';
            } else {
                feedback = language === 'ko' ? '목표 페이스대로 아주 잘 달리고 있습니다.' : 'You are running perfectly at your target pace.';
            }
        }

        const msg = language === 'ko' 
            ? `${currentKmFloor} 킬로미터를 달렸습니다. ${feedback}`
            : `You have run ${currentKmFloor} kilometers. ${feedback}`;
            
        Speech.speak(msg, { language: getTTSLanguage(language) });
    }

    // 2. Time-based triggers (Every 5 min)
    const currentMin = Math.floor(seconds / 60);
    if (config.speakTimeEvent && currentMin > 0 && currentMin % 5 === 0 && currentMin > lastSpokenMin) {
        this.state.lastSpokenMin = currentMin;
        const msg = language === 'ko'
            ? `${currentMin}분 경과했습니다. 현재 거리는 ${distanceKm.toFixed(1)} 킬로미터입니다.`
            : `${currentMin} minutes passed. Current distance is ${distanceKm.toFixed(1)} kilometers.`;
        Speech.speak(msg, { language: getTTSLanguage(language) });
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const activeRunStore = new ActiveRunStore();
