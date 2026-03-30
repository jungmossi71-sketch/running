# Happy Run 앱 코드 검토 보고서

> 검토일: 2026-03-30
> 검토 대상: app/, context/ 전체 (약 3,761줄)

---

## 검토 요약

| 구분 | 항목 수 |
|------|---------|
| 🔴 긴급 (즉시 수정) | 3 |
| 🟠 높음 (우선 수정) | 4 |
| 🟡 중간 (개선 권장) | 3 |
| ⚪ 낮음 (장기 과제) | 5 |

---

## 🔴 긴급 — 즉시 수정 필요

### 1. 프로덕션 테스트 코드 잔존 (`context/HistoryContext.tsx`)
- 마일리지를 항상 `9999`로 강제 설정하는 코드가 남아 있음
- 배포 시 모든 사용자에게 무제한 마일리지가 지급됨
- `AsyncStorage`에 저장된 실제 잔액도 무시됨
- **수정**: 테스트 코드 제거, `AsyncStorage`에서 실제 값 로드하도록 복구

### 2. 메모리 누수 (`app/run.tsx`)
- `Animated.loop()`가 여러 채널 분기에서 중복 실행될 수 있고 cleanup이 불완전함
- `Audio.Sound` 리소스가 컴포넌트 언마운트 시 해제되지 않을 수 있음
- GPS 백그라운드 작업 타이밍에 따라 cleanup이 누락될 수 있음
- **수정**: useEffect cleanup 보강, Audio.Sound unloadAsync 명시적 호출

### 3. 실내 모드 UI 오류 (`app/run.tsx`)
- 실내 모드 전환 시에도 "GPS SIGNAL ACTIVE" 텍스트가 표시됨
- 사용자 혼동 유발
- **수정**: 실내 모드에서는 "Indoor Mode" 또는 "GPS 비활성" 표시로 변경

---

## 🟠 높음 — 우선 수정 권장

### 4. 에러 처리 부재 (`app/run.tsx`)
- 오디오 초기화/재생 실패 시 `console.log`만 하고 무시
- GPS 권한 거부 후 사용자에게 안내 없음
- 라디오 스트림 네트워크 오류 시 UI 응답 없음
- **수정**: 사용자에게 오류 상태 표시, 권한 거부 시 설정 안내

### 5. 프리셋 로드 버그 (`context/BuilderContext.tsx`)
- `loadPreset()` 호출 시 기존 루틴이 초기화되지 않고 프리셋이 덮어쓰임
- 기대 동작: 프리셋 로드 시 기존 루틴 대체
- **수정**: `setCurrentRoutine([...preset.segments])` 전에 `clearRoutine()` 호출 (또는 setCurrentRoutine 자체가 교체 역할이므로 로직 확인)

> ⚠️ 실제 확인 결과: `setCurrentRoutine`이 replace이므로 세그먼트는 교체되나,
> `currentRoutineName`이 별도로 업데이트되어야 하며, 문제 없음. 단, 세그먼트 추가가 중복될 수 있는 UI 흐름 존재.

### 6. 세그먼트 입력값 검증 없음 (`app/(tabs)/explore.tsx`)
- 페이스(분/초)에 음수, 0, 999 등 비정상 값 입력 가능
- 거리 세그먼트에 0 입력 시 의미 없는 구간 생성
- **수정**: 입력 범위 클램핑 및 최솟값 검증 추가

### 7. AsyncStorage 데이터 무결성 (`context/HistoryContext.tsx`, `VoiceCoachContext.tsx`)
- `JSON.parse()` 호출 시 try-catch 없는 곳 존재
- 손상된 스토리지 데이터로 앱 크래시 가능
- **수정**: 모든 `JSON.parse()` 에 try-catch 추가, 실패 시 기본값 사용

---

## 🟡 중간 — 개선 권장

### 8. 세그먼트 ID 충돌 가능성 (`context/BuilderContext.tsx`)
- `Date.now().toString()`으로 ID 생성 → 빠른 연속 추가 시 중복 가능
- **수정**: `Math.random()`과 조합하거나 간단한 UUID 생성 함수 사용

