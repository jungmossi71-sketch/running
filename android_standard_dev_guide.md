# 📱 안드로이드 프로젝트 표준 개발 & 빌드 가이드 (ver 1.0)

본 가이드 항목들은 `Happy Run` 프로젝트의 안정적인 안드로이드 빌드와 배포를 위해 반드시 지켜야 할 기술 표준 및 환경 설정 지침을 정의합니다.

---

## 🏗 [1장] 안드로이드 표준 빌드 환경 (Local Setup)

빌드가 성공해도 내 폰에 앱이 안 들어온다면, 십중팔구 이 환경 설정의 문제입니다.

### 1.1 필수 도구 설치 (Must-have Tools)
*   **Android Studio**: 최신 안정화 버전(Stable) 설치.
*   **SDK Platform-Tools**: Android Studio 내 SDK Manager를 통해 반드시 설치 (`adb.exe` 포함).

### 1.2 시스템 환경 변수 (Path) 설정 - Windows 기준
윈도우가 안드로이드 도구를 언제든 부를 수 있도록 '길'을 터줘야 합니다.
*   **변수명: `ANDROID_HOME`**
    *   경로: `C:\Users\아이디\AppData\Local\Android\Sdk`
*   **변수명: `Path` (편집 -> 새로 만들기)**
    1. `%ANDROID_HOME%\platform-tools` (이것이 없으면 adb 명령어 사용 불가)
    2. `%ANDROID_HOME%\emulator`
    3. `%ANDROID_HOME%\tools\bin`

---

## 🖼 [2장] 자산(Assets) 관리 규칙 : "이미지 하나가 빌드를 멈춥니다"

클라우드 빌드(EAS) 실패의 90%는 이미지 파일에서 옵니다. 안드로이드 리소스 처리기(AAPT2)는 매우 엄격합니다.

### 2.1 파일명 명명 규칙 (Critical)
*   **소문자만 사용**: `logo_icon.png` (O) / `LogoIcon.png` (X), `logo-ICON.PNG` (X)
*   **특수문자 및 공백 금지**: `my running image.png` (X) -> `my_running_image.png` (O)
*   **확장자 통일**: 실제로 `.jpg`인 파일을 이름만 바꿔서 `.png`로 쓰지 마세요. 파일 속성을 확인하고 일치시키세요.
*   **중복 제거**: 같은 폴더에 `home.png`와 `home.jpg`가 함께 있으면 안 됩니다. 안드로이드는 어떤 것을 리소스로 쓸지 정하지 못해 빌드를 멈춥니다.

### 2.2 대소문자 주의 (Case Sensitivity)
내 컴퓨터(Windows)에서는 `image.png`와 `Image.png`를 똑같이 보지만, 빌드 서버(Linux)는 전혀 다른 파일로 인식합니다. 코드가 대문자를 가리키는데 파일이 소문자라면 빌드 서버에서 파일을 못 찾아 에러가 납니다.

---

## 🚀 [3장] 빌드 및 설치 표준 가이드 (Deployment)

### 3.1 기기 연결 확인 (Connectivity)
빌드 전 다음 명령어로 기기가 정상 인식되었는지 반드시 확인하세요.
```powershell
adb devices
```
*   **unauthorized**라고 뜬다면: 휴대폰 화면을 켜고 "USB 디버깅 허용" 팝업을 승인하세요.
*   **device**라고 떠야 정상입니다.

### 3.2 단계별 배포 명령어 (Success Strategy)

#### (1단계) 클라우드 빌드 실행 (APK 생성)
```powershell
eas build -p android --profile preview
```

#### (2단계) 내 폰에 즉시 설치 (가장 추천하는 수동 설치법)
자동 설치(`eas build:run`)가 실패할 경우, 아래 명령어를 실행하세요.
```powershell
# 최신 빌드 목록에서 APK 주소를 가져와 다운로드 후 설치
eas build:list --platform android --limit 1
# (수동 설치 예시)
Invoke-WebRequest -Uri "추출된_APK_URL" -OutFile "app.apk"; adb install -r "app.apk"
```

---

## 🛠 [4장] 트러블슈팅 가이드 (Problem Solving)

| 문제 상황 | 해결 방법 |
| :--- | :--- |
| **spawn adb ENOENT** | 환경 변수 `Path`에 `platform-tools` 경로가 누락됨 (1장 참고) |
| **build command failed (Cloud)** | 최근 추가한 이미지 파일의 이름, 확장자, 대소문자 확인 (2장 참고) |
| **Using cached app... (무반응)** | `adb devices` 확인. 기기가 없거나 에뮬레이터가 켜지지 않음 (3장 참고) |
| **Installation failed (Physical Phone)** | 휴대폰 화면의 'Play 프로텍트 차단' 또는 '설치 승인' 팝업 확인 |

---

**안드로이드 개발 시 이 가이드를 꼼꼼히 지켜주시면, 앞으로 빌드 에러 없이 쾌적한 개발이 가능할 것입니다.**
