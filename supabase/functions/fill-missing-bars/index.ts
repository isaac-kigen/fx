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

const floorToTf = (timeMs: number, tfMs: number) => Math.floor(timeMs / tfMs) * tfMs;

type MissingRange = { startMs: number; endMs: number };

function buildMissingRanges(missingTimes: number[], tfMs: number): MissingRange[] {
  if (missingTimes.length === 0) return [];
  const sorted = [...missingTimes].sort((a, b) => a - b);
  const ranges: MissingRange[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr - prev === tfMs) {
      prev = curr;
      continue;
    }
    ranges.push({ startMs: start, endMs: prev });
    start = curr;
    prev = curr;
  }
  ranges.push({ startMs: start, endMs: prev });
  return ranges;
}

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

  const jobId = await startJob("fill-missing-bars");
  let rowsProcessed = 0;
  let creditsUsed = 0;
  let requestsMade = 0;
  let missingDetected = 0;

  try {
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!apiKey) throw new Error("Missing TWELVE_DATA_API_KEY");

    const supabase = createAdminClient();
    const requestDelayMs = Number(Deno.env.get("GAP_REQUEST_DELAY_MS") ?? 8000);
    const maxRequestsPerRun = Number(Deno.env.get("GAP_MAX_REQUESTS_PER_RUN") ?? 6);
    const maxOutputSize = Number(Deno.env.get("GAP_OUTPUTSIZE") ?? 5000);
    const maxFillBarsPerRun = Number(Deno.env.get("GAP_MAX_FILL_BARS_PER_RUN") ?? 120);

    let fillsUsed = 0;

    for (const symbol of SYMBOLS) {
      for (const tf of TIMEFRAMES) {
        if (requestsMade >= maxRequestsPerRun || fillsUsed >= maxFillBarsPerRun) break;

        const tfMs = tfSeconds[tf] * 1000;
        const latestClosedMs = floorToTf(Date.now(), tfMs) - tfMs;
        if (latestClosedMs <= 0) continue;

        const { data: rows, error } = await supabase
          .from("bars_raw")
          .select("time")
          .eq("symbol", symbol)
          .eq("tf", tf)
          .lte("time", new Date(latestClosedMs).toISOString())
          .order("time", { ascending: true });

        if (error || !rows || rows.length === 0) continue;

        const existing = new Set<number>();
        for (const row of rows) {
          existing.add(new Date(row.time).getTime());
        }

        const oldestMs = new Date(rows[0].time).getTime();
        const missingTimes: number[] = [];
        for (let t = oldestMs; t <= latestClosedMs; t += tfMs) {
          if (!existing.has(t)) missingTimes.push(t);
        }

        if (missingTimes.length === 0) continue;
        missingDetected += missingTimes.length;

        const quotaLeft = Math.max(0, maxFillBarsPerRun - fillsUsed);
        const targetMissing = missingTimes.slice(0, quotaLeft);
        if (targetMissing.length === 0) continue;

        const targetMissingSet = new Set(targetMissing);
        const ranges = buildMissingRanges(targetMissing, tfMs);
        const interval = tf === "H1" ? "1h" : "4h";

        for (const range of ranges) {
          if (requestsMade >= maxRequestsPerRun || fillsUsed >= maxFillBarsPerRun) break;

          const barsInRange = Math.floor((range.endMs - range.startMs) / tfMs) + 1;
          const outputsize = Math.max(1, Math.min(maxOutputSize, barsInRange + 4));

          const response = await fetchTwelveDataBars({
            symbol: formatSymbol(symbol),
            interval,
            outputsize,
            startDate: toTwelveDateUtc(new Date(range.startMs)),
            endDate: toTwelveDateUtc(new Date(range.endMs)),
            order: "ASC",
            apikey: apiKey
          });
          requestsMade += 1;
          creditsUsed += 1;

          if (response.status !== "ok" || !response.values || response.values.length === 0) {
            await supabase.from("data_quality_events").insert({
              symbol,
              tf,
              time: new Date(range.startMs).toISOString(),
              event_type: "gap",
              severity: "warn",
              details: {
                message: response.message ?? "Gap fill fetch returned empty/error",
                gap_start: new Date(range.startMs).toISOString(),
                gap_end: new Date(range.endMs).toISOString()
              }
            });
            continue;
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
            .filter((bar) => targetMissingSet.has(new Date(bar.time).getTime()))
            .slice(0, Math.max(0, maxFillBarsPerRun - fillsUsed));

          if (bars.length === 0) continue;

          const { error: upsertError } = await supabase
            .from("bars_raw")
            .upsert(bars, { onConflict: "symbol,tf,time" });

          if (upsertError) {
            await supabase.from("data_quality_events").insert({
              symbol,
              tf,
              time: new Date(range.startMs).toISOString(),
              event_type: "integrity_fail",
              severity: "critical",
              details: { message: upsertError.message }
            });
            continue;
          }

          rowsProcessed += bars.length;
          fillsUsed += bars.length;

          if (requestsMade < maxRequestsPerRun) {
            await sleep(requestDelayMs);
          }
        }
      }
    }

    await finishJob({ id: jobId, rows: rowsProcessed, credits: creditsUsed });
    return new Response(JSON.stringify({ ok: true, rowsProcessed, creditsUsed, requestsMade, missingDetected }), {
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
