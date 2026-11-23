/**
 * 날씨.
 *
 * 설계 규칙 하나: **비주얼 보상과 기계적 보상을 항상 일치시킨다** (GDD 8장).
 * 눈이 오면 화면이 예뻐지는 동시에 붕어빵이 더 팔려야 한다. 예쁘기만 하면 플레이어는
 * 날씨를 장식으로 취급하고, 수치만 바뀌면 날씨가 온 걸 알아채지 못한다.
 */

export type Weather = 'clear' | 'snow' | 'rain';

export interface WeatherDef {
  id: Weather;
  label: string;
  /** 지나가는 사람 수 배율 */
  spawn: number;
  /** 사 먹을 확률 배율 */
  buy: number;
  /** 먹고 가는 시간 배율. 오래 머물수록 가게가 북적여 보인다 */
  linger: number;
  /** 한 줄 설명. 마감 화면 예보에 쓴다 */
  note: string;
  /** 추첨 가중치 */
  weight: number;
}

export const WEATHER: Record<Weather, WeatherDef> = {
  clear: { id: 'clear', label: '맑음', spawn: 1, buy: 1, linger: 1, note: '평범한 저녁', weight: 5 },
  snow: { id: 'snow', label: '눈', spawn: 0.95, buy: 1.5, linger: 1.2, note: '붕어빵이 잘 팔린다', weight: 3 },
  rain: { id: 'rain', label: '비', spawn: 0.82, buy: 1.3, linger: 1.4, note: '사람은 적지만 오래 머문다', weight: 2 },
};

export function rollWeather(): Weather {
  const list = Object.values(WEATHER);
  const total = list.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * total;
  for (const w of list) {
    roll -= w.weight;
    if (roll <= 0) return w.id;
  }
  return 'clear';
}
