#!/bin/sh
# 1번 공간 일괄 생성: 프로젝트 열기(패키지 해석) → ProjectSetup → SceneBuilder → 스크린샷 3장 → PlayMode 테스트.
# 종료 코드: 0 성공, 1 실행 실패 또는 배치 요약이 기준과 다름, 2 Unity 라이선스 없음, 3 PlayMode 테스트 실패.
# 옵션: --update-layout  의도한 씬 변경이 있을 때 이번 배치 요약을 새 기준으로 저장한다(차이가 있어도 실패로 보지 않는다).
set -u
UPDATE_LAYOUT=0
for arg in "$@"; do
  case "$arg" in
    --update-layout) UPDATE_LAYOUT=1 ;;
    *) echo "알 수 없는 옵션: $arg (사용법: build-scene.sh [--update-layout])" >&2; exit 1 ;;
  esac
done
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
UNITY=${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.29f1/Unity.app/Contents/MacOS/Unity}
LOGS="$ROOT/Build/Logs"
SHOTS="$ROOT/Build/Screenshots"

no_license() {
  echo "Unity 라이선스 없음: Unity 에디터를 실행하지 않았거나 라이선스 확인에 실패했습니다. ($1)" >&2
  exit 2
}

if [ ! -x "$UNITY" ]; then
  echo "Unity 실행 파일 없음: $UNITY" >&2
  exit 1
fi
if [ -z "${UNITY_LICENSE_CONTENT:-}" ] && [ -z "${UNITY_SERIAL:-}" ] \
  && [ ! -s "/Library/Application Support/Unity/Unity_lic.ulf" ] \
  && [ ! -s "$HOME/Library/Application Support/Unity/Unity_lic.ulf" ] \
  && [ ! -s "$HOME/.local/share/unity3d/Unity/Unity_lic.ulf" ]; then
  no_license "라이선스 파일 없음"
fi

# 로그에서 라이선스 실패를 찾는다.
license_failed() {
  grep -qE "No valid Unity Editor license found|License is not active|Failed to activate|Unity has not been activated|com.unity.editor.headless" "$1" 2>/dev/null
}

mkdir -p "$LOGS" "$SHOTS"
rm -f "$SHOTS"/*.png "$LOGS/playmode-results.xml"
# 결정성 확인용 기준 배치 요약. 기준이 없으면 직전 실행 결과(있으면)를 기준으로 삼는다.
LAYOUT="$LOGS/scene-layout.txt"
BASELINE="$LOGS/scene-layout.baseline.txt"
if [ ! -s "$BASELINE" ] && [ -s "$LAYOUT" ]; then cp "$LAYOUT" "$BASELINE"; fi
rm -f "$LAYOUT"

# 1) 씬 생성과 스크린샷: 렌더링이 필요하므로 -nographics를 쓰지 않는다.
BUILD_LOG="$LOGS/build-scene.log"
echo "[1/2] 씬 생성 + 스크린샷 (로그: $BUILD_LOG)"
"$UNITY" -batchmode -projectPath "$ROOT" -executeMethod Unjungcheon.EditorTools.Pipeline.BuildAll -logFile "$BUILD_LOG"
CODE=$?
if license_failed "$BUILD_LOG"; then no_license "$BUILD_LOG"; fi
if [ $CODE -ne 0 ]; then
  echo "씬 생성 실패 (종료 코드 $CODE). 로그: $BUILD_LOG" >&2
  grep -E "error CS|Exception|Error" "$BUILD_LOG" | head -20 >&2
  exit 1
fi
echo "Scene: $ROOT/Assets/Scenes/Location1_Skala.unity"
COUNT=$(wc -l < "$LAYOUT" | tr -d ' ')
if [ ! -s "$BASELINE" ]; then
  cp "$LAYOUT" "$BASELINE"
  echo "Layout: 기준 없음, 이번 결과를 기준으로 저장 (${COUNT}개 오브젝트, $BASELINE)"
elif cmp -s "$BASELINE" "$LAYOUT"; then
  echo "Layout: 기준과 같음 (${COUNT}개 오브젝트)"
elif [ $UPDATE_LAYOUT -eq 1 ]; then
  diff "$BASELINE" "$LAYOUT" | grep -c '^[<>]' | xargs printf "Layout: 기준과 %s줄 다름 → --update-layout으로 새 기준 저장\n"
  cp "$LAYOUT" "$BASELINE"
else
  echo "Layout: 기준과 다름 — 씬 생성이 결정적이지 않거나 씬이 바뀌었다 (diff $BASELINE $LAYOUT)" >&2
  diff "$BASELINE" "$LAYOUT" | head -10 >&2
  echo "의도한 변경이면 sh unity/tools/build-scene.sh --update-layout 으로 기준을 갱신한다." >&2
  exit 1
fi
for f in third-person first-person campus-front entrance-refusal fish-cooking badge-comparison; do
  if [ -s "$SHOTS/$f.png" ]; then echo "PNG: $SHOTS/$f.png"; else echo "PNG 없음: $SHOTS/$f.png" >&2; exit 1; fi
done

# 2) PlayMode 테스트
TEST_LOG="$LOGS/playmode.log"
RESULTS="$LOGS/playmode-results.xml"
echo "[2/2] PlayMode 테스트 (로그: $TEST_LOG)"
"$UNITY" -batchmode -projectPath "$ROOT" -runTests -testPlatform PlayMode -testResults "$RESULTS" -logFile "$TEST_LOG"
CODE=$?
if license_failed "$TEST_LOG"; then no_license "$TEST_LOG"; fi
if [ ! -s "$RESULTS" ]; then
  echo "PlayMode 결과 없음 (종료 코드 $CODE). 로그: $TEST_LOG" >&2
  exit 1
fi
SUMMARY=$(grep -o '<test-run [^>]*>' "$RESULTS" | head -1)
echo "PlayMode: $(echo "$SUMMARY" | grep -oE '(total|passed|failed|skipped)="[0-9]+"' | tr '\n' ' ')"
echo "PlayMode results: $RESULTS"
if [ $CODE -ne 0 ]; then
  grep -oE 'name="[^"]+"[^>]*result="Failed"' "$RESULTS" >&2
  exit 3
fi
exit 0
