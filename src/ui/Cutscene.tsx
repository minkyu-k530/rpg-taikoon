import { useEffect, useState } from 'react';
import { PROTAGONIST, type Scene } from '../game/story';
import { sim } from '../game/useSim';

/**
 * 컷신.
 *
 * STORY.md 7장의 규칙 둘을 코드로 지킨다.
 * 1. 건너뛸 수 있다 — 오른쪽 위 버튼
 * 2. 가게는 계속 돌아간다 — 화면 전체를 막지 않고 아래쪽 띠만 덮는다.
 *    뒤에서 주민은 계속 걷고 붕어빵은 계속 익는다
 */
export function Cutscene({ scene }: { scene: Scene }) {
  const [index, setIndex] = useState(0);
  const [cardShown, setCardShown] = useState(!scene.chapterCard);

  // 장이 바뀌면 제목 카드를 먼저 2.6초 띄운다
  useEffect(() => {
    setIndex(0);
    setCardShown(!scene.chapterCard);
    if (!scene.chapterCard) return;
    const id = setTimeout(() => setCardShown(true), 2600);
    return () => clearTimeout(id);
  }, [scene]);

  if (!cardShown) {
    return (
      <div className="chapter-card">
        <p>{scene.chapterCard}</p>
      </div>
    );
  }

  const line = scene.lines[index];
  if (!line) return null;

  const advance = () => {
    if (index + 1 < scene.lines.length) setIndex(index + 1);
    else sim.endScene();
  };

  return (
    <div className="cutscene" onClick={advance}>
      <button
        className="cutscene-skip"
        onClick={(e) => {
          e.stopPropagation();
          sim.endScene();
        }}
      >
        건너뛰기
      </button>
      <div className={`cutscene-box ${line.who === null ? 'narration' : ''}`}>
        {line.who && (
          <span className={`cutscene-who ${line.who === PROTAGONIST ? 'me' : ''}`}>{line.who}</span>
        )}
        <p className="cutscene-text">{line.text}</p>
        <span className="cutscene-next">
          {index + 1} / {scene.lines.length} · 눌러서 계속
        </span>
      </div>
    </div>
  );
}
