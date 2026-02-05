import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function HistoryPage() {
  return (
    <div className="page-grid page-cols-2">
      <Card>
        <CardHeader><CardTitle>History ingest status</CardTitle></CardHeader>
        <CardContent className="list-stack">
          <p>Backfill window: oldest bar minus 1 year</p>
          <p>Request delay: controlled by `HISTORY_REQUEST_DELAY_MS`</p>
          <p>Credits cap: controlled by `HISTORY_MAX_REQUESTS_PER_RUN`</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Gap fill status</CardTitle></CardHeader>
        <CardContent className="list-stack">
          <p>Audits from oldest bar to latest closed candle.</p>
          <p>Fills only missing timestamps.</p>
          <p>Caps requests and bars per run.</p>
        </CardContent>
      </Card>
    </div>
  );
}
