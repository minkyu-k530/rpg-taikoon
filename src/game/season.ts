/**
 * 계절.
 *
 * 80일 동안 계절이 한 바퀴 돈다(docs/STORY.md 2장). 같은 자리에 같은 포장마차인데
 * 색과 날씨만 바뀐다. **새로 만드는 에셋은 없다.**
 *
 * 3장 장마에 비가 많은 건 연출이 아니라 서사다. 그 장의 주제가
 * "매출은 반으로 줄었는데 덜 외로웠다"이기 때문이다.
 */
import type { Season } from './story';
import type { Weather } from './weather';

export interface SeasonStyle {
  label: string;
  /** 안개 색과 배경 */
  fog: string;
  background: string;
  /** 반구광 하늘/바닥 색 */
  sky: string;
  ground: string;
  /** 나뭇잎 색 */
  foliage: string;
  /** 바닥 풀색 */
  grass: string;
  /** 날씨 추첨 가중치 */
  weather: Record<Weather, number>;
  /** 봄에만 꽃잎이 날린다 */
  petals: boolean;
}

export const SEASONS: Record<Season, SeasonStyle> = {
  winter: {
    label: '겨울',
    fog: '#141d2b',
    background: '#0e141f',
    sky: '#44618f',
    ground: '#161d18',
    foliage: '#263026',
    grass: '#20291f',
    weather: { clear: 4, snow: 5, rain: 1 },
    petals: false,
  },
  spring: {
    label: '봄',
    fog: '#1d2434',
    background: '#121a26',
    sky: '#5a7099',
    ground: '#1e2a1c',
    foliage: '#4a3246',
    grass: '#2a3a24',
    weather: { clear: 7, snow: 0, rain: 3 },
    petals: true,
  },
  summer: {
    label: '여름',
    fog: '#17212a',
    background: '#0f1820',
    sky: '#466a7a',
    ground: '#17241a',
    foliage: '#1b3020',
    grass: '#223a22',
    weather: { clear: 3, snow: 0, rain: 7 },
    petals: false,
  },
  autumn: {
    label: '가을',
    fog: '#1f1d26',
    background: '#13111a',
    sky: '#6a5a78',
    ground: '#221b14',
    foliage: '#5a3a1c',
    grass: '#33281a',
    weather: { clear: 7, snow: 0, rain: 3 },
    petals: false,
  },
  lastWinter: {
    label: '겨울',
    fog: '#121a28',
    background: '#0b111b',
    sky: '#3d5783',
    ground: '#141a16',
    foliage: '#232b24',
    grass: '#1c241c',
    weather: { clear: 3, snow: 7, rain: 1 },
    petals: false,
  },
};
