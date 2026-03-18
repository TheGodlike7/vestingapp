import { Check, Zap } from "lucide-react";

const features = [
  "Up to 2 active projects",
  "Up to 100 recipients per project",
  "All 4 vesting templates (Advisor, Employee, Investor, Custom)",
  "Recipient self-serve claim portal",
  "Real-time vesting dashboard",
  "Solana devnet & mainnet support",
  "Email support (48hr response)",
  "No percentage cut on tokens",
  "Network fees paid by your wallet only",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="relative py-36 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(271_100%_64%/0.3)] to-transparent" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-[hsl(157_87%_51%/0.05)] rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(157_87%_51%/0.3)] bg-[hsl(157_87%_51%/0.08)] mb-6">
            <div className="glow-dot" />
            <span className="text-xs font-semibold text-[hsl(var(--accent))] uppercase tracking-widest">Pricing</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight">
            Simple,{" "}
            <span className="gradient-text">transparent</span> pricing
          </h2>
          <p className="text-muted-foreground text-base md:text-lg font-body">
            No percentage cut on your tokens. Flat monthly fee. You only pay Solana network fees (~$0.00025 per transaction).
          </p>
        </div>

        <div className="flex justify-center">
          <div className="glass-card rounded-2xl p-10 border border-[hsl(271_100%_64%/0.4)] relative flex flex-col max-w-md w-full transition-all duration-300 hover:shadow-purple">
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-xs font-bold text-[hsl(275_68%_5%)]">
                <Zap className="w-3 h-3" />
                Flat Fee — No % Cut
              </div>
            </div>

            <div className="mb-8 text-center">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-3">Starter Plan</h3>
              <div className="flex items-baseline gap-1 justify-center mb-3">
                <span className="font-display text-6xl font-extrabold text-foreground">$99</span>
                <span className="text-muted-foreground text-lg">/month</span>
              </div>
              <p className="text-muted-foreground text-sm font-body">
                Everything you need to launch and manage token vesting on Solana.
              </p>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              {features.map((f, i) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground font-body">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${i === features.length - 1 ? 'text-[#9945FF]' : 'text-[hsl(var(--accent))]'}`} />
                  {i === features.length - 1 ? (
                    <span>
                      <span style={{
                        background: 'linear-gradient(90deg, #9945FF, #14F195, #00C2FF, #9945FF, #14F195, #9945FF)',
                        backgroundSize: '300% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        animation: 'chromatic 6s linear infinite',
                        fontWeight: '700',
                      }}>
                        No percentage cut on tokens
                      </span>
                      <style>{`
                        @keyframes chromatic {
                          0% { background-position: 0% 50%; }
                          100% { background-position: 300% 50%; }
                        }
                      `}</style>
                    </span>
                  ) : f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => window.location.href = '/login'}
              className="btn-primary w-full py-4 rounded-xl text-base font-bold text-white relative overflow-hidden"
            >
              <span className="relative z-10">Get Started — $99/month</span>
            </button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Paid monthly via USDC on Solana. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
