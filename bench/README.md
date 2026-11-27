# 엔진 검증 벤치

`npm install` 뒤 `npm run dev`를 실행하고 `http://localhost:5180/bench.html?n=20&v=3000&shadows=1&scene=1&sec=10`을 연다.

| 파라미터 | 뜻 | 기본값 |
|---|---|---|
| `n` | 스킨드 캐릭터 수 | 20 |
| `v` | 캐릭터당 목표 정점 수 (최소 675) | 3000 |
| `shadows` | 그림자 사용 (`0`/`1`) | 1 |
| `scene` | 실제 게임 장면 사용 (`0`/`1`) | 1 |
| `sec` | 워밍업 3초 뒤 측정할 시간 | 10 |

결과는 화면 좌상단 표와 `window.__benchResult`에 나온다. `averageWorkMs`와 `p95WorkMs`는 캐릭터 애니메이션 갱신부터 렌더 호출 완료까지의 CPU 작업 시간이고, `visibleCharacters`는 마지막 프레임의 프러스텀 안 캐릭터 수다. 폰은 맥과 같은 Wi-Fi에 연결한 뒤 `http://<맥 IP>:5180/bench.html`을 연다.
