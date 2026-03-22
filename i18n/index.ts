import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import es from './locales/es.json';
import hi from './locales/hi.json';

const resources = {
  en: en,
  ko: ko,
  zh: zh,
  ja: ja,
  es: es,
  hi: hi,
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.getLocales()[0]?.languageCode ?? 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React Native doesn't need XSS escaping
    },
  });

export default i18n;
