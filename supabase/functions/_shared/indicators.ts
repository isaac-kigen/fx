export type Bar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0] ?? 0;
  result.push(prev);
  for (let i = 1; i < values.length; i++) {
    const next = values[i] * k + prev * (1 - k);
    result.push(next);
    prev = next;
  }
  return result;
}

export function atr(bars: Bar[], period: number): number[] {
  const result: number[] = [];
  let prevClose = bars[0]?.close ?? 0;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const tr = Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prevClose),
      Math.abs(bar.low - prevClose)
    );
    if (i === 0) {
      result.push(tr);
    } else {
      const prevAtr = result[i - 1];
      const nextAtr = (prevAtr * (period - 1) + tr) / period;
      result.push(nextAtr);
    }
    prevClose = bar.close;
  }
  return result;
}

export function findSwingLows(bars: Bar[], left = 2, right = 2): number[] {
  const swings: number[] = [];
  for (let i = left; i < bars.length - right; i++) {
    const window = bars.slice(i - left, i + right + 1).map((b) => b.low);
    const min = Math.min(...window);
    if (bars[i].low === min) {
      swings.push(i);
    }
  }
  return swings;
}

export function findSwingHighs(bars: Bar[], left = 2, right = 2): number[] {
  const swings: number[] = [];
  for (let i = left; i < bars.length - right; i++) {
    const window = bars.slice(i - left, i + right + 1).map((b) => b.high);
    const max = Math.max(...window);
    if (bars[i].high === max) {
      swings.push(i);
    }
  }
  return swings;
}
