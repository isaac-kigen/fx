import { STRATEGY_CONFIG } from "./constants.ts";
import { atr, ema, findSwingHighs, findSwingLows, type Bar } from "./indicators.ts";

export type Trend = "bull" | "bear" | "none";

export function computeTrend(h4: Bar[]): Trend {
  if (h4.length < STRATEGY_CONFIG.h4.emaSlow + STRATEGY_CONFIG.h4.slopeLookback) return "none";
  const closes = h4.map((b) => b.close);
  const ema50 = ema(closes, STRATEGY_CONFIG.h4.emaFast);
  const ema200 = ema(closes, STRATEGY_CONFIG.h4.emaSlow);
  const last = h4.length - 1;
  const slopeLookback = STRATEGY_CONFIG.h4.slopeLookback;
  const ema50Slope = ema50[last] - ema50[last - slopeLookback];

  if (closes[last] > ema200[last] && ema50[last] > ema200[last] && ema50Slope > 0) {
    return "bull";
  }
  if (closes[last] < ema200[last] && ema50[last] < ema200[last] && ema50Slope < 0) {
    return "bear";
  }
  return "none";
}

export function h1Indicators(h1: Bar[]) {
  const closes = h1.map((b) => b.close);
  return {
    ema50: ema(closes, STRATEGY_CONFIG.h1.emaFast),
    ema200: ema(closes, STRATEGY_CONFIG.h1.emaSlow),
    atr14: atr(h1, STRATEGY_CONFIG.h1.atr)
  };
}

export function touchedValue(h1: Bar[], indicators: ReturnType<typeof h1Indicators>, trend: Trend) {
  const lastIndex = h1.length - 1;
  const maxLookback = STRATEGY_CONFIG.h1.touchLookback;
  for (let i = Math.max(0, lastIndex - maxLookback); i <= lastIndex; i++) {
    const bar = h1[i];
    const ema50 = indicators.ema50[i];
    const atr14 = indicators.atr14[i];
    if (trend === "bull") {
      if (bar.low <= ema50 + 0.2 * atr14) return i;
    }
    if (trend === "bear") {
      if (bar.high >= ema50 - 0.2 * atr14) return i;
    }
  }
  return null;
}

export function isOverextended(h1: Bar[], indicators: ReturnType<typeof h1Indicators>, trend: Trend) {
  const last = h1.length - 1;
  const close = h1[last].close;
  const ema50 = indicators.ema50[last];
  const atr14 = indicators.atr14[last];
  if (trend === "bull") {
    return close > ema50 + 1.5 * atr14;
  }
  if (trend === "bear") {
    return close < ema50 - 1.5 * atr14;
  }
  return true;
}

export function confirmationTrigger(h1: Bar[], trend: Trend): { entry: number; entryType: "market" | "stop" } | null {
  const last = h1.length - 1;
  if (last < 1) return null;
  const prev = h1[last - 1];
  const curr = h1[last];
  if (trend === "bull" && curr.close > prev.high) {
    return { entry: curr.high, entryType: "stop" };
  }
  if (trend === "bear" && curr.close < prev.low) {
    return { entry: curr.low, entryType: "stop" };
  }
  return null;
}

export function computeStop(h1: Bar[], trend: Trend, atr14: number, pipSize: number) {
  const swings = trend === "bull" ? findSwingLows(h1) : findSwingHighs(h1);
  const lastSwingIndex = swings[swings.length - 1];
  const lastSwing = lastSwingIndex !== undefined ? h1[lastSwingIndex] : h1[h1.length - 1];
  const pullbackWindow = h1.slice(-12);
  const pullbackExtreme = trend === "bull"
    ? Math.min(...pullbackWindow.map((b) => b.low))
    : Math.max(...pullbackWindow.map((b) => b.high));
  const buffer = Math.max(atr14 * STRATEGY_CONFIG.stop.bufferAtrMultiple, pipSize);
  if (trend === "bull") {
    return Math.min(lastSwing.low, pullbackExtreme) - buffer;
  }
  return Math.max(lastSwing.high, pullbackExtreme) + buffer;
}

export function passesStopFloor(entry: number, stop: number, atr14: number, pipSize: number) {
  const stopPips = Math.abs(entry - stop) / pipSize;
  const minStopPips = (atr14 / pipSize) * STRATEGY_CONFIG.stop.minAtrMultiple;
  return stopPips >= minStopPips;
}

export function computeTp(entry: number, stop: number, trend: Trend, rr = STRATEGY_CONFIG.minRR) {
  const r = Math.abs(entry - stop);
  if (trend === "bull") return entry + rr * r;
  return entry - rr * r;
}

export function h4StructureBlocks(h4: Bar[], entry: number, tp: number, trend: Trend) {
  const swings = trend === "bull" ? findSwingHighs(h4) : findSwingLows(h4);
  if (!swings.length) return false;
  const levels = swings.map((idx) => (trend === "bull" ? h4[idx].high : h4[idx].low));
  if (trend === "bull") {
    const nearest = Math.min(...levels.filter((lvl) => lvl > entry));
    return Number.isFinite(nearest) && nearest < tp;
  }
  const nearest = Math.max(...levels.filter((lvl) => lvl < entry));
  return Number.isFinite(nearest) && nearest > tp;
}
