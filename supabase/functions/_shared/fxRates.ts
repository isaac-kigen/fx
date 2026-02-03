import { createAdminClient } from "./supabase.ts";
import { fetchExchangeRate } from "./twelveData.ts";

const TTL_MS = 10 * 60 * 1000;

export async function getExchangeRate(params: { pair: string; apiKey: string }) {
  const supabase = createAdminClient();
  const stateKey = `fx_rate:${params.pair}`;
  const { data: state } = await supabase.from("job_state").select("value").eq("key", stateKey).maybeSingle();
  const cached = state?.value as { rate?: number; fetched_at?: string } | undefined;

  if (cached?.rate && cached?.fetched_at) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < TTL_MS) {
      return cached.rate;
    }
  }

  const response = await fetchExchangeRate({ symbol: params.pair, apikey: params.apiKey });
  if (!response || !Number.isFinite(response.rate)) {
    throw new Error(`Exchange rate unavailable for ${params.pair}`);
  }

  await supabase.from("job_state").upsert({
    key: stateKey,
    value: { rate: response.rate, fetched_at: new Date().toISOString() }
  });

  return response.rate;
}

export async function getRateWithFallback(params: { pair: string; apiKey: string }) {
  try {
    return await getExchangeRate(params);
  } catch {
    const [base, quote] = params.pair.split("/");
    const inversePair = `${quote}/${base}`;
    const inverseRate = await getExchangeRate({ pair: inversePair, apiKey: params.apiKey });
    return 1 / inverseRate;
  }
}
