# 트러블슈팅

에러·버그·삽질을 번호 붙여 쌓는다. 같은 걸 두 번 겪지 않기 위한 문서다.

기록 형식:

```
## TS-00N. 한 줄 증상
- 환경: 언제/어디서
- 증상: 실제로 화면이나 콘솔에 나온 것 (추측 말고 그대로)
- 원인: 진짜 원인
- 해결: 고친 방법 (커밋/파일 경로)
- 교훈: 다음에 비슷한 걸 만나면 어디부터 볼 것인가
```

원인을 못 찾고 우회했다면 **"우회함"이라고 솔직히 적는다.** 나중에 다시 터진다.

---

## TS-001. `gh pr create`가 404 — git push는 되는데 API만 레포를 못 찾음

- **환경**: 2026-11-23, `docs/game-design` 브랜치 첫 PR 시도. remote는 `https://github.com/JungMK0720/rpg-freestyle.git`
- **증상**
  ```
  $ gh pr create --base main --head docs/game-design ...
  GraphQL: Could not resolve to a Repository with the name 'JungMK0720/rpg-freestyle'. (repository)
  ```
  그런데 `git push`는 정상 성공하고 `git ls-remote`도 브랜치를 다 가져온다.
- **조사 과정**

  | 확인 | 결과 |
  |---|---|
  | `gh auth status` | `minkyu-k530` 로그인, scope `repo` 포함 — 권한 문제 아님 |
  | `git config credential.helper` | `!gh auth git-credential` → **git도 같은 토큰을 쓴다** |
  | `GET /repos/JungMK0720/rpg-freestyle` | 404 |
  | `GET /users/JungMK0720` | 404 — **이 계정이 API에 존재하지 않음** |
  | `GET /github.com/JungMK0720/rpg-freestyle` (웹) | 404 |
  | `GET .../info/refs?service=git-upload-pack` (git 프로토콜) | **200** |
  | `gh api user/repos?per_page=100` (69개 전부) | `rpg-freestyle` 없음 |

- **원인**: 같은 토큰으로 **git 프로토콜은 200, REST/GraphQL은 404**. 계정명 `JungMK0720`이 API에서 조회되지 않는 것으로 보아 레포 소유 계정이 이름 변경되었거나 접근 경로가 바뀐 상태. git은 리다이렉트를 따라가지만 API는 옛 경로를 404로 끊는다.
- **해결**: 미해결. 아래 중 하나 필요
  1. 레포 소유 계정으로 `gh auth login`을 추가하고 `gh auth switch`
  2. `git remote set-url origin <현재 정식 URL>`로 remote 갱신
- **우회**: 브랜치 push는 정상이므로, push 후 GitHub가 출력하는 `pull/new/<branch>` 링크로 사람이 PR을 생성
- **교훈**: `gh`가 404를 뱉고 `git`은 되면 권한이 아니라 **경로(계정명/레포명) 문제**를 먼저 의심한다. `gh api users/<owner>`를 찍어보면 1초 만에 갈린다.

---

<!-- 여기서부터 항목 추가 -->
