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

export const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task globally so it registers when the app boots up
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background Location Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    // This empty listener keeps the JS engine alive during background location updates,
    // allowing the watchPositionAsync inside run.tsx to continuously fire.
    console.log(`Received background geo-tick (${locations.length} updates)`);
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
