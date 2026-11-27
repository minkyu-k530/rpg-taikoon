import { useState } from 'react';
import { audio } from '../game/audio';
import { Coach } from './Coach';
import { Cutscene } from './Cutscene';
import { Ending } from './Ending';
import { CONFIG, upgradeCost, type UpgradeKind } from '../game/config';
import type { DeliveryOffer, DeliveryResult } from '../game/sim';
import { favorStage, FAVOR_STAGES, REGULARS, unlockedLines } from '../game/residents';
import { WEATHER } from '../game/weather';
import { sim, useSnapshot } from '../game/useSim';
import { pickHint, type Hint } from '../game/tutorial';

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

export function HUD() {
  const snap = useSnapshot();
  const [bookOpen, setBookOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flipA, flipB] = CONFIG.bake.flipWindow;

  const known = REGULARS.filter((r) => (snap.visits[r.id] ?? 0) >= FAVOR_STAGES[1].visits).length;
  const settlement = !snap.open && !!snap.report && !snap.choosingEnding && !snap.ending;
  const hint = pickHint({
    open: snap.open,
    inScene: !!snap.scene,
    delivering: snap.delivering,
    deliveryResult: !!snap.deliveryResult,
    ending: snap.choosingEnding || !!snap.ending,
    overlayOpen: bookOpen || settingsOpen,
    settlement,
    anyMoldInWindow: snap.molds.some((m) => m.baking && !m.flipped && m.t >= flipA && m.t < flipB),
    timeLeftRatio: snap.timeLeft / CONFIG.dayLength,
    knownRegulars: known,
    hasOffer: !!snap.deliveryOffer,
  }, snap.seenHints);
  const guidedMold = hint?.id === 'flip'
    ? snap.molds.findIndex((m) => m.baking && !m.flipped && m.t >= flipA && m.t < flipB)
    : -1;

  return (
    <>
      <div className="hud-top">
        <div className="chip">
          <span className="chip-label">{snap.day}일차</span>
          <span className={`chip-time ${hint?.id === 'clock' ? 'coach-target' : ''}`}>{Math.ceil(snap.timeLeft)}초</span>
          <span className="chip-weather">{WEATHER[snap.weather].label}</span>
          {snap.nightsLeft !== null && <span className="chip-nights">남은 밤 {snap.nightsLeft}</span>}
        </div>
        <div className="chip money">{won(snap.money)}</div>
        <button className="chip icon-btn" onClick={() => setSettingsOpen(true)}>
          설정
        </button>
        <button className={`chip book-btn ${hint?.id === 'book' ? 'coach-target' : ''}`} onClick={() => { if (known > 0) sim.markHint('book'); setBookOpen(true); }}>
          단골 {known}/{REGULARS.length}
        </button>
      </div>

      <div className="hud-sub">
        {snap.chapter.no}장 {snap.chapter.title} · 진열 {snap.tray}/{snap.trayCap} · 줄 {snap.queue}명 · 거리{' '}
        {snap.crowd}명{snap.upg.tteok > 0 && ` · 떡볶이 ${snap.tteokServings}그릇`}
      </div>

      <div className="hud-bottom">
        <div className="molds">
          {snap.molds.map((m, i) => {
            const inWindow = m.baking && !m.flipped && m.t >= flipA && m.t < flipB;
            const progress = m.baking ? Math.min(1, m.t / CONFIG.bake.time) : 0;
            return (
              <button
                key={i}
                className={`mold ${inWindow ? 'ready' : ''} ${m.burnt ? 'burnt' : ''} ${i === guidedMold ? 'coach-target' : ''}`}
                onClick={() => { if (sim.flip(i)) sim.markHint('flip'); }}
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

      {snap.deliveryOffer && !snap.deliveryResult && <DeliveryOfferCard offer={snap.deliveryOffer} highlighted={hint?.id === 'delivery'} />}
      {snap.deliveryResult && <DeliveryResultPanel result={snap.deliveryResult} />}
      {snap.scene && !snap.deliveryResult && <Cutscene scene={snap.scene} />}
      {bookOpen && <Book onClose={() => setBookOpen(false)} />}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} hintsEnabled={!snap.seenHints.off} />}
      {(snap.choosingEnding || snap.ending) && <Ending />}
      {settlement && <Settlement upgradeHint={hint?.id === 'upgrade' ? hint : null} />}
      <Coach hint={hint?.id === 'upgrade' ? null : hint} />
    </>
  );
}

/**
 * 손님의 배달 부탁.
 * 화면을 막지 않는다 — 그냥 두면 사라지고, 그래도 아무 일도 일어나지 않는다.
 */
function DeliveryOfferCard({ offer, highlighted }: { offer: DeliveryOffer; highlighted: boolean }) {
  const blocked = !sim.canDeliver();
  return (
    <div className={`offer ${offer.special ? 'special' : ''} ${highlighted ? 'coach-target' : ''}`}>
      <span className="offer-who">{offer.clientName}</span>
      <p className="offer-line">“{offer.line}”</p>
      <div className="offer-actions">
        <button className="offer-no" onClick={() => { sim.declineDelivery(); sim.markHint('delivery'); }}>
          다음에요
        </button>
        <button className="offer-yes" disabled={blocked} onClick={() => { if (sim.acceptDelivery()) sim.markHint('delivery'); }}>
          {blocked ? '진열대가 비었다' : '갖다드리겠습니다'}
        </button>
      </div>
      <span className="offer-timer" style={{ width: `${(offer.expires / 32) * 100}%` }} />
    </div>
  );
}

/** 배달에서 돌아온 직후. 가게 화면 위에 뜬다 */
function DeliveryResultPanel({ result }: { result: DeliveryResult }) {
  return (
    <div className="overlay ending">
      <div className="sheet">
        <h2>도착</h2>
        <table className="report">
          <tbody>
            <tr>
              <td>들고 나간 것</td>
              <td>{result.carried}개</td>
            </tr>
            <tr>
              <td>무사히 전한 것</td>
              <td>{result.delivered}개</td>
            </tr>
            {result.lost > 0 && (
              <tr className="muted">
                <td>길에서 잃은 것</td>
                <td>{result.lost}개</td>
              </tr>
            )}
            {result.bestCombo > 0 && (
              <tr className="muted">
                <td>연속 회피 {result.bestCombo}</td>
                <td>+{won(result.bonus)}</td>
              </tr>
            )}
            <tr className="sum">
              <td>받은 돈</td>
              <td>{won(result.revenue)}</td>
            </tr>
          </tbody>
        </table>
        <p className="forecast">
          {result.delivered === result.carried
            ? '하나도 안 흘렸다.'
            : result.delivered === 0
              ? '빈손으로 도착했다. 그래도 와 줘서 고맙다고 했다.'
              : '그래도 따뜻할 때 도착했다.'}
        </p>
        <button className="primary" onClick={() => sim.closeDeliveryResult()}>
          가게로 돌아가기
        </button>
      </div>
    </div>
  );
}

/** 설정. 소리, 처음 안내, 저장 초기화 */
function Settings({ onClose, hintsEnabled }: { onClose: () => void; hintsEnabled: boolean }) {
  const [muted, setMuted] = useState(audio.muted);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>설정</h2>
        <div className="upgrades">
          <button
            className="upgrade"
            onClick={() => {
              audio.start();
              audio.setMuted(!muted);
              setMuted(!muted);
            }}
          >
            <span className="u-name">소리</span>
            <span className="u-desc">물소리, 기름 끓는 소리, 눈 오는 날의 먹먹함</span>
            <span className="u-cost">{muted ? '꺼짐' : '켜짐'}</span>
          </button>
          <button className="upgrade" onClick={() => sim.setHintsEnabled(!hintsEnabled)}>
            <span className="u-name">처음 안내</span>
            <span className="u-desc">기능을 처음 만날 때 한 번씩 알려 준다</span>
            <span className="u-cost">{hintsEnabled ? '켜짐' : '꺼짐'}</span>
          </button>
        </div>

        <h3>처음부터 다시</h3>
        {confirming ? (
          <div className="upgrades">
            <button
              className="upgrade danger"
              onClick={() => {
                sim.resetProgress();
                onClose();
              }}
            >
              <span className="u-name">정말 지운다</span>
              <span className="u-desc">날짜·돈·설비·단골 기록이 모두 사라진다</span>
            </button>
            <button className="upgrade" onClick={() => setConfirming(false)}>
              <span className="u-name">그만두기</span>
            </button>
          </div>
        ) : (
          <div className="upgrades">
            <button className="upgrade" onClick={() => setConfirming(true)}>
              <span className="u-name">저장 지우기</span>
              <span className="u-desc">1일차부터 다시 시작한다</span>
            </button>
          </div>
        )}

        <button className="primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
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

function Settlement({ upgradeHint }: { upgradeHint: Hint | null }) {
  const snap = useSnapshot(6);
  const r = snap.report!;
  const kinds: UpgradeKind[] = ['mold', 'sign', 'heater', 'oden', 'tteok', 'helper'];

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

        <Coach hint={upgradeHint} />
        <h3 className={upgradeHint ? 'coach-target' : ''}>가게 키우기</h3>
        <div className="upgrades">
          {kinds.map((k) => {
            const u = CONFIG.upgrades[k];
            const level = snap.upg[k];
            const maxed = level >= u.max;
            const cost = upgradeCost(k, level);
            // 아직 이야기에서 떠올리지 않은 물건은 못 산다. 숨기지 않고 언제 열리는지 적는다
            const locked = r.day < u.unlockDay;
            const afford = !locked && !maxed && snap.money >= cost;
            return (
              <button key={k} className="upgrade" disabled={!afford} onClick={() => { if (sim.buy(k)) sim.markHint('upgrade'); }}>
                <span className="u-name">
                  {u.label} {u.max > 1 && `Lv.${level}`}
                </span>
                <span className="u-desc">{locked ? `${u.unlockDay}일차에 생각난다` : u.desc}</span>
                <span className="u-cost">{locked ? '—' : maxed ? '최대' : won(cost)}</span>
              </button>
            );
          })}
        </div>

        {snap.isFinalDay ? (
          <>
            <p className="forecast">내일은 없다. 2월 말, 이 자리는 없어진다.</p>
            <button
              className="primary"
              onClick={() => {
                sim.choosingEnding = true;
              }}
            >
              마지막 밤
            </button>
          </>
        ) : (
          <>
            <p className="forecast">
              내일은 <strong>{WEATHER[r.tomorrow].label}</strong> — {WEATHER[r.tomorrow].note}
            </p>
            <button className="primary" onClick={() => sim.nextDay()}>
              다음 날 시작
            </button>
          </>
        )}
      </div>
    </div>
  );
}
