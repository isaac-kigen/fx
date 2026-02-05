import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getDashboardSnapshot } from "../../../lib/server-data";

export default async function SignalsPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="page-grid">
      <Card>
        <CardHeader>
          <CardTitle>Recent signals</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="data-table">
            <thead>
              <tr><th>Symbol</th><th>TF</th><th>Side</th><th>Entry</th><th>RR</th></tr>
            </thead>
            <tbody>
              {snapshot.signals.length ? snapshot.signals.map((signal) => (
                <tr key={signal.id}><td>{signal.symbol}</td><td>{signal.tf}</td><td>{signal.side}</td><td>{signal.entry}</td><td>{signal.rr}</td></tr>
              )) : <tr><td colSpan={5}>No signals yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
