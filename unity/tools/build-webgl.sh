#!/bin/sh
# 1번 공간 WebGL 빌드 (GitHub Pages용). 출력: unity/Build/WebGL
# 종료 코드: 0 성공, 1 실패, 2 Unity 라이선스 없음.
set -u
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
UNITY=${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.29f1/Unity.app/Contents/MacOS/Unity}
OUT="$ROOT/Build/WebGL"
LOG="$ROOT/Build/Logs/build-webgl.log"

if [ ! -x "$UNITY" ]; then
  echo "Unity 실행 파일 없음: $UNITY" >&2
  exit 1
fi
if [ ! -d "$(dirname "$UNITY")/../../../PlaybackEngines/WebGLSupport" ]; then
  echo "WebGL 빌드 지원 모듈 없음: $(dirname "$UNITY")/../../../PlaybackEngines/WebGLSupport" >&2
  exit 1
fi
mkdir -p "$ROOT/Build/Logs"
echo "WebGL 빌드 (로그: $LOG)"
"$UNITY" -batchmode -projectPath "$ROOT" -buildTarget WebGL -executeMethod Unjungcheon.EditorTools.Pipeline.BuildWebGL -logFile "$LOG"
CODE=$?
if grep -qE "No valid Unity Editor license found|License is not active|Unity has not been activated" "$LOG" 2>/dev/null; then
  echo "Unity 라이선스 없음: $LOG" >&2
  exit 2
fi
grep -E "^WebGL (build|largest file|output):" "$LOG"
if [ $CODE -ne 0 ] || [ ! -s "$OUT/index.html" ]; then
  echo "WebGL 빌드 실패 (종료 코드 $CODE). 로그: $LOG" >&2
  grep -E "error CS|Exception|Error building|BuildFailedException" "$LOG" | head -20 >&2
  exit 1
fi
[ -f "$OUT/.nojekyll" ] || : > "$OUT/.nojekyll"
echo "파일 (큰 순):"
find "$OUT" -type f -exec ls -l {} + | awk '{printf "%10.2f MB  %s\n", $5/1048576, $9}' | sort -rn | head -8
echo "WebGL: $OUT"
echo "로컬 확인: (cd \"$OUT\" && python3 -m http.server 8090)"
exit 0
