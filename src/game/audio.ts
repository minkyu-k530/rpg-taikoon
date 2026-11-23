/**
 * 소리. 오디오 파일을 쓰지 않고 Web Audio로 합성한다.
 *
 * 이유 둘.
 * 1. 무료 에셋을 쓰기로 했는데(GDD) 괜찮은 환경음 라이선스를 고르고 받고 용량을 재는 비용이,
 *    노이즈에 필터 거는 비용보다 크다.
 * 2. 합성이면 **상태에 반응하는 소리**를 만들 수 있다. 굽는 틀이 늘면 기름 소리가 커지고,
 *    눈이 오면 전체가 먹먹해진다. 녹음 파일로는 못 하는 것들이다.
 */

export type SimEvent = 'flip' | 'sale' | 'unlock' | 'dayEnd';

const MUTE_KEY = 'unjungcheon-bunsik-mute';

interface Bed {
  gain: GainNode;
  /** 목표 음량. 날씨·상태에 따라 부드럽게 따라간다 */
  target: number;
}

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** 눈 오는 날의 먹먹함을 만드는 마스터 로우패스 */
  private muffle: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private beds: Record<string, Bed> = {};
  private analyser: AnalyserNode | null = null;

  muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

  get started() {
    return this.ctx !== null;
  }

  /** 브라우저는 사용자의 첫 입력 전에는 소리를 못 내게 한다. 그래서 지연 초기화한다 */
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;

    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 20000;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.muffle.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this.noise = makeNoise(ctx);
    // 하천: 넓은 대역의 물소리
    this.beds.water = this.makeNoiseBed('bandpass', 760, 0.55, 0.1);
    // 밤바람: 낮게 깔리는 바닥
    this.beds.wind = this.makeNoiseBed('lowpass', 320, 0.7, 0.06);
    // 기름: 굽는 틀 수에 따라 커진다
    this.beds.oil = this.makeNoiseBed('bandpass', 2600, 1.4, 0);
    // 빗소리: 비 올 때만
    this.beds.rain = this.makeNoiseBed('highpass', 1100, 0.7, 0);
  }

  private makeNoiseBed(type: BiquadFilterType, freq: number, q: number, level: number): Bed {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.value = level;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.muffle!);
    src.start();

    return { gain, target: level };
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // 저장이 막혀도 이번 세션 동안은 적용된다
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * 매 프레임 호출. 소리를 상태에 붙인다.
   * @param bakingRatio 굽고 있는 틀의 비율 0~1
   */
  update(weather: 'clear' | 'snow' | 'rain', bakingRatio: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    // 눈이 오면 고역을 깎아 먹먹하게. 비가 오면 오히려 선명하게 쏟아진다
    const cutoff = weather === 'snow' ? 1800 : weather === 'rain' ? 9000 : 14000;
    this.muffle?.frequency.setTargetAtTime(cutoff, now, 0.8);

    this.beds.rain.gain.gain.setTargetAtTime(weather === 'rain' ? 0.17 : 0, now, 1.2);
    this.beds.water.gain.gain.setTargetAtTime(weather === 'snow' ? 0.07 : 0.1, now, 1.2);
    this.beds.oil.gain.gain.setTargetAtTime(0.02 + bakingRatio * 0.07, now, 0.4);
  }

  play(event: SimEvent) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    switch (event) {
      case 'flip':
        // 뒤집는 순간의 짧고 건조한 소리. 핵심 조작이라 주변음 위로 또렷이 올라와야 한다
        this.blip(1180, 0.08, 0.2, 'triangle');
        this.tick(0.06);
        break;
      case 'sale':
        // 두 음짜리 작은 종. 돈이 아니라 인사에 가깝게
        this.blip(659.25, 0.5, 0.11, 'sine');
        this.blip(987.77, 0.55, 0.08, 'sine', 0.09);
        break;
      case 'unlock':
        // 단골 승급. 이 게임에서 가장 중요한 순간이라 유일하게 세 음을 쓴다
        this.blip(523.25, 0.6, 0.1, 'sine');
        this.blip(659.25, 0.6, 0.09, 'sine', 0.13);
        this.blip(783.99, 0.9, 0.09, 'sine', 0.26);
        break;
      case 'dayEnd':
        this.blip(329.63, 1.4, 0.09, 'sine');
        this.blip(493.88, 1.4, 0.06, 'sine', 0.05);
        break;
    }
  }

  private blip(freq: number, dur: number, peak: number, type: OscillatorType, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.muffle!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** 짧은 노이즈 틱. 금속이 부딪히는 느낌을 낸다 */
  private tick(dur: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.muffle!);
    src.start(t, Math.random() * 1.5, dur);
  }

  /** 검증용. 지금 실제로 나가고 있는 신호의 RMS */
  rms(): number {
    if (!this.analyser) return 0;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    // 약간의 브라운 성분을 섞어야 쉿 소리가 덜 난다
    last = (last + 0.02 * white) / 1.02;
    data[i] = white * 0.6 + last * 6;
  }
  return buf;
}

export const audio = new Audio();

if (import.meta.env.DEV) {
  // 브라우저 콘솔에서 음량을 재 보기 위한 개발용 핸들
  const devWindow = window as unknown as { __audio: Audio };
  devWindow.__audio = audio;
}
