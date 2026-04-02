# Happy Run — 온디바이스 LLM 페이스 메이커 기술 조사

> 작성일: 2026-04-02
> 목적: 엣지 LLM 탑재를 통한 페이스 메이커 지능화

---

## 1. 현재 페이스 메이커 구조

`context/ActiveRunStore.ts`의 `checkVoiceCoach()`는 완전 규칙 기반으로 동작 중.

| 트리거 | 조건 | 발화 내용 |
|--------|------|-----------|
| 거리 기반 | 1km 단위 | 현재 페이스 + 느림/빠름/완벽 판정 |
| 시간 기반 | 5분 단위 | 경과 시간 + 누적 거리 |
| 루틴 기반 | 세그먼트 종료 10초/100m 전 | 다음 세그먼트 예고 |

**페이스 판정 로직 (단순 임계값):**
```typescript
if (avgPace > targetPace + 15초) → "너무 느립니다"
if (avgPace < targetPace - 15초) → "너무 빠릅니다"
else                             → "완벽합니다"
```

**LLM 도입 시 개선 가능한 부분:**
- "후반 3km 구간에서 계속 느려지고 있어요. 호흡을 고르고 팔 동작을 작게 해보세요"
- 급격한 페이스 변화 시 즉시 반응 (1km 고정 간격 탈피)
- 거리 + 시간 + 페이스 추세 + 루틴 진행 종합 판단
- 사용자와 실시간 대화형 코칭

---

## 2. LLM에 전달 가능한 런타임 데이터

`ActiveRunStore.ts`의 RunState에서 다음 데이터를 컨텍스트로 활용 가능:

```typescript
{
  distanceKm: number,          // 누적 달성 거리
  currentSpeed: number,        // 현재 속도 (m/s)
  seconds: number,             // 경과 시간
  avgPace: number,             // 평균 페이스 (초/km)
  targetPace: number,          // 목표 페이스
  targetDistanceKm: number,    // 목표 거리
  currentSegmentIndex: number, // 현재 루틴 세그먼트
  recentPaceTrend: string,     // 최근 500m vs 전체 평균 추세
}
```

---

## 3. 온디바이스 탑재 후보 모델 비교

### 3-1. 최종 후보 3종

| 항목 | SmolLM2 360M | Qwen 2.5 0.5B | Gemma 3 1B |
|------|-------------|--------------|------------|
| 모델 크기 (INT4) | **~250MB** | ~400MB | ~529MB |
| 추론 속도 | 초고속 | 빠름 | 빠름 |
| 한국어 품질 | 보통 | **우수** | 보통 |
| 대화 맥락 유지 | 짧은 대화만 | 보통 | 양호 |
| 러닝 중 부하 | **낮음** | 낮음 | 중간 |
| Expo 통합 | react-native-executorch | llama.rn | **expo-llm-mediapipe** |
| 개발 난이도 | 중간 | 낮음~중간 | **낮음** |

### 3-2. 기타 검토 모델

| 모델 | 크기 | 특이사항 |
|------|------|---------|
| SmolLM2 135M | ~100MB | 너무 작아 코칭 품질 불충분 |
| SmolLM2 1.7B | ~1.1GB | 고품질이나 무거움 |
| Qwen 2.5 1.5B | ~1.0GB | 한국어 최강, 기기 제한 있음 |
| Gemma 3n E2B | ~2.0GB | 멀티모달 지원, 너무 무거움 |
| Phi-3 Mini | ~2.2GB | 성능 우수, 모바일 한계 수준 |
| Gemini Nano | 0MB (내장) | Pixel 8+, S24+ 전용 |

---

## 4. React Native 연동 프레임워크 비교

| 프레임워크 | 패키지명 | 지원 모델 | Expo 호환 | 난이도 |
|-----------|---------|---------|----------|--------|
| **llama.rn** | `llama.rn` | GGUF 전체 | prebuild 필요 | 낮음 |
| **react-native-executorch** | `react-native-executorch` | SmolLM2, Qwen3, Llama 3.2 | New Architecture 필수 | 중간 |
| **expo-llm-mediapipe** | `expo-llm-mediapipe` | Gemma 시리즈 | 완벽 호환 | 낮음 |
| **onnxruntime-react-native** | `onnxruntime-react-native` | ONNX 변환 모델 (Phi-3 등) | 가능 | 높음 |
| **MLC-LLM** | 별도 설정 | Llama, Gemma, Phi, Qwen | 복잡 | 높음 |

---

## 5. 실시간 대화 구현 흐름

```
사용자 음성 입력
      ↓
expo-speech (STT) 또는 기기 내장 음성인식
      ↓
온디바이스 LLM (텍스트 처리 + 코칭 생성)
      ↓
expo-speech (TTS 발화)
```

**러닝 중 동시 구동 스택:**
```
GPS (expo-location)
  + STT (음성 입력)
  + LLM (텍스트 생성)
  + TTS (expo-speech)
```

> 주의: 4가지 동시 구동 시 배터리 소모 가속. 코칭 요청 시에만 LLM 활성화 권장.

---

## 6. 개발 방향 결정 기준

| 우선순위 | 추천 선택 | 이유 |
|---------|---------|------|
| 빠른 통합 | **Gemma 3 1B** + `expo-llm-mediapipe` | Expo 공식 지원, 난이도 최저 |
| 한국어 품질 | **Qwen 2.5 0.5B** + `llama.rn` | 한국어 자연스러움, GGUF 범용 |
| 최경량 | **SmolLM2 360M** + `react-native-executorch` | 250MB, 모든 기기 호환 |

---

## 7. 구현 시 예상 이슈

1. **모델 번들링**: APK에 포함 시 스토어 업로드 크기 제한 초과 가능 → 첫 실행 시 다운로드 방식 권장
2. **New Architecture**: `react-native-executorch`는 Fabric(New Architecture) 필수 — `app.json`에 `newArchEnabled: true` 확인 필요 (현재 설정됨)
3. **STT 라이브러리**: Expo 기본 제공 없음 → `expo-speech`의 TTS만 있음, STT는 별도 패키지 (`@react-native-voice/voice` 등) 필요
4. **iOS 배포**: iOS는 App Store 심사 시 온디바이스 모델 다운로드 정책 확인 필요
5. **메모리 압박**: 러닝 중 GPS + LLM 동시 사용 시 저사양 기기(RAM 3GB 이하) 주의

---

## 8. 다음 개발 단계 (TODO)

- [ ] 프레임워크 최종 선택 (Gemma 3 1B / Qwen 2.5 0.5B / SmolLM2 360M 중)
- [ ] 선택 패키지 설치 및 `expo prebuild` 재실행
- [ ] 모델 로딩 + 텍스트 생성 기본 테스트
- [ ] `ActiveRunStore.ts`에 LLM 코칭 분기 추가
- [ ] STT 라이브러리 선택 및 통합 (`@react-native-voice/voice`)
- [ ] 배터리 최적화: LLM 호출 시점 제한 로직 설계
- [ ] 오프라인 폴백: LLM 미로드 시 기존 규칙 기반 코칭 유지

---

## 참고 자료

- [expo-llm-mediapipe](https://github.com/tirthajyoti-ghosh/expo-llm-mediapipe)
- [llama.rn](https://github.com/mybigday/llama.rn)
- [react-native-executorch](https://github.com/software-mansion/react-native-executorch)
- [SmolLM2 HuggingFace](https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct)
- [Gemma 3 on mobile](https://ai.google.dev/gemma/docs/integrations/mobile)
- [Qwen 2.5 GGUF](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF)
