import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

const qualityRows = [
  { tf: "H1", coverage: "99.3%", gaps: 4, outliers: 2 },
  { tf: "H4", coverage: "99.8%", gaps: 1, outliers: 0 }
];

export default function QualityPage() {
  return (
    <div className="page-grid">
      <Card>
        <CardHeader><CardTitle>Bar coverage quality</CardTitle></CardHeader>
        <CardContent>
          <table className="data-table">
            <thead><tr><th>TF</th><th>Coverage</th><th>Gaps</th><th>Outliers</th></tr></thead>
            <tbody>
              {qualityRows.map((row) => (
                <tr key={row.tf}><td>{row.tf}</td><td>{row.coverage}</td><td>{row.gaps}</td><td>{row.outliers}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