### 9. 상태 관리 중복 (`app/run.tsx`)
- GPS 데이터를 `runState`, `distanceKm`, `currentSpeed` 등 여러 로컬 상태에 중복 저장
- 불필요한 리렌더링 발생
- **수정**: `activeRunStore.subscribe` 콜백에서 하나의 상태 객체로 통합

### 10. 다국어 하드코딩 (`app/theme.tsx`)
- "기본 (Default)", "아침의 숲 (Morning)" 등 테마 이름이 한글 고정
- `i18n` 키로 교체 필요

---

## ⚪ 낮음 — 장기 과제

| 항목 | 설명 |
|------|------|
| 헬스킷 / 구글핏 연동 | 러닝 앱 필수 기능이나 현재 미구현 |
| 오프라인 모드 | 라디오 스트림 네트워크 필수 |
| 심박수 연동 | UI 공간은 있으나 데이터 미연결 |
| 소셜 공유 | 기록 공유 기능 없음 |
| 접근성 (a11y) | 스크린 리더, 포커스 관리 없음 |

---

## 파일별 완성도

| 파일 | 완성도 | 주요 이슈 |
|------|--------|-----------|
| `context/ActiveRunStore.ts` | ⭐⭐⭐⭐⭐ | 없음 (잘 구현됨) |
| `app/(tabs)/index.tsx` | ⭐⭐⭐⭐ | 에러 처리 부재 |
| `app/(tabs)/history.tsx` | ⭐⭐⭐⭐ | 삭제 실패 피드백 없음 |
| `context/VoiceCoachContext.tsx` | ⭐⭐⭐⭐⭐ | 없음 |
| `context/ThemeContext.tsx` | ⭐⭐⭐⭐ | 커스텀 배경 자동 삭제 |
| `context/BuilderContext.tsx` | ⭐⭐⭐⭐ | ID 충돌, 프리셋 로드 |
| `context/HistoryContext.tsx` | ⭐⭐⭐ | 테스트 코드, AsyncStorage 무시 |
| `app/(tabs)/explore.tsx` | ⭐⭐⭐⭐ | 입력 검증 없음 |
| `app/theme.tsx` | ⭐⭐⭐⭐ | 다국어 하드코딩 |
| `app/run.tsx` | ⭐⭐⭐ | 메모리 누수, 에러 처리 |

---

## 수정 진행 현황

- [x] 검토 보고서 작성
- [x] HistoryContext 마일리지 테스트 코드 제거 + AsyncStorage 실제 값 로드 + JSON 파싱 에러 처리
- [x] run.tsx Audio 스트림 cancelled 플래그로 race condition 수정
- [x] run.tsx GPS useEffect cancelled 플래그 추가
- [x] run.tsx 실내 모드 "GPS SIGNAL ACTIVE" → "INDOOR MODE — GPS OFF" 수정
- [x] run.tsx GPS 권한 거부 시 locationPermissionDenied 상태 + UI 안내 메시지 추가
- [x] BuilderContext AsyncStorage JSON 파싱 에러 처리 추가
- [x] BuilderContext 세그먼트 / 프리셋 ID 충돌 방지 (Date.now + random 조합)
- [x] explore.tsx 세그먼트 value 최솟값 0.1 클램핑, 페이스 분/초 0~59 범위 제한
- [x] VoiceCoachContext — 이미 try-catch 존재, 수정 불필요
- [x] run.tsx distanceKm / currentSpeed / route 상태 중복 제거 → runState.* 로 통합
- [x] theme.tsx 테마 이름 전부 i18n 키로 교체 (6개 언어: en/ko/zh/ja/es/hi)
- [x] run.tsx 라디오 스트림 FAILED 시 빨간 오프라인 안내 메시지 표시
- [x] history.tsx 런 기록 공유 버튼 추가 (expo-sharing + expo-file-system/legacy)
- [x] history.tsx 삭제 실패 시 Alert 피드백 추가
- [x] ThemeContext 커스텀 배경 자동 삭제 버그 수정 (테마 전환 시 데이터 보존)
- [x] ThemeContext unlocked_themes AsyncStorage 파싱 에러 처리 추가
