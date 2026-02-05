import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import {
  Activity,
  AlertTriangle,
  BellRing,
  BookOpen,
  Bot,
  CandlestickChart,
  ChartSpline,
  Cog,
  Database,
  Radar,
  ScrollText
} from "lucide-react";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: Radar },
  { href: "/analysis", label: "Analysis", icon: ChartSpline },
  { href: "/signals", label: "Signals", icon: CandlestickChart },
  { href: "/market", label: "Market", icon: Activity },
  { href: "/jobs", label: "Jobs", icon: Bot },
  { href: "/quality", label: "Quality", icon: AlertTriangle },
  { href: "/history", label: "History", icon: Database },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Cog }
];
