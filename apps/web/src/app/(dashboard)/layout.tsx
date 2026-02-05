import type { ReactNode } from "react";
import { SidebarNav } from "../../components/dashboard/sidebar-nav";
import { DashboardHeader } from "../../components/dashboard/dashboard-header";
import { DashboardFooter } from "../../components/dashboard/dashboard-footer";
import { ThemeSwitcherFab } from "../../components/theme/theme-switcher-fab";
import { requireDashboardAccess } from "../../lib/require-dashboard-access";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireDashboardAccess();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-kicker">FX OPS</span>
          <h2>Control Grid</h2>
        </div>
        <SidebarNav />
      </aside>
      <div className="app-main">
        <DashboardHeader />
        <main className="app-content">{children}</main>
        <DashboardFooter />
      </div>
      <ThemeSwitcherFab />
    </div>
  );
}
