import { useState } from 'react';
import { ENDING_ORDER, ENDINGS, EPILOGUES, FINAL_LINES } from '../game/endings';
import { favorStage, REGULARS } from '../game/residents';
import { PROTAGONIST } from '../game/story';
import { sim, useSnapshot } from '../game/useSim';

type Phase = 'choice' | 'lines' | 'epilogue' | 'final';

/**
 * 마지막 밤.
 *
 * 선택 → 결말 장면 → 단골들의 그 다음 → 마지막 문장.
 * 에필로그는 **단골(7회) 이상인 사람만** 나온다. 플레이어가 만든 관계만큼만 보인다.
 */
export function Ending() {
  const snap = useSnapshot(4);
  const [phase, setPhase] = useState<Phase>(sim.ending ? 'lines' : 'choice');
  const [index, setIndex] = useState(0);

  const ending = sim.ending ? ENDINGS[sim.ending] : null;

  if (phase === 'choice') {
    return (
      <div className="overlay ending">
        <div className="sheet">
          <h2>마지막 밤</h2>
          <p className="ending-lead">80일이 지났다. 2월 말, 이 자리는 없어진다.</p>
          <div className="upgrades">
            {ENDING_ORDER.map((id) => {
              const e = ENDINGS[id];
              const status = sim.endingStatus(id);
              const seen = snap.endingsSeen[id];
              return (
                <button
                  key={id}
                  className="upgrade"
                  disabled={!status.available}
                  onClick={() => {
                    if (sim.chooseEnding(id)) {
                      setIndex(0);
                      setPhase('lines');
                    }
                  }}
                >
                  <span className="u-name">
                    {e.choice} {seen && <span className="seen-mark">본 결말</span>}
                  </span>
                  <span className="u-desc">{status.reason ?? e.requirement ?? '언제든 고를 수 있다'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'lines' && ending) {
    const line = ending.lines[index];
    const advance = () => {
      if (index + 1 < ending.lines.length) setIndex(index + 1);
      else {
        setIndex(0);
        setPhase('epilogue');
      }
    };
    return (
      <div className="overlay ending ending-lines" onClick={advance}>
        <div className={`ending-box ${line.who === null ? 'narration' : ''}`}>
          {line.who && (
            <span className={`cutscene-who ${line.who === PROTAGONIST ? 'me' : ''}`}>{line.who}</span>
          )}
          <p className="cutscene-text">{line.text}</p>
          <span className="cutscene-next">
            {index + 1} / {ending.lines.length} · 눌러서 계속
          </span>
        </div>
      </div>
    );
  }

  if (phase === 'epilogue') {
    const met = REGULARS.map((r) => ({ r, visits: snap.visits[r.id] ?? 0 })).filter(
      ({ visits }) => favorStage(visits) >= 2,
    );
    return (
      <div className="overlay ending">
        <div className="sheet">
          <h2>그 다음</h2>
          {met.length === 0 ? (
            <p className="ending-lead">아무도 이름을 묻지 않았다. 그래서 전할 소식도 없다.</p>
          ) : (
            <div className="book">
              {met.map(({ r, visits }) => {
                const ep = EPILOGUES[r.id];
                return (
                  <div key={r.id} className="card">
                    <div className="card-head">
                      <span className="card-name">{r.name}</span>
                      <span className="card-stage">{visits}번</span>
                    </div>
                    <p className="card-line">{ep.known}</p>
                    {favorStage(visits) >= 4 && <p className="card-episode">{ep.close}</p>}
                  </div>
                );
              })}
            </div>
          )}
          <button className="primary" onClick={() => setPhase('final')}>
            계속
          </button>
        </div>
      </div>
    );
  }

  const knownAll = REGULARS.every((r) => favorStage(snap.visits[r.id] ?? 0) >= 2);
  const lines = knownAll ? FINAL_LINES : FINAL_LINES.slice(0, 1);
  return (
    <div className="overlay ending ending-final">
      <div className="ending-final-box">
        {lines.map((l, i) => (
          <p key={i} className={l.who === null ? 'final-title' : 'final-line'}>
            {l.text}
          </p>
        ))}
        <p className="final-stat">
          {sim.day}일 · 누적 순이익 {Math.round(sim.totalProfit).toLocaleString('ko-KR')}원 ·{' '}
          {ENDINGS[sim.ending!].title}
        </p>
        <button className="primary" onClick={() => sim.newRun()}>
          다시 시작
        </button>
        <p className="final-hint">
          본 결말 {Object.keys(snap.endingsSeen).length} / {ENDING_ORDER.length} · 기록과 단골은 그대로 남는다
        </p>
      </div>
    </div>
  );
}
