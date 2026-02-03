import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "#health", label: "Health" },
  { href: "#intents", label: "Intents" },
  { href: "#signals", label: "Signals" },
  { href: "#analytics", label: "Analytics" },
  { href: "#journal", label: "Journal" }
];

export default function Navbar() {
  return (
    <header className="nav">
      <div className="nav-inner container">
        <div className="brand">
          <div className="badge">FX Ops</div>
          <span className="brand-title">Signal Desk</span>
        </div>
        <nav className="nav-links">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
