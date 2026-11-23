/**
 * 주민 명부.
 *
 * 이 게임의 차별 축은 수치 성장이 아니라 "지나가던 사람이 단골이 된다"는 것이다 (GDD 7장).
 * 그래서 손님은 매번 새로 뽑는 난수 인형이 아니라, 고정된 명부에서 다시 찾아오는 사람이어야 한다.
 * 같은 사람인 걸 알아보려면 외형이 고정되어야 하므로 색·모자·가방까지 여기서 정한다.
 */

export type Accessory = 'none' | 'cap' | 'beanie' | 'hood' | 'helmet' | 'bun' | 'long';

export interface Look {
  skin: string;
  top: string;
  bottom: string;
  accessory: Accessory;
  accessoryColor: string;
  bag: boolean;
  bagColor: string;
  /** 키 배율 */
  height: number;
  /** 걷는 속도(m/s) */
  speed: number;
}

export interface ResidentDef {
  id: string;
  /** null이면 이름 없는 행인. 단골이 되지 않는다 */
  name: string | null;
  /** 도감 한 줄 소개 */
  blurb?: string;
  /** 5줄 이내. 설교 없음, 결말 없음 */
  lines?: string[];
  /** 가족 같은 사이(30회)에서 열리는 짧은 에피소드 */
  episode?: string;
  look: Look;
  /** 등장 가중치. 단골 후보를 더 자주 등장시켜야 얼굴이 익는다 */
  weight: number;
}

/** 호감도 단계. GDD 7-2 */
export const FAVOR_STAGES = [
  { visits: 0, label: '모르는 사람' },
  { visits: 3, label: '눈에 익음' },
  { visits: 7, label: '단골' },
  { visits: 15, label: '아는 사이' },
  { visits: 30, label: '가족 같은' },
] as const;

export function favorStage(visits: number): number {
  let stage = 0;
  for (let i = FAVOR_STAGES.length - 1; i >= 0; i--) {
    if (visits >= FAVOR_STAGES[i].visits) {
      stage = i;
      break;
    }
  }
  return stage;
}

/** 단계별로 열리는 대사 수: 모름 0, 눈에 익음 0, 단골 1줄, 아는 사이 3줄, 가족 5줄 */
const LINES_BY_STAGE = [0, 0, 1, 3, 5];

export function unlockedLines(def: ResidentDef, visits: number): string[] {
  if (!def.lines) return [];
  return def.lines.slice(0, LINES_BY_STAGE[favorStage(visits)]);
}

