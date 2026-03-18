import { Zap } from "lucide-react";

const links = {
  Product:   ["Features", "Pricing", "Dashboard", "API Docs", "Changelog"],
  Company:   ["About", "Blog", "Careers", "Press Kit"],
  Resources: ["Documentation", "SDK Reference", "GitHub", "Discord"],
  Legal:     ["Privacy Policy", "Terms of Service", "Security"],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-[hsl(265_40%_18%/0.5)] pt-24 pb-10 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(265_40%_25%/0.5)] to-transparent" />

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-2.5 mb-5">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-md opacity-40" />
                <Zap className="absolute inset-0 m-auto w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">
                Vesting<span className="gradient-text">App</span>
              </span>
            </a>
            <p className="text-muted-foreground text-sm font-body leading-relaxed max-w-[220px]">
              The professional token vesting infrastructure for the Solana ecosystem.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="font-display text-xs font-semibold text-foreground uppercase tracking-widest mb-5">
                {group}
              </h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-foreground text-sm font-body transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[hsl(265_40%_18%/0.4)] pt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-muted-foreground text-xs font-body">
            © 2025 VestingApp. All rights reserved. Built on{" "}
            <span className="text-[hsl(var(--accent))]">Solana</span>.
          </p>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <div className="glow-dot scale-75" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
