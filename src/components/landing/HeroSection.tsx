import { ArrowRight, Shield, Zap, Users } from "lucide-react";

const stats = [
  { label: "TVL Locked",     value: "$2.4B+",  color: "text-[hsl(var(--accent))]"   },
  { label: "Protocols",      value: "340+",    color: "text-[hsl(var(--primary))]"  },
  { label: "Tokens Vested",  value: "18.7M+",  color: "text-[hsl(var(--accent))]"   },
  { label: "Uptime",         value: "99.99%",  color: "text-[hsl(var(--primary))]"  },
];

const badges = [
  { icon: Shield, text: "Audited & Secure"    },
  { icon: Zap,    text: "Solana-Native"        },
  { icon: Users,  text: "Trusted by 340+ DAOs" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        src="/hero-bg.mp4"
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(275_68%_5%/0.6)] via-transparent to-[hsl(275_68%_5%/0.8)]" />

      <div className="absolute inset-0 mesh-bg opacity-40" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[hsl(271_100%_64%/0.18)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[hsl(157_87%_51%/0.1)] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-32 left-16 w-2 h-2 bg-[hsl(var(--primary))] rounded-full opacity-60 animate-pulse-dot" />
      <div className="absolute top-48 left-32 w-1 h-1 bg-[hsl(var(--accent))] rounded-full opacity-40 animate-pulse-dot" style={{ animationDelay: "0.5s" }} />
      <div className="absolute top-64 right-20 w-2 h-2 bg-[hsl(var(--accent))] rounded-full opacity-50 animate-pulse-dot" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full opacity-40 animate-pulse-dot" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/3 right-12 w-20 h-20 border border-[hsl(271_100%_64%/0.2)] rounded-full animate-rotate-slow" />
      <div className="absolute bottom-1/3 left-8 w-12 h-12 border border-[hsl(157_87%_51%/0.15)] rounded-full animate-rotate-slow" style={{ animationDirection: "reverse" }} />

      <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl">
        <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-up animation-delay-100">
          {badges.map(({ icon: Icon, text }) => (
            <div key={text} className="stat-badge flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-muted-foreground">
              <Icon className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
              {text}
            </div>
          ))}
        </div>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tighter mb-6 animate-fade-up animation-delay-200">
          <span className="block text-foreground">Token Vesting</span>
          <span className="block shimmer-text mt-1">Reimagined</span>
          <span className="block text-foreground text-4xl md:text-5xl lg:text-6xl mt-2 font-semibold">for Solana</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-up animation-delay-300 font-body">
          Deploy bulletproof token vesting schedules on Solana in minutes. Trusted by leading DAOs, launchpads, and protocols worldwide.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-fade-up animation-delay-400">
          <button onClick={() => window.location.href = '/dashboard'} className="btn-accent group flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold">
            Launch Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="btn-outline flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold">
            View Docs
          </button>
        </div>

        <div className="glass-card rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-up animation-delay-500">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className={`font-display text-2xl md:text-3xl font-extrabold ${color}`}>{value}</span>
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[hsl(var(--background))] to-transparent pointer-events-none" />
    </section>
  );
}
