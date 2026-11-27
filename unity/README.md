# 운중천 분식 Unity 프로젝트

Unity **6000.3.29f1**, URP 17.3.0 프로젝트다(6000.3.1f1에서 같은 6000.3 안의 패치로 올렸다. WebGL 빌드 지원 모듈이 29f1에만 설치돼 있다). 공개 주소: https://minkyu-k530.github.io/rpg-taikoon/

`Packages/manifest.json`은 URP, Input System, uGUI(TextMeshPro 포함분), 테스트 프레임워크와 필요한 내장 모듈을 지정한다.

## 구조

| 경로 | 내용 |
|---|---|
| `Assets/Scripts/Core` | 엔진 참조 없는 게임 규칙 (`noEngineReferences`) |
| `Assets/Scripts/Game` | `Unjungcheon.Game` — 입력 추상화(`IGameInput`), 사장님 이동, 카메라(3인칭/1인칭), 상호작용, HUD, `GameRunner`(Core 소유) |
| `Assets/Scripts/Editor` | `Unjungcheon.EditorTools` — `ProjectSetup`(URP·후처리·입력 설정), `CampusSpec`(치수), `SceneBuilder`(1번 공간 생성), `ScreenshotCapture`, `SceneLayoutDump`, `WebGLBuild`, `Pipeline` |
| `Assets/Shaders/SignText.shader` | 간판 글자용 언릿 셰이더 (깊이 검사 포함) |
| `Assets/Tests/PlayMode` | 생성된 씬을 불러와 이동, 도로 건너가기 금지, 시점 전환, 카운터·호객 → Core 연결을 검사 |
| `Assets/Generated`, `Assets/Scenes` | 생성기가 만든 재질·URP 에셋·씬. 손으로 고치지 않는다 |
| `Game.Build` | 설치된 Unity 어셈블리로 라이선스 없이 하는 컴파일 검사 |
| `tools/build-scene.sh` | 씬 생성 → 스크린샷 3장 → PlayMode 테스트를 한 번에 실행 |
| `tools/build-webgl.sh` | WebGL 빌드 → `Build/WebGL` |
| `tools/deploy-pages.sh` | `Build/WebGL`을 `gh-pages` 브랜치 루트로 올린다 |

`.meta` 파일과 `ProjectSettings/*`는 Unity가 만들며 커밋한다(GUID 안정성). `Library`, `Temp`, `Logs`, `UserSettings`, `Build`, 루트의 자동 생성 `*.csproj`·`*.sln`은 `.gitignore`로 막는다.

## 실행: 씬 생성 · 스크린샷 · PlayMode 테스트

```sh
sh unity/tools/build-scene.sh
```

1. Unity 일괄 모드로 프로젝트를 열고 `Unjungcheon.EditorTools.Pipeline.BuildAll`을 실행한다. `ProjectSetup` → `SceneBuilder` → `ScreenshotCapture` → `SceneLayoutDump` 순서다. 렌더링이 필요하므로 `-nographics`를 쓰지 않는다
2. `-runTests -testPlatform PlayMode`로 테스트를 돌린다

출력:
- 씬: `Assets/Scenes/Location1_Skala.unity` (빌드 설정에도 등록)
- PNG 1920x1080: `Build/Screenshots/third-person.png`, `first-person.png`, `campus-front.png`
- 로그: `Build/Logs/build-scene.log`, `Build/Logs/playmode.log`, 결과 XML `Build/Logs/playmode-results.xml`
- 배치 요약: `Build/Logs/scene-layout.txt`

종료 코드: 0 성공, 1 실행 실패 또는 배치 요약이 기준과 다름, 2 Unity 라이선스 없음(라이선스 파일이 없거나 로그에 라이선스 실패가 있으면 "Unity 라이선스 없음"을 출력), 3 PlayMode 테스트 실패. 다른 에디터는 `UNITY_EDITOR` 환경 변수로 지정한다.

