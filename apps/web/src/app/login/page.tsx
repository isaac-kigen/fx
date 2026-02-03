import AuthCard from "../../components/AuthCard";

export default function LoginPage() {
  return (
    <div className="container grid" style={{ gap: 24 }}>
      <div className="card hero">
        <div>
          <div className="badge">Secure Access</div>
          <h1 style={{ margin: "12px 0 8px" }}>FX Signal Ops</h1>
          <p className="small">Sign in to access the trading dashboard, signals, and journaling tools.</p>
        </div>
        <AuthCard />
      </div>
    </div>
  );
}
