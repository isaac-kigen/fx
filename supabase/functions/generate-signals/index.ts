import { createAdminClient } from "../_shared/supabase.ts";
import { SYMBOLS, STRATEGY_CONFIG, CORRELATION_GROUPS } from "../_shared/constants.ts";
import { computeTrend, h1Indicators, touchedValue, isOverextended, confirmationTrigger, computeStop, passesStopFloor, computeTp, h4StructureBlocks } from "../_shared/strategy.ts";
import { computeLots, computePipValue } from "../_shared/risk.ts";
import { startJob, finishJob } from "../_shared/job.ts";
import type { Bar } from "../_shared/indicators.ts";
import { getRateWithFallback } from "../_shared/fxRates.ts";

const fetchBars = async (supabase: ReturnType<typeof createAdminClient>, symbol: string, tf: "H1" | "H4", limit: number) => {
  const { data, error } = await supabase
    .from("bars_clean")
    .select("time, open, high, low, close")
    .eq("symbol", symbol)
    .eq("tf", tf)
    .order("time", { ascending: true })
    .limit(limit);

  if (error || !data) return [] as Bar[];
  return data.map((b) => ({
    time: b.time,
    open: Number(b.open),
    high: Number(b.high),
    low: Number(b.low),
    close: Number(b.close)
  }));
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (expectedSecret) {
    const suppliedSecret = req.headers.get("x-cron-secret");
    if (suppliedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  const jobId = await startJob("generate-signals");
  let rowsProcessed = 0;

  try {
    const supabase = createAdminClient();
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!apiKey) throw new Error("Missing TWELVE_DATA_API_KEY");

    const { data: settings } = await supabase.from("system_settings").select("risk_per_trade, max_total_risk, max_open_trades, min_rr").limit(1).single();
    const { data: account } = await supabase.from("account_state").select("equity, currency").order("updated_at", { ascending: false }).limit(1).single();
    const { data: openPositions } = await supabase.from("open_positions").select("symbol, risk_amount").eq("status", "open");
    const { data: instruments } = await supabase.from("instruments").select("symbol, pip_size, digits, contract_size, base_ccy, quote_ccy");

    if (!account) throw new Error("Missing account_state");
    if (!instruments || instruments.length === 0) throw new Error("Missing instruments");

    const totalOpenRisk = openPositions?.reduce((sum, pos) => sum + Number(pos.risk_amount), 0) ?? 0;
    const instrumentMap = new Map(instruments.map((inst) => [inst.symbol, inst]));

    for (const symbol of SYMBOLS) {
      const instrument = instrumentMap.get(symbol);
      if (!instrument) continue;

      const h4 = await fetchBars(supabase, symbol, "H4", STRATEGY_CONFIG.h4.bars);
      const h1 = await fetchBars(supabase, symbol, "H1", STRATEGY_CONFIG.h1.bars);
      if (h4.length < STRATEGY_CONFIG.h4.emaSlow || h1.length < STRATEGY_CONFIG.h1.emaSlow) continue;

      const lastH1 = h1[h1.length - 1];
      const stateKey = `last_signal:${symbol}`;
      const { data: state } = await supabase.from("job_state").select("value").eq("key", stateKey).maybeSingle();
      const lastProcessed = state?.value?.last_bar_time as string | undefined;
      if (lastProcessed && new Date(lastProcessed).getTime() >= new Date(lastH1.time).getTime()) {
        continue;
      }

      const trend = computeTrend(h4);
      if (trend === "none") {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const indicators = h1Indicators(h1);
      if (isOverextended(h1, indicators, trend)) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const touchedIndex = touchedValue(h1, indicators, trend);
      if (touchedIndex === null) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const confirmation = confirmationTrigger(h1, trend);
      if (!confirmation) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const entry = confirmation.entry;
      const atr14 = indicators.atr14[indicators.atr14.length - 1];
      const pipSize = Number(instrument.pip_size);
      const stop = computeStop(h1, trend, atr14, pipSize);
      if (!passesStopFloor(entry, stop, atr14, pipSize)) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const tp = computeTp(entry, stop, trend, settings?.min_rr ?? STRATEGY_CONFIG.minRR);
      if (h4StructureBlocks(h4, entry, tp, trend)) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      let quoteToAccountRate: number | undefined;
      if (instrument.quote_ccy !== account.currency && instrument.base_ccy !== account.currency) {
        const pair = `${instrument.quote_ccy}/${account.currency}`;
        try {
          quoteToAccountRate = await getRateWithFallback({ pair, apiKey });
        } catch (error) {
          await supabase.from("data_quality_events").insert({
            symbol,
            tf: "H1",
            event_type: "integrity_fail",
            severity: "warn",
            details: { message: `Missing FX rate ${pair}: ${(error as Error).message}` }
          });
          await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
          continue;
        }
      }

      const pipValue = computePipValue({
        instrument: {
          symbol: instrument.symbol,
          pip_size: Number(instrument.pip_size),
          digits: Number(instrument.digits),
          contract_size: Number(instrument.contract_size),
          base_ccy: instrument.base_ccy,
          quote_ccy: instrument.quote_ccy
        },
        entryPrice: entry,
        accountCurrency: account.currency,
        quoteToAccountRate
      });
      const sizing = computeLots({
        entry,
        stop,
        pipSize,
        equity: Number(account.equity),
        riskPerTrade: Number(settings?.risk_per_trade ?? STRATEGY_CONFIG.riskPerTrade),
        pipValuePerLot: pipValue
      });

      const maxTotalRisk = Number(settings?.max_total_risk ?? 0.015) * Number(account.equity);
      if (totalOpenRisk + sizing.riskAmount > maxTotalRisk) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const alreadyOpen = openPositions?.some((pos) => pos.symbol === symbol);
      if (alreadyOpen) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const groupName = Object.keys(CORRELATION_GROUPS).find((group) => CORRELATION_GROUPS[group].includes(symbol));
      if (groupName) {
        const groupSymbols = CORRELATION_GROUPS[groupName];
        const openGroupCount = openPositions?.filter((pos) => groupSymbols.includes(pos.symbol)).length ?? 0;
        if (openGroupCount >= 2) {
          await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
          continue;
        }
      }

      const expiresAt = new Date(new Date(lastH1.time).getTime() + STRATEGY_CONFIG.expiresHours * 3600 * 1000).toISOString();
      const { data: signal, error: signalError } = await supabase.from("signals").insert({
        symbol,
        tf: "H1",
        side: trend === "bull" ? "buy" : "sell",
        setup: STRATEGY_CONFIG.name,
        entry_type: confirmation.entryType,
        entry_price: entry,
        stop_price: stop,
        tp1_price: tp,
        rr_expected: settings?.min_rr ?? STRATEGY_CONFIG.minRR,
        confidence: 1,
        bar_time: lastH1.time,
        expires_at: expiresAt
      }).select("id").single();

      if (signalError || !signal) {
        await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
        continue;
      }

      const { data: intent, error: intentError } = await supabase.from("trade_intents").insert({
        signal_id: signal.id,
        status: "new",
        suggested_lots: sizing.lots,
        suggested_entry: entry,
        suggested_stop: stop,
        suggested_tp1: tp,
        risk_amount: sizing.riskAmount,
        stop_pips: sizing.stopPips
      }).select("id").single();

      if (!intentError && intent) {
        const dedupeKey = `${symbol}_H1_${trend}_${lastH1.time}_${STRATEGY_CONFIG.name}`;
        await supabase.from("notification_events").insert({
          event_type: "trade_intent_created",
          dedupe_key: dedupeKey,
          payload: {
            title: `TRADE ALERT: ${symbol} H1 ${trend === "bull" ? "BUY" : "SELL"}`,
            symbol,
            tf: "H1",
            side: trend === "bull" ? "BUY" : "SELL",
            entry,
            sl: stop,
            tp1: tp,
            rr: settings?.min_rr ?? STRATEGY_CONFIG.minRR,
            lots: sizing.lots,
            expires_at: expiresAt,
            url: `https://yourapp.com/signals/${signal.id}`
          },
          status: "pending"
        });
        rowsProcessed += 1;
      }

      await supabase.from("job_state").upsert({ key: stateKey, value: { last_bar_time: lastH1.time } });
    }

    await finishJob({ id: jobId, rows: rowsProcessed, credits: 0 });
    return new Response(JSON.stringify({ ok: true, rowsProcessed }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    await finishJob({ id: jobId, rows: rowsProcessed, credits: 0, errorSummary: (error as Error).message });
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
