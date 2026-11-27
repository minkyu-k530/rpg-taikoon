#!/bin/sh
# unity/Build/WebGL 내용을 gh-pages 브랜치 루트에 올린다. 공개 주소: https://minkyu-k530.github.io/rpg-taikoon/
# 임시 git worktree에서 커밋하고 origin/gh-pages로 푸시한다. 작업 중인 브랜치와 작업 트리는 건드리지 않는다.
# 커밋 작성자는 저장소 git config 그대로다.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
REPO=$(git -C "$ROOT" rev-parse --show-toplevel)
SRC="$ROOT/Build/WebGL"

if [ ! -d "$SRC" ] || [ ! -s "$SRC/index.html" ]; then
  echo "빌드 폴더나 index.html 없음: $SRC (먼저 sh unity/tools/build-webgl.sh)" >&2
  exit 1
fi
BIG=$(find "$SRC" -type f -size +99M | head -1)
if [ -n "$BIG" ]; then
  echo "GitHub Pages 파일 크기 제한(100MB) 초과: $BIG" >&2
  exit 1
fi

SOURCE_SHA=$(git -C "$REPO" rev-parse --short HEAD)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/gh-pages.XXXXXX")
TEMP_BRANCH=""
cleanup() {
  git -C "$REPO" worktree remove --force "$WORK" 2>/dev/null || rm -rf "$WORK"
  if [ -n "$TEMP_BRANCH" ]; then git -C "$REPO" branch -D "$TEMP_BRANCH" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

if git -C "$REPO" ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git -C "$REPO" fetch origin gh-pages
  git -C "$REPO" worktree add --detach "$WORK" FETCH_HEAD
else
  echo "gh-pages 브랜치가 없어 orphan 브랜치로 만든다."
  git -C "$REPO" worktree add --detach "$WORK" HEAD
  TEMP_BRANCH="gh-pages-deploy-$$"
  git -C "$WORK" checkout --orphan "$TEMP_BRANCH"
fi

git -C "$WORK" rm -rf --quiet . >/dev/null 2>&1 || true
find "$WORK" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$SRC"/. "$WORK"/
[ -f "$WORK/.nojekyll" ] || : > "$WORK/.nojekyll"
git -C "$WORK" add -A
if git -C "$WORK" diff --cached --quiet; then
  echo "바뀐 파일 없음. 푸시하지 않는다."
  exit 0
fi
git -C "$WORK" commit --quiet -m "웹 빌드 배포 ($SOURCE_SHA)"
git -C "$WORK" push origin HEAD:refs/heads/gh-pages
echo "배포 완료: https://minkyu-k530.github.io/rpg-taikoon/"
