import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getDashboardSnapshot } from "../../../lib/server-data";

export default async function JobsPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="page-grid page-cols-2">
      <Card>
        <CardHeader><CardTitle>Pipeline checkpoints</CardTitle></CardHeader>
        <CardContent className="list-stack">
          <p>Ingest bars: <strong>{snapshot.health.lastIngest ?? "n/a"}</strong></p>
          <p>Validate bars: <strong>{snapshot.health.lastValidate ?? "n/a"}</strong></p>
          <p>Generate signals: <strong>{snapshot.health.lastSignals ?? "n/a"}</strong></p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Execution notes</CardTitle></CardHeader>
        <CardContent className="list-stack">
          <p>History backfill runs independently with capped credits.</p>
          <p>Gap fill validates coverage to last closed candle.</p>
          <p>Notification worker runs continuously.</p>
        </CardContent>
      </Card>
    </div>
  );
}
