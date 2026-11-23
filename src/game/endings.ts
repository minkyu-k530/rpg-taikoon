/**
 * 결말과 에필로그 (docs/STORY.md 4·5장).
 *
 * 규칙 둘.
 * 1. **어느 결말도 나쁜 결말이 아니다.** 좋고 나쁨이 아니라 어떤 사람으로 끝낼지를 고른다
 * 2. **못 고르는 이유를 숨기지 않는다.** 조건을 못 채웠으면 그 자리에 뭐가 모자란지 쓴다
 */
import { PROTAGONIST, type Line } from './story';

export type EndingId = 'close' | 'move' | 'handover';

export interface Ending {
  id: EndingId;
  title: string;
  /** 선택지에 보이는 말 */
  choice: string;
  /** 조건 설명. 조건이 없으면 null */
  requirement: string | null;
  lines: Line[];
}

/** 결말 B 조건: 80일 동안 벌어들인 누적 순이익 */
export const MOVE_PROFIT = 2_000_000;
/**
 * 결말 C 조건: 물려줄 가게가 갖춰져 있어야 한다.
 * 단골 수를 조건으로 걸었더니 80일이면 저절로 채워져 변별력이 없었다 —
 * 손님은 가만 둬도 다시 오기 때문이다. 그래서 '가게를 어디까지 키웠나'로 바꿨다.
 */
export const HANDOVER_NEEDS = { helper: 2, tteok: 1, sign: 3 } as const;

const T = PROTAGONIST;

export const ENDINGS: Record<EndingId, Ending> = {
  close: {
    id: 'close',
    title: '여기까지',
    choice: '여기까지 하겠습니다',
    requirement: null,
    lines: [
      { who: T, text: '마지막입니다.' },
      { who: '박승우', text: '그동안 감사했습니다.' },
      { who: T, text: '제가 감사했죠.' },
      { who: null, text: '손님이 다 간 뒤, 불을 껐다. 건너편 창 몇 개가 아직 켜져 있다.' },
      { who: T, text: '스물두 해 동안 저 창 안에 있었고,' },
      { who: T, text: '일 년 동안 저 창 밖에 있었다.' },
      { who: T, text: '밖이 더 밝았다.' },
    ],
  },
  move: {
    id: 'move',
    title: '옮깁니다',
    choice: '자리를 옮겨서 계속하겠습니다',
    requirement: `누적 순이익 ${(MOVE_PROFIT / 10000).toLocaleString('ko-KR')}만 원`,
    lines: [
      { who: T, text: '접는 게 아니라 옮기는 겁니다.' },
      { who: '오재민', text: '어디로요?' },
      { who: T, text: '아직 모릅니다. 정해지면 여기 종이 붙여 놓을게요.' },
      { who: '오재민', text: '그 종이 떼어 가면요?' },
      { who: T, text: '…떼어 가지 마세요.' },
      { who: null, text: '봄. 다른 천변. 같은 포장마차.' },
      { who: null, text: '멀리서 익숙한 실루엣 하나가 걸어온다.' },
      { who: T, text: '찾아왔네.' },
    ],
  },
  handover: {
    id: 'handover',
    title: '물려줍니다',
    choice: '자네가 해 보겠나',
    requirement: '알바 Lv.2 · 떡볶이 솥 · 간판 Lv.3',
    lines: [
      { who: T, text: '자네가 해 보겠나.' },
      { who: '알바', text: '저요?' },
      { who: T, text: '반죽은 가르쳐 줄게. 사람 보는 건 자네가 더 낫더라.' },
      { who: '알바', text: '…제가요?' },
      { who: T, text: '한지우 학생 돈 모자랄 때, 자네가 먼저 하나 더 넣더라.' },
      { who: null, text: '다음 겨울. 같은 자리에 포장마차.' },
      { who: null, text: '굽는 사람이 바뀌어 있다. 손님 줄 맨 뒤에 장태수가 서 있다.' },
      { who: '알바', text: '사장님, 몇 개요?' },
      { who: T, text: '세 개.' },
    ],
  },
};

/** 1장 3일에 첫 손님이 시킨 수량과 같다. 아는 사람만 알아보면 된다 */
export const ENDING_ORDER: EndingId[] = ['close', 'move', 'handover'];

export interface Epilogue {
  /** 단골(7회) 이상이면 보인다 */
  known: string;
  /** '가족 같은'(30회)까지 간 경우에만 한 줄 더 */
  close: string;
}

export const EPILOGUES: Record<string, Epilogue> = {
  seungwoo: {
    known: '그 프로젝트는 결국 출시됐다. 회식 날 혼자 여기 왔었다고 한다.',
    close: '이직한 회사에서도 야근을 한다. 다만 이제 열두 시 전에는 나온다.',
  },
  haram: {
    known: '겨울에도 자전거를 탄다. 지나갈 때 속도를 줄이는 자리가 하나 생겼다.',
    close: '자전거 동호회 사람들을 데려와 네 명이 서서 먹은 날이 있었다.',
  },
  dogyeong: {
    known: '러닝 코스를 바꿨다. 이쪽으로는 잘 오지 않는다.',
    close: '마라톤을 완주했다. 기록보다 멈춰 서지 않은 걸 더 좋아했다.',
  },
  youngsook: {
    known: '강아지가 아직도 그 자리에서 멈춰 선다고 한다.',
    close: '아들이 판교를 떠났다. 그래도 산책 시간은 그대로다.',
  },
  siyeon: {
    known: '이직했다. 첫 월급으로 팀에 붕어빵을 돌렸다.',
    close: '이제 사수가 됐다. 신입을 데리고 저녁을 먹으러 다닌다.',
  },
  jaemin: {
    known: '간판 글씨를 자기 포트폴리오에 넣었다.',
    close: '그 포트폴리오로 이직했다. 첫 줄에 "운중천 분식 간판"이라고 적혀 있다.',
  },
  jiwoo: {
    known: '대학에 갔다. 가끔 그 앞을 지난다.',
    close: '첫 알바비를 탄 날, 친구 셋을 데려와 제값을 다 냈다.',
  },
  panseok: {
    known: '정년이 2년 남았다. 아직 그 건물을 지킨다.',
    close: '퇴임식 날 아무도 안 왔다고 했다. 사실은 한 명 왔다.',
  },
};

export const FINAL_LINES: Line[] = [
  { who: null, text: '— 운중천 분식 —' },
  { who: T, text: '여덟 명 전부의 이름을 안다.' },
  { who: T, text: '회사에서 스물두 해 동안 그랬던 적이 없다.' },
];
