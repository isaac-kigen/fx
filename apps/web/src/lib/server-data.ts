import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";

const getSupabaseServer = async () => {
  const serverClient = await createSupabaseServerClient();
  if (serverClient) return serverClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

export type DashboardSnapshot = {
  health: {
    lastIngest: string | null;
    lastValidate: string | null;
    lastSignals: string | null;
    pendingNotifications: string | null;
  };
  risk: {
    equity: string | null;
    riskPerTrade: string | null;
    maxTotalRisk: string | null;
    openPositions: string | null;
  };
  intents: Array<{ id: string; symbol: string; side: string; entry: string; stop: string; lots: string; status: string }>;
  notifications: Array<{ id: string; type: string; status: string; createdAt: string }>;
  signals: Array<{ id: string; symbol: string; tf: string; side: string; entry: string; rr: string }>;
  executedTrades: Array<{ id: string; openedAt: string; resultR: string; pnl: string }>;
  analytics: {
    totalTrades: string | null;
    winRate: string | null;
    avgR: string | null;
    totalR: string | null;
  };
};

const emptySnapshot: DashboardSnapshot = {
  health: {
    lastIngest: null,
    lastValidate: null,
    lastSignals: null,
    pendingNotifications: null
  },
  risk: {
    equity: null,
    riskPerTrade: null,
    maxTotalRisk: null,
    openPositions: null
  },
  intents: [],
  notifications: [],
  signals: [],
  executedTrades: [],
  analytics: {
    totalTrades: null,
    winRate: null,
    avgR: null,
    totalR: null
  }
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return emptySnapshot;
  }

  const [jobRuns, accountState, settings, intents, notifications, signals, openPositions, executedTrades] = await Promise.all([
    supabase.from("job_runs").select("function_name, finished_at").order("finished_at", { ascending: false }).limit(10),
    supabase.from("account_state").select("equity").order("updated_at", { ascending: false }).limit(1),
    supabase.from("system_settings").select("risk_per_trade, max_total_risk").limit(1),
    supabase.from("trade_intents").select("id, suggested_entry, suggested_stop, suggested_lots, status, signals(symbol, side)").order("created_at", { ascending: false }).limit(8),
    supabase.from("notification_events").select("id, event_type, status, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("signals").select("id, symbol, tf, side, entry_price, rr_expected").order("created_at", { ascending: false }).limit(8),
    supabase.from("open_positions").select("id").eq("status", "open"),
    supabase.from("executed_trades").select("id, opened_at, result_r, pnl_amount").order("opened_at", { ascending: false }).limit(200)
  ]);

  const lastRun = (name: string) =>
    jobRuns.data?.find((row) => row.function_name === name)?.finished_at ?? null;

  const rValues = executedTrades.data?.map((trade) => Number(trade.result_r)).filter((r) => Number.isFinite(r)) ?? [];
  const totalR = rValues.reduce((sum, r) => sum + r, 0);
  const wins = rValues.filter((r) => r > 0).length;
  const totalTrades = rValues.length;

  return {
    health: {
      lastIngest: lastRun("ingest-bars"),
      lastValidate: lastRun("validate-bars"),
      lastSignals: lastRun("generate-signals"),
      pendingNotifications: notifications.data?.filter((n) => n.status !== "sent").length.toString() ?? null
    },
    risk: {
      equity: accountState.data?.[0]?.equity?.toString() ?? null,
      riskPerTrade: settings.data?.[0]?.risk_per_trade?.toString() ?? null,
      maxTotalRisk: settings.data?.[0]?.max_total_risk?.toString() ?? null,
      openPositions: openPositions.data?.length.toString() ?? null
    },
    intents: intents.data?.map((intent) => {
      const signal = Array.isArray(intent.signals) ? intent.signals[0] : intent.signals;
      return ({
      id: intent.id,
      symbol: signal?.symbol ?? "n/a",
      side: signal?.side ?? "n/a",
      entry: intent.suggested_entry?.toString() ?? "-",
      stop: intent.suggested_stop?.toString() ?? "-",
      lots: intent.suggested_lots?.toString() ?? "-",
      status: intent.status
    });
    }) ?? [],
    notifications: notifications.data?.map((event) => ({
      id: event.id,
      type: event.event_type,
      status: event.status,
      createdAt: event.created_at
    })) ?? [],
    signals: signals.data?.map((signal) => ({
      id: signal.id,
      symbol: signal.symbol,
      tf: signal.tf,
      side: signal.side,
      entry: signal.entry_price?.toString() ?? "-",
      rr: signal.rr_expected?.toString() ?? "-"
    })) ?? [],
    executedTrades: executedTrades.data?.slice(0, 10).map((trade) => ({
      id: trade.id,
      openedAt: trade.opened_at,
      resultR: trade.result_r?.toString() ?? "-",
      pnl: trade.pnl_amount?.toString() ?? "-"
    })) ?? [],
    analytics: {
      totalTrades: totalTrades ? totalTrades.toString() : null,
      winRate: totalTrades ? `${((wins / totalTrades) * 100).toFixed(1)}%` : null,
      avgR: totalTrades ? (totalR / totalTrades).toFixed(2) : null,
      totalR: totalTrades ? totalR.toFixed(2) : null
    }
  };
}
