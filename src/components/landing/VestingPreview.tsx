import { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, Calendar, ChevronRight } from "lucide-react";

const vestingRows = [
  { name: "Team Allocation",      amount: "12,500,000", token: "VEST",  pct: 78, status: "Vesting",  color: "#9945FF" },
  { name: "Seed Round Investors", amount: "8,000,000",  token: "VEST",  pct: 55, status: "Vesting",  color: "#9945FF" },
  { name: "Treasury Reserve",     amount: "25,000,000", token: "VEST",  pct: 33, status: "Cliff",    color: "#14F195" },
  { name: "Advisor Pool",         amount: "2,000,000",  token: "VEST",  pct: 91, status: "Claimable",color: "#14F195" },
  { name: "Ecosystem Fund",       amount: "15,000,000", token: "VEST",  pct: 18, status: "Pending",  color: "#9945FF" },
];

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setStarted(true);
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-1.5 w-32 rounded-full bg-[hsl(265_44%_15%)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all ease-out"
        style={{
          width: started ? `${pct}%` : "0%",
          transitionDuration: "1.2s",
          background: color,
          boxShadow: `0 0 8px ${color}88`,
        }}
      />
    </div>
  );
}

export default function VestingPreview() {
  const statusColor: Record<string, string> = {
    Vesting:   "bg-[hsl(271_100%_64%/0.15)] text-[hsl(var(--primary))] border-[hsl(271_100%_64%/0.3)]",
    Claimable: "bg-[hsl(157_87%_51%/0.15)] text-[hsl(var(--accent))] border-[hsl(157_87%_51%/0.3)]",
    Cliff:     "bg-[hsl(215_20%_65%/0.1)] text-muted-foreground border-[hsl(215_20%_65%/0.2)]",
    Pending:   "bg-[hsl(215_20%_65%/0.08)] text-muted-foreground border-[hsl(215_20%_65%/0.15)]",
  };

  return (
    <section className="relative py-36 overflow-hidden">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-150 h-150 bg-[hsl(271_100%_64%/0.06)] rounded-full blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(271_100%_64%/0.3)] bg-[hsl(271_100%_64%/0.08)] mb-6">
              <div className="glow-dot" />
              <span className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-widest">Live Dashboard</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight tracking-tight">
              Full visibility into{" "}
              <span className="gradient-text">every schedule</span>
            </h2>
            <p className="text-muted-foreground text-base md:text-lg font-body leading-relaxed mb-10">
              Monitor all active vesting contracts from a single control plane. Know exactly what's vested, what's claimable, and what's locked—in real time.
            </p>
            {[
              { icon: TrendingUp, text: "Interactive unlock charts with historical data" },
              { icon: Users,      text: "Manage 1 to 10,000+ recipients effortlessly"   },
              { icon: Calendar,   text: "Cliff & milestone alerts via email or webhook"  },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[hsl(157_87%_51%/0.12)] border border-[hsl(157_87%_51%/0.2)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[hsl(var(--accent))]" />
                </div>
                <span className="text-foreground text-sm font-medium font-body">{text}</span>
              </div>
            ))}
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary mt-6 flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white relative z-10"
            >
              <span className="relative z-10">Explore Dashboard</span>
              <ChevronRight className="w-4 h-4 relative z-10" />
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-[hsl(265_40%_20%/0.6)]">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[hsl(265_40%_20%/0.5)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(0_80%_60%)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(40_90%_60%)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(120_60%_50%)]" />
              <div className="ml-4 flex-1 h-5 bg-[hsl(265_44%_15%)] rounded-md" />
            </div>
            <div className="grid grid-cols-4 text-xs uppercase tracking-widest text-muted-foreground px-5 py-3 border-b border-[hsl(265_40%_20%/0.4)]">
              <span>Schedule</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Progress</span>
              <span className="text-right">Status</span>
            </div>
            {vestingRows.map(({ name, amount, token, pct, status, color }) => (
              <div
                key={name}
                className="grid grid-cols-4 items-center px-5 py-3.5 border-b border-[hsl(265_40%_20%/0.25)] hover:bg-[hsl(265_44%_15%/0.4)] transition-colors group"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground truncate max-w-30">{name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold" style={{ color }}>{amount}</p>
                  <p className="text-[10px] text-muted-foreground">{token}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <AnimatedBar pct={pct} color={color} />
                  <span className="text-[10px] text-muted-foreground">{pct}%</span>
                </div>
                <div className="flex justify-end">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor[status]}`}>
                    {status}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center px-5 py-3 text-xs text-muted-foreground">
              <span>5 of 24 schedules</span>
              <button className="text-[hsl(var(--accent))] font-semibold hover:underline">View all →</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
