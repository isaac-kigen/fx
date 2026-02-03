import PushSubscriptionCard from "../components/PushSubscriptionCard";
import JournalEntryCard from "../components/JournalEntryCard";
import { getDashboardSnapshot } from "../lib/server-data";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="container grid" style={{ gap: 24 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Missing configuration</h2>
          <p className="small">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run the dashboard.</p>
        </div>
      </div>
    );
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    redirect("/login");
  }
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", data.session.user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "trader")) {
    redirect("/access-denied");
  }
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="container grid" style={{ gap: 28 }}>
      <header className="grid" style={{ gap: 12 }}>
        <div className="badge">Production Readiness: Ops Console</div>
        <h1 style={{ fontSize: 32, margin: 0 }}>FX Signal Ops</h1>
        <p className="small">
          H1 execution + H4 bias. Deterministic signals, risk sizing, and multi-channel alerts.
        </p>
      </header>

      <section id="health" className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>System Health</h3>
          <div className="grid" style={{ gap: 8 }}>
            <div><strong>Last ingest:</strong> <span className="mono">{snapshot.health.lastIngest ?? "n/a"}</span></div>
            <div><strong>Last validate:</strong> <span className="mono">{snapshot.health.lastValidate ?? "n/a"}</span></div>
            <div><strong>Last signals:</strong> <span className="mono">{snapshot.health.lastSignals ?? "n/a"}</span></div>
            <div><strong>Pending notifications:</strong> <span className="mono">{snapshot.health.pendingNotifications ?? "n/a"}</span></div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Risk Controls</h3>
          <div className="grid" style={{ gap: 8 }}>
            <div><strong>Equity:</strong> <span className="mono">{snapshot.risk.equity ?? "n/a"}</span></div>
            <div><strong>Risk per trade:</strong> <span className="mono">{snapshot.risk.riskPerTrade ?? "n/a"}</span></div>
            <div><strong>Max total risk:</strong> <span className="mono">{snapshot.risk.maxTotalRisk ?? "n/a"}</span></div>
            <div><strong>Open positions:</strong> <span className="mono">{snapshot.risk.openPositions ?? "n/a"}</span></div>
          </div>
        </div>
      </section>

      <section id="intents" className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Latest Trade Intents</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Entry</th>
                <th>Stop</th>
                <th>Lots</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.intents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="small">No intents yet.</td>
                </tr>
              ) : (
                snapshot.intents.map((intent) => (
                  <tr key={intent.id}>
                    <td>{intent.symbol}</td>
                    <td>{intent.side}</td>
                    <td>{intent.entry}</td>
                    <td>{intent.stop}</td>
                    <td>{intent.lots}</td>
                    <td>{intent.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Notification Queue</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.notifications.length === 0 ? (
                <tr>
                  <td colSpan={3} className="small">No notification events.</td>
                </tr>
              ) : (
                snapshot.notifications.map((event) => (
                  <tr key={event.id}>
                    <td>{event.type}</td>
                    <td>{event.status}</td>
                    <td>{event.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="signals" className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recent Signals</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>TF</th>
                <th>Side</th>
                <th>Entry</th>
                <th>RR</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.signals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="small">No signals yet.</td>
                </tr>
              ) : (
                snapshot.signals.map((signal) => (
                  <tr key={signal.id}>
                    <td>{signal.symbol}</td>
                    <td>{signal.tf}</td>
                    <td>{signal.side}</td>
                    <td>{signal.entry}</td>
                    <td>{signal.rr}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PushSubscriptionCard />
      </section>

      <section id="analytics" className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>R-Multiple Analytics</h3>
          <div className="grid" style={{ gap: 8 }}>
            <div><strong>Total trades:</strong> {snapshot.analytics.totalTrades ?? "n/a"}</div>
            <div><strong>Win rate:</strong> {snapshot.analytics.winRate ?? "n/a"}</div>
            <div><strong>Average R:</strong> {snapshot.analytics.avgR ?? "n/a"}</div>
            <div><strong>Total R:</strong> {snapshot.analytics.totalR ?? "n/a"}</div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Executed Trades (Latest)</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Opened</th>
                <th>Result R</th>
                <th>PNL</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.executedTrades?.length ? (
                snapshot.executedTrades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{trade.openedAt}</td>
                    <td>{trade.resultR}</td>
                    <td>{trade.pnl}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="small">No executed trades yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="journal" className="grid grid-2">
        <JournalEntryCard />
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Journaling Tips</h3>
          <p className="small">Log executed trades with their intent ID to keep the R-multiple analytics accurate.</p>
        </div>
      </section>
    </div>
  );
}
