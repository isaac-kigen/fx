import Link from "next/link";
import { getDashboardSnapshot } from "../../lib/server-data";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export default async function OverviewPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="page-grid">
      <Card>
        <CardHeader>
          <Badge>Current Analysis Status</Badge>
          <CardTitle>Pipeline readiness</CardTitle>
          <CardDescription>Live overview from ingestion through alerts.</CardDescription>
        </CardHeader>
        <CardContent className="stats-grid">
          <div className="stat-box"><span>Last Ingest</span><strong>{snapshot.health.lastIngest ?? "n/a"}</strong></div>
          <div className="stat-box"><span>Last Validate</span><strong>{snapshot.health.lastValidate ?? "n/a"}</strong></div>
          <div className="stat-box"><span>Last Signals</span><strong>{snapshot.health.lastSignals ?? "n/a"}</strong></div>
          <div className="stat-box"><span>Pending Alerts</span><strong>{snapshot.health.pendingNotifications ?? "0"}</strong></div>
        </CardContent>
      </Card>

      <div className="page-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk controls</CardTitle>
          </CardHeader>
          <CardContent className="list-stack">
            <p>Equity: <strong>{snapshot.risk.equity ?? "n/a"}</strong></p>
            <p>Risk per trade: <strong>{snapshot.risk.riskPerTrade ?? "n/a"}</strong></p>
            <p>Max total risk: <strong>{snapshot.risk.maxTotalRisk ?? "n/a"}</strong></p>
            <p>Open positions: <strong>{snapshot.risk.openPositions ?? "0"}</strong></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick routes</CardTitle>
          </CardHeader>
          <CardContent className="quick-links">
            <Link href="/analysis"><Button>Open Analysis</Button></Link>
            <Link href="/quality"><Button variant="outline">Data Quality</Button></Link>
            <Link href="/history"><Button variant="outline">History Backfill</Button></Link>
            <Link href="/settings"><Button variant="ghost">Theme & Settings</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
