import JournalEntryCard from "../../../components/JournalEntryCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function JournalPage() {
  return (
    <div className="page-grid page-cols-2">
      <JournalEntryCard />
      <Card>
        <CardHeader><CardTitle>Journaling quality checklist</CardTitle></CardHeader>
        <CardContent className="list-stack">
          <p>Add intent ID for traceability.</p>
          <p>Write pre-trade thesis in one sentence.</p>
          <p>Log result in R and monetary PnL.</p>
          <p>Capture post-trade screenshot link.</p>
        </CardContent>
      </Card>
    </div>
  );
}