export const REGULARS: ResidentDef[] = [
  {
    id: 'seungwoo',
    name: '박승우',
    blurb: '사흘째 같은 후드티. 릴리즈가 안 끝난다.',
    lines: [
      '국물만 좀… 아니다, 두 개 주세요.',
      '오늘은 진짜 열두 시 전에 갈 거예요.',
      '어제 그 말 취소요.',
      '사장님은 몇 시에 닫으세요? …저보다 늦네.',
      '이거 먹고 롤백하면 제 탓 아니죠.',
    ],
    episode: '배포가 끝난 날, 처음으로 웃으면서 왔다. 네 개를 사서 두 개는 사무실에 두고 간다고 했다.',
    look: { skin: '#dcae87', top: '#2f3640', bottom: '#2b3a52', accessory: 'hood', accessoryColor: '#2f3640', bag: true, bagColor: '#1f2429', height: 1.03, speed: 1.15 },
    weight: 3,
  },
  {
    id: 'haram',
    name: '정하람',
    blurb: '헬멧을 안 벗고 서서 먹는다.',
    lines: [
      '서서 먹을게요. 금방 가야 해서.',
      '자전거로 사십 분이요. 할 만해요.',
      '겨울엔 손이 시려서 이게 핫팩이에요.',
      '여기 불빛 보고 속도 줄이게 돼요.',
      '내일도 이 시간쯤 지나갈 거예요.',
    ],
    episode: '비 오는 날 처음으로 자전거를 끌고 왔다. 그날은 앉아서 먹었다.',
    look: { skin: '#c48f66', top: '#7a3f3f', bottom: '#2e3b4e', accessory: 'helmet', accessoryColor: '#d6d8dc', bag: true, bagColor: '#3a4450', height: 1.0, speed: 1.45 },
    weight: 3,
  },
  {
    id: 'dogyeong',
    name: '윤도경',
    blurb: '매일 같은 시간에 지나가던 러너.',
    lines: [
      '지나갈 때마다 냄새가 나서요.',
      '오늘 7킬로 뛰었으니까 괜찮아요.',
      '뛰고 나서 먹는 게 제일 맛있어요.',
      '겨울엔 여기가 반환점이에요.',
      '내일은 안 멈출 거예요. 아마도요.',
    ],
    episode: '어느 날은 뛰지 않고 걸어왔다. 아무것도 묻지 않고 두 개를 건넸다.',
    look: { skin: '#e8c3a0', top: '#2f5d50', bottom: '#2b3a52', accessory: 'beanie', accessoryColor: '#44506b', bag: false, bagColor: '#000', height: 0.99, speed: 1.55 },
    weight: 3,
  },
  {
    id: 'youngsook',
    name: '최영숙',
    blurb: '강아지가 먼저 포장마차 앞에 선다.',
    lines: [
      '얘가 먼저 여기로 와요.',
      '하나는 제 거, 하나는… 아니에요, 안 줘요.',
      '아들이 판교에서 일해요.',
      '이 길이 밤에 제일 조용해요.',
      '추우면 일찍 들어가세요.',
    ],
    episode: '어느 날 강아지만 데리고 와서 한참 서 있다가, 사지 않고 인사만 하고 갔다.',
    look: { skin: '#dcae87', top: '#5b3f52', bottom: '#394b3a', accessory: 'bun', accessoryColor: '#2a2420', bag: true, bagColor: '#5a4a3a', height: 0.93, speed: 1.05 },
    weight: 2,
  },
  {
    id: 'siyeon',
    name: '김시연',
    blurb: '입사 3개월 차. 혼잣말이 많다.',
    lines: [
      '하나만 주세요. 아, 두 개요.',
      '사수가… 아니에요. 아무것도 아니에요.',
      '첫 월급 타면 여기서 제일 비싼 거 살게요.',
      '오늘은 안 울었어요.',
      '내년에도 여기 계실 거죠?',
    ],
    episode: '월급날 네 개를 사서 하나를 사장님께 내밀었다. 그날 처음으로 이름을 말했다.',
    look: { skin: '#e8c3a0', top: '#44506b', bottom: '#2e3b4e', accessory: 'long', accessoryColor: '#2a2018', bag: true, bagColor: '#6b4a2f', height: 0.96, speed: 1.2 },
    weight: 3,
  },
  {
    id: 'jaemin',
    name: '오재민',
    blurb: '야근 끝난 디자이너. 늘 두 개씩.',
    lines: [
      '두 개요. 하나는 팀장님 거예요.',
      '시안 네 개 만들었는데 다 엎었어요.',
      '여기 조명 색 좋다. 사진 찍어도 돼요?',
      '이 간판 폰트 제가 바꿔 드릴까요?',
      '오늘은 제가 제일 늦게 나왔어요.',
    ],
    episode: '간판 글씨를 직접 그려 와서 붙여 주고 갔다. 돈은 안 받았다.',
    look: { skin: '#c48f66', top: '#6b4a2f', bottom: '#3a3f4a', accessory: 'cap', accessoryColor: '#2f3640', bag: true, bagColor: '#2f3640', height: 1.01, speed: 1.25 },
    weight: 3,
  },
  {
    id: 'jiwoo',
    name: '한지우',
    blurb: '학원 끝난 고등학생. 늘 현금이 모자란다.',
    lines: [
      '천 원어치만… 되나요?',
      '내일 더 가지고 올게요.',
      '수학 학원이 열 시에 끝나요.',
      '여기서 먹고 가면 엄마한테 안 걸려요.',
      '이거 먹으면 공부 잘 되는 것 같아요.',
    ],
    episode: '수능 끝난 날 친구 둘을 데리고 와서, 처음으로 제값을 다 내고 갔다.',
    look: { skin: '#dcae87', top: '#2e3b4e', bottom: '#2b3a52', accessory: 'hood', accessoryColor: '#394b3a', bag: true, bagColor: '#2a3340', height: 0.94, speed: 1.35 },
    weight: 2,
  },
  {
    id: 'panseok',
    name: '서판석',
    blurb: '건너편 건물 경비. 교대 시간마다 들른다.',
    lines: [
      '교대 전에 하나 먹고 가야지.',
      '저 건물 불, 새벽 두 시까지 켜져 있어요.',
      '젊은 사람들 참 열심히 살아.',
      '비 오면 장사 접고 들어가요.',
      '나는 여기 오는 게 낙이야.',
    ],
    episode: '정년 퇴임하는 날, 평소보다 오래 서 있다가 "그동안 고마웠다"고 했다.',
    look: { skin: '#9a6a48', top: '#2b3a52', bottom: '#3a3f4a', accessory: 'cap', accessoryColor: '#1f2429', bag: false, bagColor: '#000', height: 0.97, speed: 1.1 },
    weight: 2,
  },
];