**결정성:** 생성기는 난수를 쓰지 않는다. 다만 Unity는 씬 파일의 로컬 fileID를 실행마다 새로 매기므로 `.unity` 파일은 바이트 단위로 같지 않다. 그래서 계층 경로·위치·회전·크기·컴포넌트·재질을 정규화한 `scene-layout.txt`를 남기고, 기준 파일 `Build/Logs/scene-layout.baseline.txt`와 비교한다.

- 같으면 "Layout: 기준과 같음"을 출력하고 계속한다
- 다르면 차이 앞부분을 보여 주고 **종료 코드 1**로 멈춘다. 생성기가 결정적이지 않거나 씬이 의도치 않게 바뀐 것이다
- 기준이 없으면(처음 실행) 이번 결과를 기준으로 저장한다
- `SceneBuilder`·`CampusSpec`을 일부러 바꿨다면 한 번 `sh unity/tools/build-scene.sh --update-layout`으로 실행해 새 기준을 저장한다. 그 뒤 옵션 없이 다시 실행해 "기준과 같음"을 확인한다

## WebGL 빌드와 GitHub Pages 배포

```sh
sh unity/tools/build-webgl.sh     # Build/WebGL 생성, 가장 큰 파일 크기 출력
(cd unity/Build/WebGL && python3 -m http.server 8090)   # 로컬 확인: http://localhost:8090/
sh unity/tools/deploy-pages.sh    # gh-pages 브랜치로 푸시 (공개 주소에 반영)
```

- 진입점은 `Unjungcheon.EditorTools.Pipeline.BuildWebGL`이다(`-buildTarget WebGL`). 씬이 없으면 먼저 만든다
- 압축은 Gzip + **Decompression Fallback**이다. GitHub Pages는 `.gz` 파일에 `Content-Encoding` 헤더를 주지 않으므로 브라우저 JS가 압축을 푼다. 그래서 `http.server`처럼 특수 헤더 없는 서버에서도 열린다
- 기본 해상도 1600x900, 기본 로딩 템플릿을 쓰고 빌드 후 `index.html`에 스타일을 넣어 캔버스를 창 크기에 맞춘다. 출력 폴더에 `.nojekyll`을 만든다
- 파일 하나가 100MB(Pages 제한)를 넘으면 빌드를 실패로 처리한다
- `deploy-pages.sh`는 임시 git worktree에서 `Build/WebGL` 내용을 커밋해 `origin gh-pages`로 푸시한다. 브랜치가 없으면 orphan으로 만든다. 작성자는 저장소 git config 그대로다. 저장소 설정에서 Pages 소스를 `gh-pages` 브랜치 루트로 지정해야 한다
- 저장 기능(Core `SaveData` → PlayerPrefs)은 아직 런타임에 저장 연결이 없어 이번 빌드에 넣지 않았다

## 설정 결정

- **입력 처리 `activeInputHandler: 2`(Both).** Input System을 기본 경로로 쓰고 레거시 Input Manager도 켜 둔다. uGUI 기본 입력 모듈처럼 레거시 API를 부르는 코드가 예외 없이 돌고, `IGameInput`의 두 구현이 실제 프로젝트에서도 함께 컴파일된다. `GameInputFactory`는 Input System 구현을 고른다. `ProjectSetup`이 같은 값을 다시 보장한다
- **색 공간 Linear, URP Forward+.** 가로등·창 조명이 많아 물체당 조명 수 제한이 없는 Forward+를 쓴다. 후처리는 ACES 톤매핑, 블룸, 비네팅이다
- **글꼴:** 간판과 HUD는 `Assets/Fonts/Pretendard-Bold.otf`(SIL OFL 1.1, `Assets/Fonts/OFL.txt`)를 쓴다. 내장 글꼴은 WebGL에서 한글을 그리지 못한다
- **로고·간판:** 텍스처 이미지 없이 내장 글꼴 글자와 기본 도형(날개)으로 만든다. 내장 글꼴 셰이더는 깊이 검사를 하지 않아 물체 뒤 글자가 비쳐 보이므로 `SignText.shader`를 쓴다

## 라이선스 없이 하는 컴파일 검사

