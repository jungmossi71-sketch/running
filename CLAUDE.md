# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

사용자와의 모든 대화는 **한국어**로 진행한다.

## Project Overview

**Happy Run** is a GPS-based running tracker mobile app built with React Native + Expo. It supports Android, iOS, and web, with voice coaching, run history, weekly goals, theme customization, and internationalization (6 languages).

## Commands

```bash
npx expo start          # Start dev server (choose platform interactively)
npm run android         # Build and run on Android device/emulator
npm run ios             # Build and run on iOS simulator
npm run web             # Run web version
npm run lint            # Run ESLint

# EAS cloud builds
eas build -p android --profile preview      # Build preview APK
eas build -p android --profile production   # Production build
```

There are no automated tests configured.

## Android Development Notes

- Requires `ANDROID_HOME` and PATH entries for `platform-tools` and `emulator`
- Check device connection: `adb devices`
- If `eas build:run` times out, manually download APK and install: `adb install <path>.apk`
- Asset filenames must be **lowercase only, no spaces or special characters**, and file extensions must match actual format — EAS cloud builds run on Linux (case-sensitive), unlike Windows

## Architecture

### Routing
Expo Router with file-based routing. The `app/(tabs)/` group defines the bottom tab navigation (home, explore, history). `app/run.tsx` is the full-screen active run tracker. `app/theme.tsx` is the theme customizer.

### State Management
Context API with four main contexts in `context/`:

- **`ActiveRunStore.ts`** — Singleton (not a React context) that holds live run state: GPS coordinates, distance, pace, elapsed time, voice coaching events. Shared between `app/run.tsx` and the tab screens.
- **`ThemeContext.tsx`** — Current background image selection and color scheme
- **`HistoryContext.tsx`** — Persistent run history and weekly distance goals
- **`VoiceCoachContext.tsx`** — TTS language and coaching interval settings
- **`BuilderContext.tsx`** — Workout/interval routine builder state

All contexts are provided at the root layout in `app/_layout.tsx`.

### Platform-Specific Files
- `components/Map.native.tsx` — react-native-maps for mobile
- `components/Map.web.tsx` — web-compatible map placeholder
- `hooks/use-color-scheme.ts` and `hooks/use-color-scheme.web.ts` — platform-specific color scheme detection

### Internationalization
`i18n/index.ts` sets up i18next with device locale auto-detection. Translation files are in `i18n/locales/` (en, ko, zh, ja, es, hi).

### Background Location
GPS tracking uses `expo-location` with background task registration via Expo Task Manager. Android foreground service and location permissions are declared in `app.json`.

### Path Aliases
`@/*` maps to the project root (configured in `tsconfig.json`).

### EAS Build Profiles
Defined in `eas.json`: `development` (dev client), `preview` (APK for testing), `production`. App version is managed remotely via EAS.
