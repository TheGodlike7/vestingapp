import { useEffect, useRef, useState } from "react";
import { Wallet, Settings, Send, TrendingUp } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Wallet,
    title: "Connect Wallet",
    desc: "Connect any Solana wallet—Phantom, Backpack, Solflare, or Ledger. No KYC, no accounts, just your keys.",
    color: "hsl(var(--primary))",
    progress: 100,
  },
  {
    num: "02",
    icon: Settings,
    title: "Configure Schedule",
    desc: "Set cliff duration, linear unlock period, total token amount, and recipient addresses. Preview the vesting curve in real-time.",
    color: "hsl(var(--accent))",
    progress: 68,
  },
  {
    num: "03",
    icon: Send,
    title: "Deploy On-Chain",
    desc: "Sign a single transaction. Vesting contract is deployed directly on Solana devnet or mainnet with full transparency.",
    color: "hsl(var(--primary))",
    progress: 45,
  },
  {
    num: "04",
    icon: TrendingUp,
    title: "Claim & Monitor",
    desc: "Recipients claim vested tokens anytime via our dashboard. You track everything—unlock events, claimed amounts, and schedules.",
    color: "hsl(var(--accent))",
    progress: 22,
  },
];

function ProgressBar({ value, color }: { value: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setStarted(true);
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="progress-bar h-1.5 w-full rounded-full bg-[hsl(265_44%_15%)]">
      <div
        className="h-full rounded-full transition-all ease-out"
        style={{
          width: started ? `${value}%` : "0%",
          transitionDuration: "1.4s",
          background: `linear-gradient(90deg, ${color}, hsl(157 87% 51%))`,
          boxShadow: `0 0 10px ${color}80`,
        }}
      />
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-36 overflow-hidden">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-125 h-125 bg-[hsl(157_87%_51%/0.06)] rounded-full blur-[100px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(157_87%_51%/0.3)] bg-[hsl(157_87%_51%/0.08)] mb-6">
            <div className="glow-dot" />
            <span className="text-xs font-semibold text-[hsl(var(--accent))] uppercase tracking-widest">How It Works</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight">
            Live on Solana in{" "}
            <span className="gradient-text">four steps</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg font-body leading-relaxed">
            No smart contract expertise needed. VestingApp handles the complexity so you can focus on your protocol.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-4xl mx-auto">
          {steps.map(({ num, icon: Icon, title, desc, color, progress }) => (
            <div key={num} className="glass-card rounded-2xl p-9 group transition-all duration-300 hover:border-[hsl(271_100%_64%/0.3)]">
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-display font-bold"
                  style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
                >
                  {num}
                </div>
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}18`, border: `1px solid ${color}33` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-body mb-5">{desc}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Step completion</span>
                  <span style={{ color }}>{progress}%</span>
                </div>
                <ProgressBar value={progress} color={color} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