```sh
dotnet build unity/Core.Build -warnaserror
dotnet test unity/Core.Tests
dotnet build unity/Game.Build -warnaserror                       # Game, ENABLE_INPUT_SYSTEM
dotnet build unity/Game.Build -warnaserror -p:InputMode=Legacy   # Game, ENABLE_LEGACY_INPUT_MANAGER
dotnet build unity/Game.Build -warnaserror -p:BuildEditor=true   # Game + Editor (UnityEditor.dll)
```

`UnityRoot`와 `UnityTemplateAssemblies` MSBuild 속성으로 설치 경로를 바꿀 수 있다. 후자는 Unity 설치 안 3D 템플릿의 미리 컴파일된 패키지 어셈블리(Input System, uGUI, URP 17.0.14)다. 검사에서 빠지는 것: `Assets/Tests/PlayMode/LocationTests.cs`(NUnit·Unity 테스트 러너 필요, Unity에서 실행), `Assets/Shaders/SignText.shader`(셰이더). 패키지 어셈블리 버전이 프로젝트(URP 17.3.0)와 달라 API 차이는 Unity 실행으로 확인한다.

## 1번 공간 배치 (`CampusSpec`)

좌표: X = 도로 방향(오른쪽 +), Z = 캠퍼스 방향(+), 원점은 도로 중앙선. 사진 기반 추정치이며 `CampusSpec`만 고친다.

| 요소 | 치수 | X 범위 | Z 범위 |
|---|---|---|---|
| 이쪽 보도 (붉은 벽돌) | 폭 5m, 경계석 0.25m | 전체 | -9 ~ -4 |
| 도로 (2차선, 노란 중앙선 두 줄) | 폭 8m | 전체 | -4 ~ 4 |
| 횡단보도 | 폭 4m | 16 ~ 20 | -4 ~ 4 |
| 건너편 보도 | 폭 3m | 전체 | 4 ~ 7 |
| 정문 광장 (화강석) | | -60 ~ 60 | 7 ~ 32 |
| 회양목 화단 + 소나무 5그루 | | -25 ~ -7 | 8.5 ~ 19 |
| 주차 차단기 부스 | 2.4m | 36 | 12 |
| 본관 | 45 × 22m, 12층 × 4m + 루버 2m | -16.5 ~ 28.5 | 32 ~ 54 |
| └ 금속 패널(왼쪽 1/4) + SK 로고 | 11.25m, 1~8층 | -16.5 ~ -5.25 | 정면 |
| └ 세로 창 12칸 + 필라스터 | 2~8층 | -5.25 ~ 28.5 | 정면 |
| └ 파란 커튼월 띠 | 9~12층 | 전체 폭 | |
| └ 정문(유리, 캐노피 3m, 로고) | 폭 12m, 2m 들어감 | -4.25 ~ 7.75 | |
| └ SKALA 교육장 (`SkalaFloor = 4`) | 4층 창 12칸 전부 밝고 균일하게 켜짐, 정문 오른쪽 안내판 "SKALA 교육장 4F" | 안내판 10.15 | 29.4 |
| 별관 (본관 왼쪽 뒤) | 70 × 25m, 8층 × 4m | -96 ~ -26 | 46 ~ 71 |
| 포장마차 (정면이 캠퍼스) | 3.2 × 1.5m | 2.4 ~ 5.6 | -7.65 ~ -6.15 |
| 사장님 시작 (포장마차 안쪽) | | 4 | -8.35 |
| 사장님 이동 영역 | | -40 ~ 40 | -8.72 ~ -4.53 |

```text
 Z
 71 ┌──────── 별관 ────────┐
 54 │ X -96 ~ -26          │   ┌──── 본관 ────┐
 46 └──────────────────────┘   │ X -16.5~28.5 │      [이웃 오피스 X 50~80]
 32                            └금속┴ 정문 ┴[4F 안내판]┘   (4층 창 띠 = SKALA 교육장)
 19        [화단·소나무 X -25~-7]
 12                                              [부스 X 36]
  7 ─────────────── 건너편 보도 ───────────────────────────
  4 ═══════════════ 도로 2차선 ═══════ [횡단보도 X 16~20] ═══
 -4 ─ 경계석 ─ 벚나무·가로등 ───────────────────────────────
 -6.15            [호객 X 0.8]  [포장마차 X 2.4~5.6]
 -8.35                           사장님 X 4 (카운터·붕어빵 틀)
 -9 ─ 화단 울타리 ─────────────────────────────────────────
     X -40 ……………………………… 0 …… 4 ………… 18 …………… 40
```

