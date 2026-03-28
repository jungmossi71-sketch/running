# 🛠 빌드 문제 해결 이력 로그 (Troubleshooting Log)

본 문서는 `Happy Run` 개발 과정에서 발생한 주요 빌드 결함과 그에 대한 대응 방안을 기록합니다.

## 1. 'adb' 실행 파일 인식 불가 (ENOENT)
*   **상황**: `spawn adb ENOENT`, `adb executable doesn't seem to work` 에러 발생.
*   **원인**: 안드로이드 SDK가 설치되지 않았거나 시스템 Path 경로에 `platform-tools` 폴더가 누락됨.
*   **해결**: 
    1. 안드로이드 스튜디오 설치 및 SDK Platform-Tools 설치 확인.
    2. 환경 변수 `ANDROID_HOME` 설정 및 `platform-tools` 경로를 `Path`에 추가.
    3. 터미널 재시작 후 `adb --version` 확인.

## 2. EAS Build:run 자동 설치 실패
*   **상황**: `Using cached app...` 이후 아무런 진전 없이 명령어가 종료됨.
*   **원인**: `eas` CLI가 연결된 안드로이드 기기(갤럭시 S25+)를 명확하게 타겟팅하지 못함.
*   **해결**: `eas build:list`를 통해 직접 아티팩트(APK) URL을 추출한 후, `Invoke-WebRequest`와 `adb install`을 결합한 수동 명령어 실행으로 최종 성공.

## 3. 갤럭시 기기 권한 문제 (Unauthorized)
*   **상황**: `adb devices` 리스트에는 보이지만 설치가 거부됨.
*   **원인**: 휴대폰에서 'USB 디버깅 권한' 승인이 이루어지지 않음.
*   **해결**: 갤럭시 설정 -> 개발자 옵션 -> USB 디버깅 활성화 -> 휴대폰 화면의 디바이스 승인 팝업에서 '항상 허용' 체크 및 확인.

## 4. Gradle 호환성 및 이미지 리소스 문제
*   **상황**: 클라우드 빌드 중 이미지 파일 확장자 또는 대소문자 문제로 빌드 중단.
*   **원인**: 안드로이드 리소스 처리기(AAPT2)의 엄격한 명명 규칙 위반.
*   **해결**: 모든 이미지 리소스를 소문자 및 언더바(_) 형식으로 통일하고, 잘못된 확장자와 대소문자 표기를 일일이 수정하여 성공.
