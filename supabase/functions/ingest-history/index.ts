import { createAdminClient } from "../_shared/supabase.ts";
import { SYMBOLS, TIMEFRAMES } from "../_shared/constants.ts";
import { fetchTwelveDataBars, formatSymbol } from "../_shared/twelveData.ts";
import { startJob, finishJob } from "../_shared/job.ts";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const tfSeconds: Record<(typeof TIMEFRAMES)[number], number> = {
  H1: 3600,
  H4: 14400
};

const toTwelveDateUtc = (date: Date) => date.toISOString().replace("T", " ").slice(0, 19);

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

  const jobId = await startJob("ingest-history");
  let rowsProcessed = 0;
  let creditsUsed = 0;

  try {
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!apiKey) throw new Error("Missing TWELVE_DATA_API_KEY");

    const supabase = createAdminClient();
    const requestDelayMs = Number(Deno.env.get("HISTORY_REQUEST_DELAY_MS") ?? 8000);
    const maxRequestsPerRun = Number(Deno.env.get("HISTORY_MAX_REQUESTS_PER_RUN") ?? 6);
    const maxOutputSize = Number(Deno.env.get("HISTORY_OUTPUTSIZE") ?? 5000);

    let requestsMade = 0;

    for (const symbol of SYMBOLS) {
      for (const tf of TIMEFRAMES) {
        if (requestsMade >= maxRequestsPerRun) break;

        const { data: oldestRows, error: oldestError } = await supabase
          .from("bars_raw")
          .select("time")
          .eq("symbol", symbol)
          .eq("tf", tf)
          .order("time", { ascending: true })
          .limit(1);

        if (oldestError || !oldestRows || oldestRows.length === 0) continue;

        const oldestTime = new Date(oldestRows[0].time);
        const tfMs = tfSeconds[tf] * 1000;
        const targetStart = new Date(oldestTime.getTime() - 365 * 24 * 3600 * 1000);
        let cursorEnd = new Date(oldestTime.getTime() - tfMs);

        while (cursorEnd.getTime() >= targetStart.getTime() && requestsMade < maxRequestsPerRun) {
          const remainingBars = Math.max(
            1,
            Math.floor((cursorEnd.getTime() - targetStart.getTime()) / tfMs) + 1
          );
          const outputsize = Math.max(1, Math.min(maxOutputSize, remainingBars));
          const interval = tf === "H1" ? "1h" : "4h";

          const response = await fetchTwelveDataBars({
            symbol: formatSymbol(symbol),
            interval,
            outputsize,
            endDate: toTwelveDateUtc(cursorEnd),
            order: "DESC",
            apikey: apiKey
          });
          requestsMade += 1;
          creditsUsed += 1;

          if (response.status !== "ok" || !response.values || response.values.length === 0) {
            await supabase.from("data_quality_events").insert({
              symbol,
              tf,
              time: cursorEnd.toISOString(),
              event_type: "integrity_fail",
              severity: "warn",
              details: { message: response.message ?? "History fetch returned empty/error" }
            });
            break;
          }

          const bars = response.values
            .map((bar) => ({
              symbol,
              tf,
              time: new Date(`${bar.datetime}Z`).toISOString(),
              open: Number(bar.open),
              high: Number(bar.high),
              low: Number(bar.low),
              close: Number(bar.close),
              volume: bar.volume ? Number(bar.volume) : null,
              source: "twelve_data",
              ingested_at: new Date().toISOString()
            }))
            .filter((bar) => {
              const time = new Date(bar.time).getTime();
              return time >= targetStart.getTime() && time < oldestTime.getTime();
            });

          if (bars.length === 0) break;

          const { error: upsertError } = await supabase
            .from("bars_raw")
            .upsert(bars, { onConflict: "symbol,tf,time" });

          if (upsertError) {
            await supabase.from("data_quality_events").insert({
              symbol,
              tf,
              time: cursorEnd.toISOString(),
              event_type: "integrity_fail",
              severity: "critical",
              details: { message: upsertError.message }
            });
            break;
          }

          rowsProcessed += bars.length;

          let oldestFetched = Number.POSITIVE_INFINITY;
          for (const bar of bars) {
            const t = new Date(bar.time).getTime();
            if (t < oldestFetched) oldestFetched = t;
          }
          cursorEnd = new Date(oldestFetched - tfMs);

          if (requestsMade < maxRequestsPerRun) {
            await sleep(requestDelayMs);
          }
        }
      }
    }

    await finishJob({ id: jobId, rows: rowsProcessed, credits: creditsUsed });
    return new Response(JSON.stringify({ ok: true, rowsProcessed, creditsUsed, requestsMade }), {
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
