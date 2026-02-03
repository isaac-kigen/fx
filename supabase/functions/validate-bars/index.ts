import { createAdminClient } from "../_shared/supabase.ts";
import { SYMBOLS, TIMEFRAMES } from "../_shared/constants.ts";
import { atr, type Bar } from "../_shared/indicators.ts";
import { startJob, finishJob } from "../_shared/job.ts";

const tfSeconds: Record<string, number> = { H1: 3600, H4: 14400 };

Deno.serve(async () => {
  const jobId = await startJob("validate-bars");
  let rowsProcessed = 0;

  try {
    const supabase = createAdminClient();
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
