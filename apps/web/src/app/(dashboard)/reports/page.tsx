import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

const sections = [
  "Performance summary",
  "Risk heatmap",
  "Signal conversion",
  "Notification delivery"
];

export default function ReportsPage() {
  return (
    <div className="page-grid page-cols-2">
      {sections.map((name) => (
        <Card key={name}>
          <CardHeader><CardTitle>{name}</CardTitle></CardHeader>
          <CardContent>
            <p className="muted">Report widget placeholder for {name.toLowerCase()}.</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
