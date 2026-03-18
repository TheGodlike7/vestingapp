import Navbar         from "@/components/landing/Navbar";
import HeroSection    from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import VestingPreview from "@/components/landing/VestingPreview";
import PricingSection from "@/components/landing/PricingSection";
import CtaSection     from "@/components/landing/CtaSection";
import Footer         from "@/components/landing/Footer";

export default function Index() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-foreground overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <VestingPreview />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}