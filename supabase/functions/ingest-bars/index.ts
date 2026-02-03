import { createAdminClient } from "../_shared/supabase.ts";
import { SYMBOLS, TIMEFRAMES } from "../_shared/constants.ts";
import { fetchTwelveDataBars, formatSymbol } from "../_shared/twelveData.ts";
import { startJob, finishJob } from "../_shared/job.ts";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

Deno.serve(async () => {
  const jobId = await startJob("ingest-bars");
  let rowsProcessed = 0;
  let creditsUsed = 0;

  try {
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!apiKey) throw new Error("Missing TWELVE_DATA_API_KEY");

    const supabase = createAdminClient();
    const outputSize = Number(Deno.env.get("TWELVE_DATA_OUTPUTSIZE") ?? 10);

    for (const symbol of SYMBOLS) {
      for (const tf of TIMEFRAMES) {
        const interval = tf === "H1" ? "1h" : "4h";
        const response = await fetchTwelveDataBars({ symbol: formatSymbol(symbol), interval, outputsize: outputSize, apikey: apiKey });
        creditsUsed += 1;

        if (response.status !== "ok" || !response.values) {
          await supabase.from("data_quality_events").insert({
            symbol,
            tf,
            event_type: "integrity_fail",
            severity: "warn",
            details: { message: response.message ?? "Unknown error" }
          });
          await sleep(8000);
          continue;
        }

        const bars = response.values.map((bar) => ({
          symbol,
          tf,
          time: new Date(bar.datetime + "Z").toISOString(),
          open: Number(bar.open),
          high: Number(bar.high),
          low: Number(bar.low),
          close: Number(bar.close),
          volume: bar.volume ? Number(bar.volume) : null,
          source: "twelve_data",
          ingested_at: new Date().toISOString()
        }));

        const { error } = await supabase.from("bars_raw").upsert(bars, { onConflict: "symbol,tf,time" });
        if (error) {
          await supabase.from("data_quality_events").insert({
            symbol,
            tf,
            event_type: "integrity_fail",
            severity: "critical",
            details: { message: error.message }
          });
        } else {
          rowsProcessed += bars.length;
        }

        await sleep(8000);
      }
    }

    await finishJob({ id: jobId, rows: rowsProcessed, credits: creditsUsed });
    return new Response(JSON.stringify({ ok: true, rowsProcessed, creditsUsed }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    await finishJob({ id: jobId, rows: rowsProcessed, credits: creditsUsed, errorSummary: (error as Error).message });
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
