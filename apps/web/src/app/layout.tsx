import "./globals.css";
import type { Metadata } from "next";
import Navbar from "../components/nav/Navbar";
import MobileNav from "../components/nav/MobileNav";

export const metadata: Metadata = {
  title: "FX Signal Ops",
  description: "Signal, sizing, and alert operations dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
