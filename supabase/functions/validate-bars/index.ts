import { createAdminClient } from "../_shared/supabase.ts";
import { SYMBOLS, TIMEFRAMES } from "../_shared/constants.ts";
import { atr, type Bar } from "../_shared/indicators.ts";
import { startJob, finishJob } from "../_shared/job.ts";

const tfSeconds: Record<string, number> = { H1: 3600, H4: 14400 };

const shouldSkipDueToInterval = async (
  supabase: ReturnType<typeof createAdminClient>,
  functionName: string,
  minIntervalSeconds: number
) => {
  const { data, error } = await supabase
    .from("job_runs")
    .select("started_at")
    .eq("function_name", functionName)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.started_at) return false;
  const elapsedMs = Date.now() - new Date(data.started_at).getTime();
  return elapsedMs < minIntervalSeconds * 1000;
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

  const supabase = createAdminClient();
  const minIntervalSeconds = Number(Deno.env.get("VALIDATE_MIN_INTERVAL_SECONDS") ?? 3000);
  if (await shouldSkipDueToInterval(supabase, "validate-bars", minIntervalSeconds)) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "rate_limited" }), {
      status: 202,
      headers: { "Content-Type": "application/json" }
    });
  }

  const jobId = await startJob("validate-bars");
  let rowsProcessed = 0;

  try {
    const lookback = Number(Deno.env.get("VALIDATE_LOOKBACK") ?? 200);

    for (const symbol of SYMBOLS) {
      for (const tf of TIMEFRAMES) {
        const { data: rawBars, error } = await supabase
          .from("bars_raw")
          .select("time, open, high, low, close, volume, source")
          .eq("symbol", symbol)
          .eq("tf", tf)
          .order("time", { ascending: true })
          .limit(lookback);

        if (error || !rawBars || rawBars.length === 0) continue;

        const bars: Bar[] = rawBars.map((b) => ({
          time: b.time,
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close)
        }));

        const atr14 = atr(bars, 14);
        const clean: Array<Record<string, unknown>> = [];

        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i];
          let quality = 100;
          if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close) || bar.high < bar.low) {
            quality -= 60;
            await supabase.from("data_quality_events").insert({
              symbol,
              tf,
              time: bar.time,
              event_type: "integrity_fail",
              severity: "critical",
              details: { reason: "OHLC integrity check failed" }
            });
          }

          if (i > 0) {
            const prevTime = new Date(bars[i - 1].time).getTime();
            const currTime = new Date(bar.time).getTime();
            const expected = tfSeconds[tf] * 1000;
            if (currTime - prevTime !== expected) {
              quality -= 20;
              await supabase.from("data_quality_events").insert({
                symbol,
                tf,
                time: bar.time,
                event_type: "gap",
                severity: "warn",
                details: { gap_ms: currTime - prevTime }
              });
            }
          }

          const range = bar.high - bar.low;
          if (atr14[i] && range > atr14[i] * 6) {
            quality -= 20;
            await supabase.from("data_quality_events").insert({
              symbol,
              tf,
              time: bar.time,
              event_type: "outlier",
              severity: "warn",
              details: { range, atr: atr14[i] }
            });
          }

          clean.push({
            symbol,
            tf,
            time: bar.time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: rawBars[i].volume ? Number(rawBars[i].volume) : null,
            source: rawBars[i].source,
            quality_score: Math.max(0, quality),
            validated_at: new Date().toISOString()
          });
        }

        const { error: upsertError } = await supabase.from("bars_clean").upsert(clean, { onConflict: "symbol,tf,time" });
        if (!upsertError) rowsProcessed += clean.length;
      }
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
