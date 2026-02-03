export const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "AUDUSD"];
export const TIMEFRAMES = ["H1", "H4"];

export const STRATEGY_CONFIG = {
  name: "TPC_v1",
  riskPerTrade: 0.005,
  minRR: 2.5,
  h4: {
    emaFast: 50,
    emaSlow: 200,
    atr: 14,
    slopeLookback: 10,
    bars: 400
  },
  h1: {
    emaFast: 50,
    emaSlow: 200,
    atr: 14,
    bars: 800,
    touchLookback: 12
  }
};

export function formatNumber(value, decimals = 5) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(decimals);
}
