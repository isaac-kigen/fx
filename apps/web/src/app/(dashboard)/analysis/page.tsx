import { AnalysisChart } from "../../../components/dashboard/analysis-chart";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getDashboardSnapshot } from "../../../lib/server-data";

export default async function AnalysisPage() {
  const snapshot = await getDashboardSnapshot();
  const points = snapshot.executedTrades
    .map((item) => Number(item.resultR))
    .filter((v) => Number.isFinite(v));

  const cumulative = points.reduce<number[]>((acc, point, idx) => {
    const prev = idx === 0 ? 0 : acc[idx - 1];
    acc.push(Number((prev + point).toFixed(2)));
    return acc;
  }, []);

  const labels = cumulative.map((_, index) => `T${index + 1}`);

  return (
    <div className="page-grid">
      <Card>
        <CardHeader>
          <CardTitle>R-multiple trend</CardTitle>
        </CardHeader>
        <CardContent>
          {cumulative.length > 1 ? (
            <AnalysisChart points={cumulative} labels={labels} />
          ) : (
            <p className="muted">Not enough executed trades to draw trend.</p>
          )}
        </CardContent>
      </Card>
      <div className="stats-grid">
        <div className="stat-box"><span>Total trades</span><strong>{snapshot.analytics.totalTrades ?? "0"}</strong></div>
        <div className="stat-box"><span>Win rate</span><strong>{snapshot.analytics.winRate ?? "0%"}</strong></div>
        <div className="stat-box"><span>Average R</span><strong>{snapshot.analytics.avgR ?? "0"}</strong></div>
        <div className="stat-box"><span>Total R</span><strong>{snapshot.analytics.totalR ?? "0"}</strong></div>
      </div>
    </div>
  );
}
