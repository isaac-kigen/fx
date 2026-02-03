export type TwelveBar = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
};

export type TwelveResponse = {
  meta?: {
    symbol: string;
    interval: string;
    currency_base?: string;
    currency_quote?: string;
  };
  values?: TwelveBar[];
  status: "ok" | "error";
  message?: string;
  code?: number;
};

export type TwelveExchangeRate = {
  symbol: string;
  rate: number;
  timestamp: number;
  status?: string;
  message?: string;
};

export function formatSymbol(symbol: string) {
  if (symbol.includes("/")) return symbol;
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  return symbol;
}

export async function fetchTwelveDataBars(params: {
  symbol: string;
  interval: "1h" | "4h";
  outputsize: number;
  apikey: string;
}): Promise<TwelveResponse> {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", formatSymbol(params.symbol));
  url.searchParams.set("interval", params.interval);
  url.searchParams.set("outputsize", String(params.outputsize));
  url.searchParams.set("apikey", params.apikey);
  url.searchParams.set("format", "JSON");

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { status: "error", message: `HTTP ${res.status}` };
  }
  return (await res.json()) as TwelveResponse;
}

export async function fetchExchangeRate(params: { symbol: string; apikey: string }): Promise<TwelveExchangeRate> {
  const url = new URL("https://api.twelvedata.com/exchange_rate");
  url.searchParams.set("symbol", formatSymbol(params.symbol));
  url.searchParams.set("apikey", params.apikey);
  url.searchParams.set("format", "JSON");

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { symbol: params.symbol, rate: NaN, timestamp: Date.now() / 1000, status: "error", message: `HTTP ${res.status}` };
  }
  return (await res.json()) as TwelveExchangeRate;
}
