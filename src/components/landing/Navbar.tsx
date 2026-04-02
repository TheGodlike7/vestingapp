import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
  { label: "Claim Tokens", href: "/claim" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "py-3 bg-[hsl(275_68%_5%/0.85)] backdrop-blur-xl border-b border-[hsl(265_40%_20%/0.5)]" : "py-5 bg-transparent"}`}>
      <nav className="container mx-auto px-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            <Zap className="absolute inset-0 m-auto w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            Vesting<span className="gradient-text">App</span>
          </span>
        </a>
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a href={link.href} className="nav-item px-4 py-2 rounded-lg text-sm font-medium hover:bg-[hsl(265_44%_15%/0.6)] transition-all duration-200">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => window.location.href = '/login'} className="btn-outline px-5 py-2 rounded-lg text-sm font-semibold">
            Sign In
          </button>
          <button onClick={() => window.location.href = '/login'} className="btn-accent px-5 py-2 rounded-lg text-sm font-bold">
            Get Started
          </button>
        </div>
        <button className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>
      {mobileOpen && (
        <div className="md:hidden mx-4 mt-1 rounded-xl border border-[hsl(265_40%_20%/0.8)] bg-[hsl(275_68%_5%/0.98)] backdrop-blur-xl shadow-2xl">
          <ul className="flex flex-col gap-0.5 p-2 mb-0">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} onClick={() => setMobileOpen(false)} className="block px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(265_44%_15%/0.6)] transition-all">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 p-2 pt-0 border-t border-[hsl(265_40%_20%/0.5)] mt-1">
            <button onClick={() => window.location.href = '/login'} className="btn-outline w-full py-2 rounded-lg text-sm font-semibold">
              Sign In
            </button>
            <button onClick={() => window.location.href = '/login'} className="btn-accent w-full py-2 rounded-lg text-sm font-bold">
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