### 조작

WASD/방향키로 걷고(2.2m/s) Shift로 달린다(3.4m/s). V로 3인칭 경영 뷰와 1인칭 사장 시점(눈높이 1.6m, 마우스 시선, 상하 ±70°)을 바꾼다. 1인칭에서는 몸을 숨기고 시선 방향 기준으로 걷는다. E/Space로 가까운 지점을 쓴다: 카운터 → `ServeNow`, 호객 → `Hawk`, 붕어빵 틀은 자리 표시다(홀드 조리는 U3). HUD는 날짜, 남은 시간, 돈, 상호작용 안내를 값이 바뀔 때만 다시 쓴다.

---

## Core

`Assets/Scripts/Core`는 Unity 엔진 참조가 없는 게임 규칙 층이다. `Core.asmdef`의 `noEngineReferences`가 이를 고정한다. Unity 6 프로젝트에 이 폴더를 그대로 넣고, 런타임에서 `Simulation`을 소유해 `Tick(dt)`와 직접 행동 API를 호출한다. `OnEvent`는 화면 효과와 소리 연결점이다.

## 검증

```sh
dotnet build unity/Core.Build -warnaserror
dotnet test unity/Core.Tests --logger 'console;verbosity=detailed'
```

`Core.Build`는 Unity 6 호환용 C# 9와 .NET Standard 2.1로 같은 Core 소스를 컴파일한다. `Core.Tests`에는 규칙 테스트와 20시드 봇 테스트가 있다. Unity 에디터나 라이선스 없이 실행할 수 있다.

## 사용 흐름

```csharp
var sim = new Unjungcheon.Core.Simulation(new Unjungcheon.Core.SeedRandom(42));
sim.OnEvent += e => { /* 화면과 소리 처리 */ };
sim.Tick(0.1);
var save = sim.Snapshot();
sim.Restore(save);
```

하루가 끝나면 `Report`로 매출·원가·순이익을 읽고 `NextDay()`를 호출한다. 2번 장소는 누적 순이익과 단골 조건을 충족하면 열린다. `SetActiveLocation`은 영업 전 또는 마감 후에 호출한다. 비활성 장소의 자동 영업 수익은 마감 리포트에 합산된다. 하루 중 장소 전환은 다음 날 경계에서 적용하도록 제한했다.

붕어빵 직접 조리는 틀마다 `HoldStart(index)`와 `HoldEnd(index)`를 아래 반죽·팥·위 반죽 순서로 호출하고 `TakeOut(index)`로 마친다. 홀드 시간은 `Balance.FishHoldRate`로 양이 된다. 자동 조리는 틀을 비워 두면 진행된다. 타코야끼는 `PourStart`, `PourEnd`, `AddOctopus`, `Roll` 두 번, `Sauce` 순서다. 재고와 품질 점수는 `FishTray` 및 스테이션 상태에서 읽는다.

`SaveData`는 Unity `JsonUtility`용 공개 필드로 구성된다. 진행 중인 손님, 조리, 난수 상태, 하루 시작 상태도 저장한다. 저장 파일의 버전 호환은 이번 단계의 범위에 없다. 오프라인 수익의 시간당 기준은 마감 시 같은 상태의 방치 영업을 재현해 갱신하며, 현실 4시간을 게임 하루로 본다. `OfflineEarnings`는 최대 8시간을 지급하고 설정한 저축 비율을 집 통장에 넣는다.

집 통장은 기본 30% 저축이며 `SetSavingsRate(0..1)`로 바꾼다. 목표와 해금 수치, 가격, 날씨, 시간은 `Balance.cs`에 있다. Unity 씬·UI·입력은 다음 단계에서 연결한다.
