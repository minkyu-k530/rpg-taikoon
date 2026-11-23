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

## TS-002. 브라우저에 전혀 다른 게임이 떴다 — 포트 5173 충돌

- **환경**: 2026-11-23, Vite 개발 서버 첫 스모크 테스트
- **증상**: `http://localhost:5173`을 열었더니 내 게임이 아니라 **"판교에서 살아남기"라는 다른 프로젝트의 낮 시간 광장 화면**이 떴다. 콘솔에는 내 `src/App.tsx`에 대한 `net::ERR_ABORTED`가 찍혔다.
- **원인**: 같은 머신에서 다른 프로젝트의 Vite가 이미 5173을 쓰고 있었다. 두 프로세스가 각각 `*:5173`(IPv6 와일드카드)과 `[::1]:5173`에 바인딩되어 **둘 다 LISTEN에 성공했고**, `localhost`는 `::1`을 먼저 고르면서 다른 쪽이 응답했다.
  ```sh
  $ lsof -nP -iTCP:5173 -sTCP:LISTEN
  node 3537 ... TCP *:5173 (LISTEN)        # 내 서버
  node 4353 ... TCP [::1]:5173 (LISTEN)    # 다른 프로젝트
  ```
- **해결**: 포트를 분리하고 `strictPort`로 조용한 폴백을 막았다
  ```ts
  // vite.config.ts
  server: { host: true, port: 5180, strictPort: true }
  ```
- **교훈**: Vite는 포트가 막히면 조용히 다음 포트로 넘어가고, IPv4/IPv6 바인딩이 다르면 충돌조차 안 난다. **개발 서버는 프로젝트마다 포트를 고정하고 `strictPort: true`를 켠다.** 화면이 이상하면 먼저 `document.title`을 확인한다 — 내 앱인지 1초 만에 갈린다.

---

## TS-003. 건너편 빌딩 창문 불빛이 하나도 안 보임 (InstancedMesh)

- **환경**: `src/scene/Environment.tsx`의 `FarBuildings`. 창문 수백 개를 `InstancedMesh`로 그림
- **증상**: 빌딩 덩어리는 보이는데 창문이 **전부** 안 보였다. 에러도 경고도 없음
- **원인**: 두 가지가 겹쳤다
  1. `InstancedMesh`의 프러스텀 컬링은 **원점 기준 지오메트리 바운딩**으로 계산된다. 인스턴스를 멀리 배치해도 바운딩은 원점의 작은 평면 그대로라, 카메라 앞에 없다고 판단해 **통째로 컬링**됐다
  2. 컬링을 꺼도 안 보였다. `planeGeometry`는 +Z를 향하는데 창문을 건물의 -Z 면에 붙였으므로 **뒷면이 카메라를 향했고**, `MeshBasicMaterial`의 기본 `side: FrontSide`가 그걸 버렸다
- **해결**
  ```tsx
  <instancedMesh frustumCulled={false} ...>
    <meshBasicMaterial side={THREE.DoubleSide} ... />
  ```
- **교훈**: 인스턴싱한 게 통째로 사라지면 **컬링을 먼저 의심**한다(`frustumCulled={false}`로 1초 검증). 그래도 안 보이면 면의 방향. "아무 에러도 없는데 안 보인다"는 거의 항상 이 둘 중 하나다.

---

## TS-004. 손님이 줄만 서고 아무도 사지 않음

- **환경**: `src/game/sim.ts`, 주민 상태머신
- **증상**: 포장마차 앞에 3명이 서 있는데 `stats.customers`가 0에서 올라가지 않았다. 진열대에는 재고가 있었다
- **원인**: 손님끼리 겹치지 않게 넣은 **분리력(separation)** 이 줄 서기를 방해했다. 줄 간격은 0.85m인데 분리 반경이 0.9m라, 줄 선 사람끼리 영구히 서로를 밀어냈다. 맨 앞 손님이 카운터 도착 판정(`거리 < 0.4`)에 **한 번도 들어가지 못하고** 제자리에서 진동했다
- **해결**: 줄 서는 동안은 분리력을 거의 끄고, 도착 판정을 넓혔다
  ```ts
  const lining = v.phase === 'queue' || v.phase === 'serve';
  const sepForce = lining ? 0.12 : 0.85;
  ```
- **교훈**: 군중 AI에서 **"자연스럽게 흩어지는 힘"과 "정확한 위치에 서는 요구"는 직접 충돌한다.** 줄서기·착석처럼 정렬이 필요한 상태에서는 분리력을 꺼야 한다. 그리고 이런 교착은 예외를 던지지 않으므로, 상태별 인원수(`phases`)를 찍어 보는 디버그 핸들이 없으면 못 찾는다.

---

<!-- 여기서부터 항목 추가 -->
