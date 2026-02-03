import AuthCard from "../../components/AuthCard";

export default function AccessDeniedPage() {
  return (
    <div className="container grid" style={{ gap: 24 }}>
      <div className="card hero">
        <div>
          <div className="badge">Access Denied</div>
          <h1 style={{ margin: "12px 0 8px" }}>Unauthorized</h1>
          <p className="small">
            Your account is authenticated but not authorized for this dashboard. If you believe this is an error,
            contact the system administrator to assign the correct role.
          </p>
        </div>
        <AuthCard />
      </div>
    </div>
  );
}
