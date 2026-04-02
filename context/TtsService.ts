import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { CoachPersona, PERSONA_PROFILES } from './VoiceCoachContext';

// 언어별 기본 Neural2 voice (persona 미지정 시)
const DEFAULT_VOICES: Record<string, { languageCode: string; name: string }> = {
  'ko': { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B' },
  'en': { languageCode: 'en-US', name: 'en-US-Neural2-J' },
  'zh': { languageCode: 'zh-CN', name: 'zh-CN-Neural2-B' },
  'ja': { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B' },
  'es': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
  'hi': { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A' },
};

// app.json 또는 환경변수에서 API 키 관리
// 빌드 시 expo-constants로 접근
let _apiKey = '';

export function setTtsApiKey(key: string) {
  _apiKey = key;
}

function getCacheKey(text: string, lang: string): string {
  // 텍스트 해시 (간단 구현)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `tts_${lang}_${Math.abs(hash)}.mp3`;
}

function getVoiceForPersona(lang: string, persona?: CoachPersona): { languageCode: string; name: string; speakingRate: number; pitch: number } {
  const defaultVoice = DEFAULT_VOICES[lang] ?? DEFAULT_VOICES['en'];
  if (!persona) return { ...defaultVoice, speakingRate: 1.05, pitch: 0 };

  const profile = PERSONA_PROFILES.find(p => p.id === persona);
  // 한국어 페르소나 목소리는 그대로, 다른 언어는 해당 언어 기본 목소리 사용
  const voiceName = lang === 'ko' && profile ? profile.ttsVoice : defaultVoice.name;
  const langCode = defaultVoice.languageCode;
  return {
    languageCode: langCode,
    name: voiceName,
    speakingRate: profile?.speakingRate ?? 1.05,
    pitch: profile?.pitch ?? 0,
  };
}

async function fetchNeuralTts(text: string, lang: string, persona?: CoachPersona): Promise<string> {
  const voiceConfig = getVoiceForPersona(lang, persona);
  const cacheFile = `${FileSystem.cacheDirectory}${getCacheKey(text, lang)}`;

  // 캐시 확인
  const cached = await FileSystem.getInfoAsync(cacheFile);
  if (cached.exists) return cacheFile;

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${_apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voiceConfig.languageCode, name: voiceConfig.name },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: voiceConfig.speakingRate,
          pitch: voiceConfig.pitch,
          volumeGainDb: 2,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`TTS API 오류: ${response.status}`);
  }

  const json = await response.json();
  const base64Audio: string = json.audioContent;

  await FileSystem.writeAsStringAsync(cacheFile, base64Audio, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return cacheFile;
}

async function playMp3(filePath: string): Promise<void> {
  const { sound } = await Audio.Sound.createAsync(
    { uri: filePath },
    { shouldPlay: true, volume: 1.0 }
  );
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && (status.didJustFinish || !status.isPlaying && status.positionMillis > 0)) {
        sound.unloadAsync().catch(() => {});
        resolve();
      }
    });
    // 안전 타임아웃
    setTimeout(() => {
      sound.unloadAsync().catch(() => {});
      resolve();
    }, 15000);
  });
}

/**
 * 자연스러운 Neural2 음성으로 발화.
 * API 키 없거나 네트워크 실패 시 기기 내장 TTS로 폴백.
 */
export async function speakNeural(text: string, lang: string, persona?: CoachPersona): Promise<void> {
  if (_apiKey) {
    try {
      const filePath = await fetchNeuralTts(text, lang, persona);
      await playMp3(filePath);
      return;
    } catch (e) {
      console.warn('Neural TTS 실패, 기기 TTS로 폴백:', e);
    }
  }

  // 폴백: expo-speech
  const ttsLangMap: Record<string, string> = {
    ko: 'ko-KR', en: 'en-US', zh: 'zh-CN',
    ja: 'ja-JP', es: 'es-ES', hi: 'hi-IN',
  };
  await new Promise<void>((resolve) => {
    Speech.speak(text, {
      language: ttsLangMap[lang] ?? 'ko-KR',
      onDone: resolve,
      onError: () => resolve(),
    });
    setTimeout(resolve, 10000);
  });
}

/** 캐시 전체 삭제 */
export async function clearTtsCache(): Promise<void> {
  try {
    const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory!);
    await Promise.all(
      files
        .filter((f) => f.startsWith('tts_') && f.endsWith('.mp3'))
        .map((f) => FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${f}`, { idempotent: true }))
    );
  } catch (e) {
    console.warn('TTS 캐시 삭제 실패:', e);
  }
}
