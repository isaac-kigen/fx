const links = [
  { href: "#health", label: "Health" },
  { href: "#intents", label: "Intents" },
  { href: "#signals", label: "Signals" },
  { href: "#analytics", label: "R" },
  { href: "#journal", label: "Journal" }
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      {links.map((link) => (
        <a key={link.href} href={link.href} className="mobile-nav-link">
          {link.label}
        </a>
      ))}
    </nav>
  );
}
