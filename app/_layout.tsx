import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../i18n';
import { ThemeProvider } from '../context/ThemeContext';
import { HistoryProvider } from '../context/HistoryContext';
import { VoiceCoachProvider } from '../context/VoiceCoachContext';
import { BuilderProvider } from '../context/BuilderContext';
import { LlmCoachProvider } from '../context/LlmCoachContext';
import { setTtsApiKey } from '../context/TtsService';

import { useColorScheme } from '@/hooks/use-color-scheme';

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { activeRunStore } from '../context/ActiveRunStore';

// Google Cloud TTS Neural2 API 키 설정 (Maps API와 동일 프로젝트)
setTtsApiKey('AIzaSyCf_nWfV2z-LZW5XqGFGY2qXB6B9RgXVJ8');

export const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task globally so it registers when the app boots up
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background Location Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    
    // Update the central store (singleton)
    // This will internally trigger checkVoiceCoach() which handles localized TTS
    activeRunStore.updateLocation(locations);

    const state = activeRunStore.getState();
    console.log(`Background geo-tick: ${state.distanceKm.toFixed(2)} km, ${state.route.length} points`);
  }
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider>
      <VoiceCoachProvider>
        <HistoryProvider>
          <BuilderProvider>
            <LlmCoachProvider>
            <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="theme" options={{ headerShown: false }} />
                <Stack.Screen name="run" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </NavigationThemeProvider>
            </LlmCoachProvider>
          </BuilderProvider>
        </HistoryProvider>
      </VoiceCoachProvider>
    </ThemeProvider>
  );
}
