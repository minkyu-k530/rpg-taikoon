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

- **진짜 원인**: `JungMK0720/rpg-freestyle` **레포가 애초에 존재하지 않았다.** 과거에 만들려다 만 remote 주소가 `.git/config`에 그대로 남아 있었던 것.
  - **미확인**: 그럼 `git push`와 `git ls-remote`는 왜 성공했는가. 이건 끝까지 설명하지 못했다. 추측하지 않고 "원인 미상"으로 남긴다. 다시 만나면 `GIT_TRACE=1 GIT_CURL_VERBOSE=1 git push`로 실제 요청 URL과 응답을 먼저 찍을 것.
  - 확실한 것: **`git push`가 성공했다고 레포가 GitHub에 존재한다는 뜻은 아니었다.**
- **해결**: 새 레포를 만들고 remote를 갈아끼움
  ```sh
  gh repo create rpg-taikoon --public --description "..."
  git remote set-url origin https://github.com/minkyu-k530/rpg-taikoon.git
  git push -u origin main
  ```
- **교훈**: `gh`는 404인데 `git`은 되면 권한이 아니라 **경로(계정명/레포명) 문제**를 먼저 의심한다. `gh api users/<owner>`를 찍으면 1초 만에 갈린다. 계정이 404면 레포도 없는 것이다.

---

<!-- 여기서부터 항목 추가 -->
