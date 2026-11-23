/**
 * 이야기 데이터. 전부 데이터일 뿐 로직이 없다.
 * 대사 원본은 docs/STORY.md에 있고, 여기는 그걸 실행 가능한 형태로 옮긴 것이다.
 *
 * 규칙(STORY.md 7장):
 * 1. 컷신은 건너뛸 수 있다
 * 2. 컷신 중에도 가게는 돌아간다 — 그래서 이 데이터는 시뮬레이션을 멈추지 않는다
 * 3. 장 진행에 매출 조건을 걸지 않는다 — 트리거는 날짜뿐이다
 */

export type Season = 'winter' | 'spring' | 'summer' | 'autumn' | 'lastWinter';

export interface Line {
  /** null이면 지문 */
  who: string | null;
  text: string;
}

export interface Chapter {
  no: number;
  title: string;
  startDay: number;
  endDay: number;
  season: Season;
}

export interface Scene {
  id: string;
  day: number;
  /** 장이 시작되는 컷신이면 장 제목 카드를 먼저 띄운다 */
  chapterCard?: string;
  lines: Line[];
}

export const PROTAGONIST = '장태수';
/** 마지막 날. 이 날 밤에 결말을 고른다 */
export const FINAL_DAY = 80;

export const CHAPTERS: Chapter[] = [
  { no: 1, title: '첫 손님', startDay: 1, endDay: 10, season: 'winter' },
  { no: 2, title: '해빙', startDay: 11, endDay: 25, season: 'spring' },
  { no: 3, title: '장마', startDay: 26, endDay: 45, season: 'summer' },
  { no: 4, title: '소문', startDay: 46, endDay: 65, season: 'autumn' },
  { no: 5, title: '마지막 겨울', startDay: 66, endDay: FINAL_DAY, season: 'lastWinter' },
];

export function chapterForDay(day: number): Chapter {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    if (day >= CHAPTERS[i].startDay) return CHAPTERS[i];
  }
  return CHAPTERS[0];
}

const T = PROTAGONIST;

