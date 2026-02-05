export function DashboardFooter() {
  return (
    <footer className="app-footer">
      <span>FX Signal Ops</span>
      <span>Realtime pipeline • audit • backfill • alerts</span>
      <span>{new Date().toLocaleDateString()}</span>
    </footer>
  );
}
