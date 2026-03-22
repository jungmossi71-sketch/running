const fs = require('fs');
const path = require('path');

const speechLocales = {
  en: {
    speech_pace_slow: "You are slower than target pace. Increase your speed.",
    speech_pace_fast: "You are faster than target pace. Conserve your energy.",
    speech_pace_perfect: "Excellent! You are maintaining the target pace perfectly.",
    speech_km_passed: "Passed {{km}} kilometers. Average pace is {{m}} minutes and {{s}} seconds. {{feedback}}",
    speech_time_passed: "{{min}} minutes elapsed. Total distance: {{km}} kilometers. Keep up the good work!"
  },
  ko: {
    speech_pace_slow: "현재 목표 페이스보다 늦습니다. 호흡을 가다듬고 속도를 조금 올려보세요.",
    speech_pace_fast: "현재 목표 페이스보다 빠릅니다. 완주를 위해 체력을 미리 안배하세요.",
    speech_pace_perfect: "아주 좋습니다! 현재 완벽하게 목표 페이스를 유지중입니다.",
    speech_km_passed: "{{km}} 킬로미터를 통과했습니다. 현재 평균 페이스는 {{m}}분 {{s}}초 입니다. {{feedback}}",
    speech_time_passed: "{{min}}분이 경과했습니다. 현재 누적 {{km}} 킬로미터 달성. 계속 훌륭한 자세를 유지하세요."
  },
  zh: {
    speech_pace_slow: "您低于目标配速。请加快速度。",
    speech_pace_fast: "您快于目标配速。请注意保持体力。",
    speech_pace_perfect: "非常棒！您完美地保持了目标配速。",
    speech_km_passed: "已跑过 {{km}} 公里。平均配速为 {{m}} 分 {{s}} 秒。{{feedback}}",
    speech_time_passed: "已用时 {{min}} 分钟。总距离：{{km}} 公里。继续保持好的状态！"
  },
  ja: {
    speech_pace_slow: "目標ペースより遅れています。少しスピードを上げてください。",
    speech_pace_fast: "目標ペースより速いです。体力を温存してください。",
    speech_pace_perfect: "素晴らしい！目標ペースを完璧に維持しています。",
    speech_km_passed: "{{km}} キロメートルを通過しました。平均ペースは {{m}}分 {{s}}秒です。{{feedback}}",
    speech_time_passed: "{{min}} 分経過しました。累計距離は {{km}} キロメートルです。この調子で頑張りましょう！"
  },
  es: {
    speech_pace_slow: "Estás por debajo del ritmo objetivo. Aumenta tu velocidad.",
    speech_pace_fast: "Vas más rápido que el ritmo objetivo. Conserva tu energía.",
    speech_pace_perfect: "¡Excelente! Estás manteniendo el ritmo objetivo perfectamente.",
    speech_km_passed: "Has pasado {{km}} kilómetros. El ritmo medio es de {{m}} minutos y {{s}} segundos. {{feedback}}",
    speech_time_passed: "Han pasado {{min}} minutos. Distancia total: {{km}} kilómetros. ¡Sigue así!"
  },
  hi: {
    speech_pace_slow: "आप लक्ष्य गति से धीमे हैं। अपनी गति बढ़ाएं।",
    speech_pace_fast: "आप लक्ष्य गति से तेज हैं। अपनी ऊर्जा बचाएं।",
    speech_pace_perfect: "बहुत बढ़िया! आप लक्ष्य गति को पूरी तरह से बनाए हुए हैं।",
    speech_km_passed: "{{km}} किलोमीटर पूरे हुए। औसत गति {{m}} मिनट और {{s}} सेकंड है। {{feedback}}",
    speech_time_passed: "{{min}} मिनट बीत चुके हैं। कुल दूरी: {{km}} किलोमीटर। अच्छा काम जारी रखें!"
  }
};

Object.keys(speechLocales).forEach(lang => {
  const filePath = path.join('c:/git/running/i18n/locales', `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.translation = { ...data.translation, ...speechLocales[lang] };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
});
console.log('Update Speech Locales Done!');
