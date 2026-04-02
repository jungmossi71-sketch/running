import { LocationObject } from 'expo-location';
import * as Speech from 'expo-speech';
import { llmCoachService, RunContext } from './LlmCoachService';

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
  // Routine Builder Fields
  routine: any[];
  routineName: string;
  currentSegmentIndex: number;
  lastSpokenAlertIndex: number;
  segmentTimeStart: number;
  segmentDistStart: number;
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
    routine: [],
    routineName: '',
    currentSegmentIndex: -1,
    lastSpokenAlertIndex: -1,
    segmentTimeStart: 0,
    segmentDistStart: 0,
  };

  private translations: Record<string, string> = {};

  private listeners: (() => void)[] = [];

  private speechQueue: Promise<void> = Promise.resolve();

  getState() {
    return this.state;
  }

  start(config: any, language: string, translations: Record<string, string>, indoorMode: 'active' | 'passive' | null = null, routine: any[] = [], routineName: string = '') {
    this.translations = translations;
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
      routine,
      routineName: routineName || (routine.length > 0 ? '사용자 지정 루틴' : ''),
      currentSegmentIndex: routine.length > 0 ? 0 : -1,
      lastSpokenAlertIndex: -1,
      segmentTimeStart: 0,
      segmentDistStart: 0,
    };
    this.notify();

    // Reset queue and initial voice guide
    this.speechQueue = Promise.resolve();
    setTimeout(() => this.speakInitialSummary(), 500);
  }

  private async speakSafe(msg: string, lang: string) {
    this.speechQueue = this.speechQueue.then(() => {
      return new Promise<void>((resolve) => {
        Speech.speak(msg, {
          language: lang,
          onDone: () => resolve(),
          onError: (e) => {
            console.log('Speech error:', e);
            resolve();
          },
        });
        // 10sec safety timeout to prevent deadlocks
        setTimeout(resolve, 10000); 
      });
    });
    return this.speechQueue;
  }

  private async speakInitialSummary() {
    const { config, language, routine, routineName } = this.state;
    const ttsLang = getTTSLanguage(language);

    if (routine.length > 0) {
      // Routine guide
      let startMsg = this.translations['builder_start_routine'] || 'Starting routine {{name}}.';
      startMsg = startMsg.replace('{{name}}', routineName);
      await this.speakSafe(startMsg, ttsLang);

      const first = routine[0];
      let firstHint = this.translations['builder_first_segment_hint'] || 'First is {{type}} for {{value}}{{unit}}.';
      const hintMsg = this.translations[`hint_${first.type}`] || '';
      const typeName = this.translations[`segment_type_${first.type}`] || first.type;
      const unitName = this.translations[first.targetType === 'time' ? 'unit_min' : 'unit_km'] || (first.targetType === 'time' ? 'min' : 'km');
      
      firstHint = firstHint.replace('{{type}}', typeName)
                          .replace('{{value}}', first.value.toString())
                          .replace('{{unit}}', unitName)
                          .replace('{{hint}}', hintMsg);
      
      await this.speakSafe(firstHint, ttsLang);
    } else if (config.isPaceMakerActive) {
      // Pace Maker guide
      const targetPaceTotalSec = (config.targetTimeMinutes / config.targetDistanceKm) * 60;
      const paceM = Math.floor(targetPaceTotalSec / 60);
      const paceS = Math.floor(targetPaceTotalSec % 60);
      
      let msg = this.translations['speech_start_summary'] || 'Starting run.';
      msg = msg.replace('{{km}}', config.targetDistanceKm.toString())
               .replace('{{m}}', paceM.toString())
               .replace('{{s}}', paceS.toString());
      await this.speakSafe(msg, ttsLang);
    }
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
    this.checkSegmentTransition();
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
      
      this.checkSegmentTransition();
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
        
        let feedbackKey = 'speech_pace_perfect';
        if (config.isPaceMakerActive) {
            const targetPaceTotalSec = (config.targetTimeMinutes / config.targetDistanceKm) * 60;
            const avgPaceTotalSec = distanceKm > 0 ? seconds / distanceKm : 0;
            
            if (avgPaceTotalSec > targetPaceTotalSec + 15) {
                feedbackKey = 'speech_pace_slow';
            } else if (avgPaceTotalSec < targetPaceTotalSec - 15) {
                feedbackKey = 'speech_pace_fast';
            }
        }

        const feedback = this.translations[feedbackKey] || '';
        const avgPaceTotalSec = distanceKm > 0 ? seconds / distanceKm : 0;
        const paceM = Math.floor(avgPaceTotalSec / 60);
        const paceS = Math.floor(avgPaceTotalSec % 60);

        let msg = this.translations['speech_km_passed'] || '{{km}} km passed. {{feedback}}';
        msg = msg.replace('{{km}}', currentKmFloor.toString())
                 .replace('{{m}}', paceM.toString())
                 .replace('{{s}}', paceS.toString())
                 .replace('{{feedback}}', feedback);
            
        const ttsLang = getTTSLanguage(language);

        // LLM 코칭이 로드된 경우 LLM 응답으로 대체
        if (llmCoachService.isLoaded()) {
          const runCtx: RunContext = {
            distanceKm,
            elapsedSeconds: seconds,
            currentSpeedMs: this.state.currentSpeed,
            avgPaceSecPerKm: distanceKm > 0 ? seconds / distanceKm : 0,
            targetPaceSecPerKm: config.isPaceMakerActive
              ? (config.targetTimeMinutes / config.targetDistanceKm) * 60
              : 0,
            targetDistanceKm: config.targetDistanceKm,
            language,
          };
          llmCoachService.generateAutoCoaching(runCtx).then((llmMsg) => {
            if (llmMsg) this.speakSafe(llmMsg, ttsLang);
          });
        } else {
          this.speakSafe(msg, ttsLang);
        }
    }

    // 2. Time-based triggers (Every 5 min)
    const currentMin = Math.floor(seconds / 60);
    if (config.speakTimeEvent && currentMin > 0 && currentMin % 5 === 0 && currentMin > lastSpokenMin) {
        this.state.lastSpokenMin = currentMin;
        
        let msg = this.translations['speech_time_passed'] || '{{min}} minutes passed. {{km}} km total.';
        msg = msg.replace('{{min}}', currentMin.toString())
                 .replace('{{km}}', distanceKm.toFixed(1));
                 
        const ttsLang = getTTSLanguage(language);
        this.speakSafe(msg, ttsLang);
    }
  }

  private checkSegmentTransition() {
    const { routine, currentSegmentIndex, lastSpokenAlertIndex, distanceKm, startTime, accumulatedSeconds, language } = this.state;
    if (currentSegmentIndex === -1 || routine.length === 0) return;

    const segment = routine[currentSegmentIndex];
    const totalSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) + accumulatedSeconds : accumulatedSeconds;
    const segmentTimeElapsed = totalSeconds - this.state.segmentTimeStart;
    const segmentDistElapsed = distanceKm - this.state.segmentDistStart;

    const ttsLang = getTTSLanguage(language);

    // 1. Pre-transition Alert (10s or 100m before end)
    if (lastSpokenAlertIndex !== currentSegmentIndex) {
      let isPreAlert = false;
      if (segment.targetType === 'time') {
        const remainingS = (segment.value * 60) - segmentTimeElapsed;
        if (remainingS <= 10 && remainingS > 3) isPreAlert = true;
      } else {
        const remainingKm = segment.value - segmentDistElapsed;
        if (remainingKm <= 0.1 && remainingKm > 0.02) isPreAlert = true;
      }

      if (isPreAlert) {
        this.state.lastSpokenAlertIndex = currentSegmentIndex;
        if (currentSegmentIndex < routine.length - 1) {
          // Alert for next segment
          const next = routine[currentSegmentIndex + 1];
          let msg = this.translations['builder_segment_alert'] || 'Soon {{type}} starts.';
          const hintMsg = this.translations[`hint_${next.type}`] || '';
          const typeName = this.translations[`segment_type_${next.type}`] || next.type;
          const unitName = this.translations[next.targetType === 'time' ? 'unit_min' : 'unit_km'] || (next.targetType === 'time' ? 'min' : 'km');

          msg = msg.replace('{{type}}', typeName)
                   .replace('{{value}}', next.value.toString())
                   .replace('{{unit}}', unitName)
                   .replace('{{hint}}', hintMsg);
          this.speakSafe(msg, ttsLang);
        } else {
          // Alert for routine ending
          let msg = this.translations['builder_routine_ending'] || 'Program ending soon.';
          this.speakSafe(msg, ttsLang);
        }
      }
    }

    // 2. Actual Transition
    let isFinished = false;
    if (segment.targetType === 'time') {
      if (segmentTimeElapsed >= segment.value * 60) isFinished = true;
    } else {
      if (segmentDistElapsed >= segment.value) isFinished = true;
    }

    if (isFinished) {
      if (currentSegmentIndex < routine.length - 1) {
        this.state.currentSegmentIndex++;
        this.state.segmentTimeStart = totalSeconds;
        this.state.segmentDistStart = distanceKm;
        
        const nextSegment = routine[this.state.currentSegmentIndex];
        let msg = this.translations['builder_next_segment'] || 'Segment finished. Next is {{type}}.';
        const hintMsg = this.translations[`hint_${nextSegment.type}`] || '';
        const typeName = this.translations[`segment_type_${nextSegment.type}`] || nextSegment.type;
        const unitName = this.translations[nextSegment.targetType === 'time' ? 'unit_min' : 'unit_km'] || (nextSegment.targetType === 'time' ? 'min' : 'km');

        msg = msg.replace('{{type}}', typeName)
                 .replace('{{value}}', nextSegment.value.toString())
                 .replace('{{unit}}', unitName)
                 .replace('{{hint}}', hintMsg);
        
        const ttsLang = getTTSLanguage(language);
        this.speakSafe(msg, ttsLang);
      } else {
        this.state.currentSegmentIndex = -1; // Finished all
        let msg = this.translations['builder_routine_finished'] || 'Program finished. Continuous running starts now.';
        const ttsLang = getTTSLanguage(language);
        this.speakSafe(msg, ttsLang);
      }
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
