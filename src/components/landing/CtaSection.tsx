import { ArrowRight, Twitter, Github, MessageCircle } from "lucide-react";
export default function CtaSection() {
  return (
    <section className="relative py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(271_100%_64%/0.12)] via-transparent to-[hsl(157_87%_51%/0.08)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(271_100%_64%/0.4)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(157_87%_51%/0.3)] to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[hsl(271_100%_64%/0.1)] rounded-full blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(271_100%_64%/0.3)] bg-[hsl(271_100%_64%/0.08)] mb-6">
            <div className="glow-dot" />
            <span className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-widest">Launch Today</span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
            Ready to vest on Solana?
          </h2>
          <p className="text-muted-foreground text-lg font-body leading-relaxed mb-12">
            Join protocols already using VestingApp to manage their locked tokens.
            Deploy your first schedule in minutes, no code required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <button
              onClick={() => window.location.href = '/login'}
              className="btn-accent group flex items-center justify-center gap-2 px-9 py-4 rounded-xl text-base font-bold"
            >
              Start Vesting Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => window.location.href = '/subscription'}
              className="btn-outline flex items-center justify-center gap-2 px-9 py-4 rounded-xl text-base font-semibold"
            >
              View Pricing
            </button>
          </div>
          <div className="flex justify-center items-center gap-6">
            <a href="https://twitter.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium group">
              <Twitter className="w-4 h-4 group-hover:text-[hsl(var(--primary))] transition-colors" />
              Twitter
            </a>
            <a href="https://github.com/TheGodlike7/vestingapp" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium group">
              <Github className="w-4 h-4 group-hover:text-[hsl(var(--primary))] transition-colors" />
              GitHub
            </a>
            <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium group">
              <MessageCircle className="w-4 h-4 group-hover:text-[hsl(var(--primary))] transition-colors" />
              Discord
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
