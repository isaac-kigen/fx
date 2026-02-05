"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "../../lib/cn";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="side-nav" aria-label="Main">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={cn("side-link", isActive && "side-link-active")}>
            <Icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
