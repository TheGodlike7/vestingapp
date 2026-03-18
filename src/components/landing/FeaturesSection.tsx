import { useEffect, useRef, useState } from "react";
import {
  Lock, BarChart2, Clock, Shuffle, Code, Globe
} from "lucide-react";

const features = [
  {
    icon:  Lock,
    title: "Non-Custodial Vaults",
    desc:  "Your tokens never leave the blockchain. Vesting contracts are 100% on-chain, audited, and immutable once deployed.",
    color: "from-[hsl(271_100%_64%/0.2)] to-[hsl(271_100%_64%/0.05)]",
    border:"border-[hsl(271_100%_64%/0.25)]",
    icon_color: "text-[hsl(var(--primary))]",
    glow: "hsl(271 100% 64% / 0.25)",
  },
  {
    icon:  BarChart2,
    title: "Real-Time Analytics",
    desc:  "Track cliff dates, unlock events, and vested amounts through a beautiful dashboard with live on-chain data.",
    color: "from-[hsl(157_87%_51%/0.2)] to-[hsl(157_87%_51%/0.05)]",
    border:"border-[hsl(157_87%_51%/0.25)]",
    icon_color: "text-[hsl(var(--accent))]",
    glow: "hsl(157 87% 51% / 0.25)",
  },
  {
    icon:  Clock,
    title: "Flexible Schedules",
    desc:  "Linear, cliff, milestone-based, or custom unlock curves. Design any vesting schedule your protocol needs.",
    color: "from-[hsl(271_100%_64%/0.15)] to-[hsl(265_54%_11%/0.6)]",
    border:"border-[hsl(271_100%_64%/0.2)]",
    icon_color: "text-[hsl(var(--primary))]",
    glow: "hsl(271 100% 64% / 0.2)",
  },
  {
    icon:  Shuffle,
    title: "Multi-Recipient",
    desc:  "Batch-create vesting accounts for entire teams, investor rounds, or airdrop campaigns in a single transaction.",
    color: "from-[hsl(157_87%_51%/0.15)] to-[hsl(265_54%_11%/0.6)]",
    border:"border-[hsl(157_87%_51%/0.2)]",
    icon_color: "text-[hsl(var(--accent))]",
    glow: "hsl(157 87% 51% / 0.2)",
  },
  {
    icon:  Code,
    title: "Developer SDK",
    desc:  "TypeScript SDK and REST APIs for seamless integration. Embed vesting into your dApp in under an hour.",
    color: "from-[hsl(271_100%_64%/0.15)] to-[hsl(265_54%_11%/0.6)]",
    border:"border-[hsl(271_100%_64%/0.2)]",
    icon_color: "text-[hsl(var(--primary))]",
    glow: "hsl(271 100% 64% / 0.2)",
  },
  {
    icon:  Globe,
    title: "Governance Ready",
    desc:  "Integrate vesting with SPL Governance, Realms, and custom DAOs to automate contributor compensation.",
    color: "from-[hsl(157_87%_51%/0.15)] to-[hsl(265_54%_11%/0.6)]",
    border:"border-[hsl(157_87%_51%/0.2)]",
    icon_color: "text-[hsl(var(--accent))]",
    glow: "hsl(157 87% 51% / 0.2)",
  },
];

function FeatureCard({
  icon: Icon, title, desc, color, border, icon_color, glow, index,
}: (typeof features)[0] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`glass-card rounded-2xl p-8 bg-gradient-to-br ${color} border ${border} group cursor-default
        transition-all duration-500 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{
        transitionDelay: `${index * 80}ms`,
        ["--card-glow" as string]: glow,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${glow}, 0 8px 32px ${glow}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} border ${border} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 ${icon_color}`} />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed font-body">{desc}</p>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-36 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[hsl(271_100%_64%/0.06)] rounded-full blur-[100px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(271_100%_64%/0.3)] bg-[hsl(271_100%_64%/0.08)] mb-6">
            <div className="glow-dot" />
            <span className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-widest">Platform Features</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight">
            Everything you need to{" "}
            <span className="gradient-text">vest at scale</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed font-body">
            A complete vesting infrastructure layer for the Solana ecosystem—from seed round to full decentralization.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