/** 이름 없는 행인. 군중 밀도를 만든다 */
const PASSERBY_LOOKS: Look[] = [
  { skin: '#e8c3a0', top: '#3b4a6b', bottom: '#2e3b4e', accessory: 'none', accessoryColor: '#000', bag: false, bagColor: '#000', height: 1.0, speed: 1.3 },
  { skin: '#c48f66', top: '#5b3f52', bottom: '#5a5f46', accessory: 'cap', accessoryColor: '#44506b', bag: true, bagColor: '#2f3640', height: 1.05, speed: 1.4 },
  { skin: '#dcae87', top: '#2f5d50', bottom: '#3a3f4a', accessory: 'long', accessoryColor: '#2a2018', bag: true, bagColor: '#5b3f52', height: 0.95, speed: 1.15 },
  { skin: '#9a6a48', top: '#7a3f3f', bottom: '#394b3a', accessory: 'beanie', accessoryColor: '#2f5d50', bag: false, bagColor: '#000', height: 1.02, speed: 1.5 },
  { skin: '#e8c3a0', top: '#6b4a2f', bottom: '#2b3a52', accessory: 'none', accessoryColor: '#000', bag: true, bagColor: '#4a3b33', height: 0.98, speed: 1.22 },
  { skin: '#dcae87', top: '#44506b', bottom: '#5a5f46', accessory: 'bun', accessoryColor: '#2a2420', bag: false, bagColor: '#000', height: 0.92, speed: 1.08 },
  { skin: '#c48f66', top: '#2e3b4e', bottom: '#4a3b33', accessory: 'hood', accessoryColor: '#2e3b4e', bag: true, bagColor: '#1f2429', height: 1.06, speed: 1.33 },
  { skin: '#e8c3a0', top: '#5a5f46', bottom: '#2e3b4e', accessory: 'cap', accessoryColor: '#7a3f3f', bag: false, bagColor: '#000', height: 1.0, speed: 1.45 },
  { skin: '#9a6a48', top: '#394b3a', bottom: '#3a3f4a', accessory: 'none', accessoryColor: '#000', bag: true, bagColor: '#2a3340', height: 1.03, speed: 1.18 },
  { skin: '#dcae87', top: '#3b4a6b', bottom: '#4a3b33', accessory: 'long', accessoryColor: '#3a2a1a', bag: false, bagColor: '#000', height: 0.97, speed: 1.28 },
  { skin: '#c48f66', top: '#7a3f3f', bottom: '#2b3a52', accessory: 'beanie', accessoryColor: '#6b4a2f', bag: true, bagColor: '#2f3640', height: 1.01, speed: 1.38 },
  { skin: '#e8c3a0', top: '#2f5d50', bottom: '#394b3a', accessory: 'none', accessoryColor: '#000', bag: false, bagColor: '#000', height: 0.99, speed: 1.12 },
];

const PASSERSBY: ResidentDef[] = PASSERBY_LOOKS.map((look, i) => ({
  id: `passerby-${i}`,
  name: null,
  look,
  weight: 1,
}));

export const RESIDENTS: ResidentDef[] = [...REGULARS, ...PASSERSBY];

export const RESIDENT_BY_ID = new Map(RESIDENTS.map((r) => [r.id, r]));
