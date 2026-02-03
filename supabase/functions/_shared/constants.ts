export const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "AUDUSD"] as const;
export const TIMEFRAMES = ["H1", "H4"] as const;

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
  },
  confirmation: {
    lookback: 1
  },
  stop: {
    minAtrMultiple: 0.6,
    bufferAtrMultiple: 0.1
  },
  expiresHours: 6
} as const;

export const CORRELATION_GROUPS: Record<string, string[]> = {
  USD_MAJORS: ["EURUSD", "GBPUSD", "AUDUSD"],
  JPY_CROSSES: ["USDJPY", "EURJPY", "GBPJPY"]
};
