# 운중천 분식 Core

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
