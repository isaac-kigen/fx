import { Bar } from "./indicators.ts";

export type Instrument = {
  symbol: string;
  pip_size: number;
  digits: number;
  contract_size: number;
  base_ccy: string;
  quote_ccy: string;
};

export type AccountState = {
  equity: number;
  currency: string;
};

export function stopPips(entry: number, stop: number, pipSize: number): number {
  return Math.abs(entry - stop) / pipSize;
}

export function riskAmount(equity: number, riskPerTrade: number): number {
  return equity * riskPerTrade;
}

export function roundLotSize(lots: number, step = 0.01): number {
  const rounded = Math.floor(lots / step) * step;
  return Math.max(0, Number(rounded.toFixed(2)));
}

export function pipValueApprox(symbol: string): number {
  if (symbol.endsWith("JPY")) {
    return 9.5;
  }
  return 10;
}

export function computePipValue(params: {
  instrument: Instrument;
  entryPrice: number;
  accountCurrency: string;
  quoteToAccountRate?: number;
}): number {
  const { instrument, entryPrice, accountCurrency, quoteToAccountRate } = params;
  const pipValueQuote = instrument.contract_size * instrument.pip_size;

  if (instrument.quote_ccy === accountCurrency) {
    return pipValueQuote;
  }

  if (instrument.base_ccy === accountCurrency) {
    return pipValueQuote / entryPrice;
  }

  if (!quoteToAccountRate) {
    return pipValueQuote;
  }

  return pipValueQuote * quoteToAccountRate;
}

export function computeLots(params: {
  entry: number;
  stop: number;
  pipSize: number;
  equity: number;
  riskPerTrade: number;
  pipValuePerLot: number;
  lotStep?: number;
}) {
  const stopPipsValue = stopPips(params.entry, params.stop, params.pipSize);
  const risk = riskAmount(params.equity, params.riskPerTrade);
  const lots = risk / (stopPipsValue * params.pipValuePerLot);
  return {
    stopPips: stopPipsValue,
    riskAmount: risk,
    lots: roundLotSize(lots, params.lotStep ?? 0.01)
  };
}

export function findRecentSwingLevel(bars: Bar[], side: "buy" | "sell") {
  if (side === "buy") {
    return Math.min(...bars.map((b) => b.low));
  }
  return Math.max(...bars.map((b) => b.high));
}
