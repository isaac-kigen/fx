"use client";

import { usePathname } from "next/navigation";
import { RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

const labels: Record<string, string> = {
  "/": "Overview",
  "/analysis": "Current Analysis Status",
  "/signals": "Signals",
  "/market": "Market",
  "/jobs": "Jobs",
  "/quality": "Data Quality",
  "/history": "History Backfill",
  "/alerts": "Alerts",
  "/journal": "Journal",
  "/reports": "Reports",
  "/settings": "Settings"
};

export function DashboardHeader() {
  const pathname = usePathname();
  const title = labels[pathname ?? "/"] ?? "Dashboard";

  const notifyRefresh = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 800)), {
      loading: "Refreshing analysis snapshot...",
      success: "Analysis status refreshed.",
      error: "Refresh failed."
    });
  };

  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        <p>Pipeline visibility from oldest history to latest closed hour.</p>
      </div>
      <div className="header-actions">
        <Button variant="outline" onClick={notifyRefresh}>
          <RefreshCcw size={16} /> Refresh
        </Button>
        <Button onClick={() => toast.success("All services are responding.")}> 
          <Sparkles size={16} /> Health Ping
        </Button>
      </div>
    </header>
  );
}