export const SCENES: Scene[] = [
  // ------------------------------------------------------------ 1장 겨울
  {
    id: 'ch1-open',
    day: 1,
    chapterCard: '1장 · 첫 손님',
    lines: [
      { who: null, text: '운중천 산책로. 건너편 오피스 빌딩의 창이 아직 반쯤 켜져 있다.' },
      { who: T, text: '스물두 해를 저기 앉아 있었다.' },
      { who: T, text: '나와서 처음 한 일이 저 건물 앞에 자리를 잡은 거다.' },
      { who: T, text: '…오늘은 몇 개나 버리려나.' },
    ],
  },
  {
    id: 'ch1-first',
    day: 3,
    lines: [
      { who: null, text: '열한 시가 넘었다. 처음으로 누가 포장마차 앞에 섰다.' },
      { who: '박승우', text: '아직 하세요?' },
      { who: T, text: '…합니다.' },
      { who: '박승우', text: '두 개요. 아니 세 개.' },
      { who: null, text: '박승우가 간 뒤.' },
      { who: T, text: '세 개.' },
    ],
  },
  {
    id: 'ch1-oden',
    day: 7,
    lines: [
      { who: null, text: '야근하고 나온 사람들은 빵보다 국물을 먼저 찾는다.' },
      { who: T, text: '빵은 안 먹어도 국물은 마시더라.' },
      { who: null, text: '어묵탕을 놓을 수 있게 됐다.' },
    ],
  },
  {
    id: 'ch1-close',
    day: 10,
    lines: [
      { who: T, text: '열흘 동안 일곱 명.' },
      { who: T, text: '회사 다닐 땐 하루에 백 명을 지나쳤는데.' },
      { who: T, text: '일곱 명이 더 많게 느껴지는 건 왜일까.' },
    ],
  },

  // ------------------------------------------------------------ 2장 봄
  {
    id: 'ch2-open',
    day: 11,
    chapterCard: '2장 · 해빙',
    lines: [
      { who: null, text: '천변에 꽃이 폈다.' },
      { who: T, text: '꽃이 피니까 사람이 는다.' },
      { who: T, text: '작년 이맘때는 창 너머로만 봤다.' },
    ],
  },
  {
    id: 'ch2-name',
    day: 14,
    lines: [
      { who: '김시연', text: '저… 혹시 제 이름 아세요?' },
      { who: T, text: '압니다. 늘 두 개 시키시잖아요.' },
      { who: '김시연', text: '(웃음) 그거 이름 아닌데요.' },
    ],
  },
  {
    id: 'ch2-tteok',
    day: 19,
    lines: [
      { who: null, text: '저녁을 거르고 오는 사람이 늘었다.' },
      { who: T, text: '빵으로는 배가 안 차는 모양이다.' },
      { who: null, text: '떡볶이 솥을 놓을 수 있게 됐다.' },
    ],
  },
  {
    id: 'ch2-close',
    day: 25,
    lines: [
      { who: T, text: '이름을 알면 이상해진다.' },
      { who: T, text: '안 오면 궁금해진다.' },
    ],
  },

  // ------------------------------------------------------------ 3장 여름
  {
    id: 'ch3-open',
    day: 26,
    chapterCard: '3장 · 장마',
    lines: [
      { who: null, text: '비가 시작됐다. 천변 물이 불었다.' },
      { who: T, text: '비가 오면 아무도 안 온다. 알고는 있었는데.' },
    ],
  },
  {
    id: 'ch3-rain',
    day: 31,
    lines: [
      { who: null, text: '빗소리밖에 들리지 않는 밤.' },
      { who: '서판석', text: '오늘 같은 날은 접고 들어가요.' },
      { who: T, text: '한 사람은 오겠죠.' },
      { who: '서판석', text: '그 한 사람이 나야?' },
      { who: T, text: '…오늘은요.' },
    ],
  },
  {
    id: 'ch3-helper',
    day: 38,
    lines: [
      { who: null, text: '비가 그친 날은 사람이 몰렸다. 혼자서는 손이 모자랐다.' },
      { who: T, text: '손이 둘이면 좋겠다고 생각한 건 처음이다.' },
      { who: null, text: '알바를 쓸 수 있게 됐다.' },
    ],
  },
  {
    id: 'ch3-close',
    day: 45,
    lines: [
      { who: T, text: '장마가 끝났다.' },
      { who: T, text: '매출은 반으로 줄었는데, 이상하게 덜 외로웠다.' },
    ],
  },

  // ------------------------------------------------------------ 4장 가을
  {
    id: 'ch4-open',
    day: 46,
    chapterCard: '4장 · 소문',
    lines: [
      { who: '오재민', text: '사장님, 저희 회사 단톡방에 여기 올라왔어요.' },
      { who: T, text: '뭐라고요?' },
      { who: '오재민', text: '"운중천 붕어빵 아저씨 진짜임."' },
      { who: T, text: '…그게 칭찬입니까?' },
      { who: '오재민', text: '최고의 칭찬이에요.' },
    ],
  },
  {
    id: 'ch4-queue',
    day: 52,
    lines: [
      { who: null, text: '줄이 다리 밑까지 늘어섰다.' },
      { who: T, text: '오늘 스물세 명을 돌려보냈다.' },
      { who: T, text: '사람이 없어서 서럽더니, 많아도 서럽다.' },
    ],
  },
  {
    id: 'ch4-notice',
    day: 59,
    lines: [
      { who: null, text: '산책로 입구에 현수막이 걸렸다.' },
      { who: null, text: '「운중천 일대 하천정비사업 — 2월 말까지 노점 정리」' },
      { who: T, text: '2월 말.' },
      { who: T, text: '올겨울이 마지막이다.' },
    ],
  },
  {
    id: 'ch4-close',
    day: 65,
    lines: [
      { who: T, text: '손님들한테는 아직 말 안 했다.' },
      { who: T, text: '말하면 진짜가 되니까.' },
    ],
  },

  // ------------------------------------------------------------ 5장 마지막 겨울
  {
    id: 'ch5-open',
    day: 66,
    chapterCard: '5장 · 마지막 겨울',
    lines: [
      { who: null, text: '다시 눈이 왔다.' },
      { who: T, text: '열다섯 밤.' },
    ],
  },
  {
    id: 'ch5-known',
    day: 70,
    lines: [
      { who: '박승우', text: '현수막 봤어요.' },
      { who: T, text: '…네.' },
      { who: '박승우', text: '그럼 저 야근 누가 지켜봐 줘요.' },
      { who: T, text: '그 건물 경비 아저씨가 봐 주실 겁니다.' },
      { who: '박승우', text: '그분은 저 안 좋아해요.' },
      { who: T, text: '좋아하십니다. 매번 물어보세요, 저 친구 아직 안 갔냐고.' },
    ],
  },
  {
    id: 'ch5-gather',
    day: 76,
    lines: [
      { who: null, text: '평소보다 사람이 많다. 아는 얼굴들이다.' },
      { who: '윤도경', text: '오늘은 안 뛰고 왔어요.' },
      { who: '최영숙', text: '얘도 아나 봐. 안 가려고 버티네.' },
      { who: '한지우', text: '저 수능 끝났어요. 이제 돈 있어요.' },
      { who: T, text: '그럼 오늘은 제값 받겠습니다.' },
      { who: '한지우', text: '…깎아 주세요.' },
    ],
  },
];

export const SCENE_BY_DAY = new Map(SCENES.map((s) => [s.day, s]));

/** 5장에서 화면에 남은 밤을 센다 */
export function nightsLeft(day: number): number | null {
  if (day < CHAPTERS[4].startDay) return null;
  return Math.max(0, FINAL_DAY - day);
}
