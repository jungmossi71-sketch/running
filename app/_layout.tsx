import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../i18n';
import { ThemeProvider } from '../context/ThemeContext';
import { HistoryProvider } from '../context/HistoryContext';
import { VoiceCoachProvider } from '../context/VoiceCoachContext';

import { useColorScheme } from '@/hooks/use-color-scheme';

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { activeRunStore } from '../context/ActiveRunStore';

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
    activeRunStore.updateLocation(locations);

    // Background Voice Coaching
    const state = activeRunStore.getState();
    if (state.isActive && !state.isPaused && state.config.speakDistanceEvent) {
       const currentKm = Math.floor(state.distanceKm);
       if (currentKm > 0 && currentKm > state.lastSpokenKm) {
          // Note: Since we don't have easy access to i18n in this static context, 
          // we use a simple message or we could have stored localized templates in the store.
          const msg = state.language === 'ko' ? `${currentKm} 킬로미터를 달렸습니다.` : `You have run ${currentKm} kilometers.`;
          Speech.speak(msg, { language: state.language === 'ko' ? 'ko-KR' : 'en-US' });
          // The store already updates lastSpokenKm inside updateLocation, 
          // but we can be extra sure here if we want to manage it in the task.
       }
    }

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
          <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="theme" options={{ headerShown: false }} />
              <Stack.Screen name="run" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </NavigationThemeProvider>
        </HistoryProvider>
      </VoiceCoachProvider>
    </ThemeProvider>
  );
}
