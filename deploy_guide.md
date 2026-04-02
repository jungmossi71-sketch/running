# Happy Run 앱 배포 가이드

> 작성일: 2026-03-31
> 플랫폼: Windows 11 + Android

---

## 사전 준비

| 항목 | 값 |
|------|-----|
| JDK | Eclipse Adoptium JDK 17 (`C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot`) |
| Android SDK | `C:\Users\iwoul\AppData\Local\Android\Sdk` |
| 설치된 플랫폼 | android-36.1 |
| 설치된 build-tools | 36.1.0 |

---

## 1단계: android 폴더 생성 (최초 1회 또는 app.json 변경 후)

```powershell
cd C:\git\running
npx expo prebuild --platform android --clean
```

> `--clean` 옵션은 기존 android 폴더를 삭제하고 재생성합니다.
> app.json을 변경하지 않았다면 이 단계는 생략 가능합니다.

---

## 2단계: APK 빌드

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
cd C:\git\running\android
.\gradlew assembleRelease
```

> **주의**: `$env:JAVA_HOME` 설정은 매 터미널 세션마다 입력해야 합니다.
> 첫 빌드는 Gradle 의존성 다운로드로 약 20분 소요, 이후 빌드는 약 5분.

빌드 성공 메시지:
```
BUILD SUCCESSFUL in X min
```

---

## 3단계: APK 파일 위치

```
C:\git\running\android\app\build\outputs\apk\release\app-release.apk
```

---

## 4단계: 핸드폰에 설치

### 방법 A: USB 파일 전송

1. USB 케이블로 핸드폰 연결
2. 핸드폰에서 **USB 연결 방식 → "파일 전송(MTP)"** 선택
3. Windows 탐색기에서 핸드폰 드라이브 열기
4. 원하는 폴더(예: `카카오톡 > Received`)에 `app-release.apk` 복사
5. 핸드폰 **내 파일** 앱 → 해당 폴더 이동 → APK 파일 탭
6. **설치** 선택 → "이 출처의 앱 설치 허용" 팝업 시 **허용**

### 방법 B: adb 직접 설치 (USB 디버깅 활성화 필요)

```powershell
adb devices   # 기기 연결 확인
adb install C:\git\running\android\app\build\outputs\apk\release\app-release.apk
```

---

## 문제 해결

### JAVA_HOME 오류
```
ERROR: JAVA_HOME is set to an invalid directory
```
→ 터미널에서 직접 설정 후 재실행:
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
```

### Kotlin 버전 오류
```
Can't find KSP version for Kotlin version 'X.X.X'
```
→ `app.json`의 `kotlinVersion`을 지원 버전으로 변경 (현재: `2.1.21`)
→ `android/gradle.properties`의 `android.kotlinVersion`도 동일하게 변경

### compileSdkVersion 오류
→ `app.json`에서 설치된 SDK 버전과 일치시킬 것 (현재: `36`)

---

## 현재 app.json 빌드 설정 요약

```json
"compileSdkVersion": 36,
"targetSdkVersion": 35,
"buildToolsVersion": "36.1.0",
"kotlinVersion": "2.1.21"
```

---

## EAS 클라우드 빌드 (참고)

EAS 클라우드 빌드는 macOS/Linux 서버에서 실행되므로 Windows 환경 제약 없음.
단, Free 플랜은 월 빌드 횟수 제한 있음.

```powershell
# EAS 로그인
eas login

# 클라우드 빌드 (Free 플랜 잔여 횟수 확인 후 사용)
eas build -p android --profile preview
```
