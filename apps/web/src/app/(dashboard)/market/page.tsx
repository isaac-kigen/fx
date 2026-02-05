import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

const pairs = ["EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "AUDUSD"];

export default function MarketPage() {
  return (
    <div className="page-grid page-cols-2">
      <Card>
        <CardHeader><CardTitle>Market watchlist</CardTitle></CardHeader>
        <CardContent>
          <table className="data-table">
            <thead><tr><th>Pair</th><th>Status</th><th>Bias</th></tr></thead>
            <tbody>
              {pairs.map((pair, i) => (
                <tr key={pair}><td>{pair}</td><td>{i % 2 === 0 ? "Tracking" : "Stable"}</td><td>{i % 3 === 0 ? "Bull" : "Bear"}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Session focus</CardTitle></CardHeader>
        <CardContent className="list-stack">
          <p>London open scan: Enabled</p>
          <p>NY overlap scan: Enabled</p>
          <p>Spread check guard: Active</p>
          <p>Slippage guard: Active</p>
        </CardContent>
      </Card>
    </div>
  );
}
