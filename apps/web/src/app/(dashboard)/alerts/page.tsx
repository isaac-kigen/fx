import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getDashboardSnapshot } from "../../../lib/server-data";

export default async function AlertsPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="page-grid">
      <Card>
        <CardHeader><CardTitle>Notification events</CardTitle></CardHeader>
        <CardContent>
          <table className="data-table">
            <thead><tr><th>Type</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {snapshot.notifications.length ? snapshot.notifications.map((event) => (
                <tr key={event.id}><td>{event.type}</td><td>{event.status}</td><td>{event.createdAt}</td></tr>
              )) : <tr><td colSpan={3}>No notification events.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
