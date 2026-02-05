import PushSubscriptionCard from "../../../components/PushSubscriptionCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function SettingsPage() {
  return (
    <div className="page-grid page-cols-2">
      <Card>
        <CardHeader><CardTitle>Theme settings</CardTitle></CardHeader>
        <CardContent className="list-stack">
          <p>Use the floating palette icon to switch Light, Dark, or System mode.</p>
          <p>Choose one of 16 primary color tiles to set accent color.</p>
          <p>Theme preferences are persisted in local storage.</p>
        </CardContent>
      </Card>
      <PushSubscriptionCard />
    </div>
  );
}
