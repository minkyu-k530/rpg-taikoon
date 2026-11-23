import { CONFIG, upgradeCost, type UpgradeKind } from '../game/config';
import { sim, useSnapshot } from '../game/useSim';

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

export function HUD() {
  const snap = useSnapshot();
  const [flipA, flipB] = CONFIG.bake.flipWindow;

  return (
    <>
      <div className="hud-top">
        <div className="chip">
          <span className="chip-label">{snap.day}일차</span>
          <span className="chip-time">{Math.ceil(snap.timeLeft)}초</span>
        </div>
        <div className="chip money">{won(snap.money)}</div>
        <div className="chip small">
          진열 {snap.tray}/{snap.trayCap} · 줄 {snap.queue}명 · 거리 {snap.crowd}명
        </div>
      </div>

      <div className="hud-bottom">
        <div className="molds">
          {snap.molds.map((m, i) => {
            const inWindow = m.baking && !m.flipped && m.t >= flipA && m.t < flipB;
            const progress = m.baking ? Math.min(1, m.t / CONFIG.bake.time) : 0;
            return (
              <button
                key={i}
                className={`mold ${inWindow ? 'ready' : ''} ${m.burnt ? 'burnt' : ''}`}
                onClick={() => sim.flip(i)}
              >
                <span className="mold-fill" style={{ height: `${progress * 100}%` }} />
                <span className="mold-text">
                  {!m.baking ? '대기' : inWindow ? '뒤집기' : m.flipped ? '굽는 중' : m.burnt ? '바삭' : '굽는 중'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint">노랗게 깜빡일 때 누르면 제값에 팔린다. 놓쳐도 바삭한 붕어빵으로 팔린다.</p>
      </div>

      {!snap.open && snap.report && <Settlement />}
    </>
  );
}

function Settlement() {
  const snap = useSnapshot(6);
  const r = snap.report!;
  const kinds: UpgradeKind[] = ['mold', 'sign', 'heater', 'oden'];

  return (
    <div className="overlay">
      <div className="sheet">
        <h2>{r.day}일차 마감</h2>
        <table className="report">
          <tbody>
            <tr>
              <td>손님</td>
              <td>{r.customers}명</td>
            </tr>
            <tr>
              <td>판매</td>
              <td>{r.sold}개</td>
            </tr>
            <tr>
              <td>매출</td>
              <td>{won(r.revenue)}</td>
            </tr>
            <tr>
              <td>재료비</td>
              <td className="neg">-{won(r.cost)}</td>
            </tr>
            <tr className="sum">
              <td>순이익</td>
              <td>{won(r.profit)}</td>
            </tr>
            {r.missed > 0 && (
              <tr className="muted">
                <td>못 판 손님</td>
                <td>{r.missed}명</td>
              </tr>
            )}
          </tbody>
        </table>

        <h3>가게 키우기</h3>
        <div className="upgrades">
          {kinds.map((k) => {
            const u = CONFIG.upgrades[k];
            const level = snap.upg[k];
            const maxed = level >= u.max;
            const cost = upgradeCost(k, level);
            const afford = !maxed && snap.money >= cost;
            return (
              <button key={k} className="upgrade" disabled={!afford} onClick={() => sim.buy(k)}>
                <span className="u-name">
                  {u.label} {u.max > 1 && `Lv.${level}`}
                </span>
                <span className="u-desc">{u.desc}</span>
                <span className="u-cost">{maxed ? '최대' : won(cost)}</span>
              </button>
            );
          })}
        </div>

        <button className="primary" onClick={() => sim.nextDay()}>
          다음 날 시작
        </button>
      </div>
    </div>
  );
}
