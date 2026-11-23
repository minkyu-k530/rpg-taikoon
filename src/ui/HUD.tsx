import { useState } from 'react';
import { audio } from '../game/audio';
import { CONFIG, upgradeCost, type UpgradeKind } from '../game/config';
import { favorStage, FAVOR_STAGES, REGULARS, unlockedLines } from '../game/residents';
import { WEATHER } from '../game/weather';
import { sim, useSnapshot } from '../game/useSim';

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

export function HUD() {
  const snap = useSnapshot();
  const [bookOpen, setBookOpen] = useState(false);
  const [muted, setMuted] = useState(audio.muted);
  const [flipA, flipB] = CONFIG.bake.flipWindow;

  const known = REGULARS.filter((r) => (snap.visits[r.id] ?? 0) >= FAVOR_STAGES[1].visits).length;

  return (
    <>
      <div className="hud-top">
        <div className="chip">
          <span className="chip-label">{snap.day}일차</span>
          <span className="chip-time">{Math.ceil(snap.timeLeft)}초</span>
          <span className="chip-weather">{WEATHER[snap.weather].label}</span>
        </div>
        <div className="chip money">{won(snap.money)}</div>
        <button
          className="chip icon-btn"
          onClick={() => {
            audio.start();
            audio.setMuted(!muted);
            setMuted(!muted);
          }}
        >
          {muted ? '소리 꺼짐' : '소리 켜짐'}
        </button>
        <button className="chip book-btn" onClick={() => setBookOpen(true)}>
          단골 {known}/{REGULARS.length}
        </button>
      </div>

      <div className="hud-sub">
        진열 {snap.tray}/{snap.trayCap} · 줄 {snap.queue}명 · 거리 {snap.crowd}명 · {WEATHER[snap.weather].note}
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

      {bookOpen && <Book onClose={() => setBookOpen(false)} />}
      {!snap.open && snap.report && <Settlement />}
    </>
  );
}

/** 단골 도감. 이 게임이 쌓아 가는 것은 돈이 아니라 이 목록이다 */
function Book({ onClose }: { onClose: () => void }) {
  const snap = useSnapshot(4);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>단골</h2>
        <div className="book">
          {REGULARS.map((r) => {
            const visits = snap.visits[r.id] ?? 0;
            const stage = favorStage(visits);
            if (stage === 0) {
              return (
                <div key={r.id} className="card locked">
                  <span className="card-name">???</span>
                  <span className="card-stage">아직 모르는 사람</span>
                </div>
              );
            }
            const lines = unlockedLines(r, visits);
            const next = FAVOR_STAGES[stage + 1];
            return (
              <div key={r.id} className="card">
                <div className="card-head">
                  <span className="card-name">{r.name}</span>
                  <span className="card-stage">{FAVOR_STAGES[stage].label}</span>
                </div>
                <p className="card-blurb">{r.blurb}</p>
                {lines.map((l, i) => (
                  <p key={i} className="card-line">“{l}”</p>
                ))}
                {stage >= 4 && r.episode && <p className="card-episode">{r.episode}</p>}
                <p className="card-progress">
                  {visits}번 다녀감
                  {next && ` · ${next.visits - visits}번 더 오면 ${next.label}`}
                </p>
              </div>
            );
          })}
        </div>
        <button className="primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

function Settlement() {
  const snap = useSnapshot(6);
  const r = snap.report!;
  const kinds: UpgradeKind[] = ['mold', 'sign', 'heater', 'oden', 'helper'];

  return (
    <div className="overlay">
      <div className="sheet">
        <h2>
          {r.day}일차 마감 <span className="h2-sub">{WEATHER[r.weather].label}</span>
        </h2>
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
            {r.shortfall > 0 && (
              <tr className="muted">
                <td>재고가 없어 못 판 개수</td>
                <td>{r.shortfall}개</td>
              </tr>
            )}
            {r.missed > 0 && (
              <tr className="muted">
                <td>그냥 돌아간 손님</td>
                <td>{r.missed}명</td>
              </tr>
            )}
          </tbody>
        </table>

        {r.unlocks.length > 0 && (
          <div className="unlocks">
            {r.unlocks.map((u, i) => (
              <p key={i}>
                <strong>{u.name}</strong> — {u.stageLabel}
              </p>
            ))}
          </div>
        )}

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

        <p className="forecast">
          내일은 <strong>{WEATHER[r.tomorrow].label}</strong> — {WEATHER[r.tomorrow].note}
        </p>
        <button className="primary" onClick={() => sim.nextDay()}>
          다음 날 시작
        </button>
      </div>
    </div>
  );
}
