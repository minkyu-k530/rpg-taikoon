import { createRoot } from 'react-dom/client';
import { Bench, type BenchOptions } from './Bench';

const params = new URLSearchParams(location.search);
function numberParam(name: string, fallback: number, min: number, max: number) {
  const value = Number(params.get(name));
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}
const options: BenchOptions = {
  n: Math.floor(numberParam('n', 20, 1, 200)),
  v: Math.floor(numberParam('v', 3000, 675, 30000)),
  shadows: params.get('shadows') !== '0',
  scene: params.get('scene') !== '0',
  sec: numberParam('sec', 10, 1, 120),
};

createRoot(document.getElementById('root')!).render(<Bench options={options} />);
