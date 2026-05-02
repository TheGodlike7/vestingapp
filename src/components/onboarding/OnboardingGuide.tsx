import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/supabase";

declare global {
  interface Window {
    __vestingapp_replay_onboarding?: () => void;
  }
}

type OnboardingGuideProps = {
  userId: string | null;
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type OnboardingStep = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  selector?: string;
  icon: typeof Rocket;
};

const STORAGE_PREFIX = "vestingapp:onboarding-completed";
const OPEN_DELAY_MS = 800;
const SPOTLIGHT_PADDING = 10;
const CARD_WIDTH = 420;
const VIEWPORT_GAP = 18;

const steps: OnboardingStep[] = [
  {
    id: "welcome",
    kicker: "Quest briefing",
    title: "Welcome to VestingApp, Commander",
    body: "This dashboard is your launch room for token vesting: subscribe, create an organization, launch a project, then add holders and schedules.",
    icon: Rocket,
  },
  {
    id: "subscription",
    kicker: "Step 1",
    title: "Fuel the mission",
    body: "Activate the Starter plan so project creation and vesting management unlock for your workspace.",
    selector: '[data-onboard="subscription-cta"]',
    icon: ShieldCheck,
  },
  {
    id: "organization",
    kicker: "Step 2",
    title: "Build your home base",
    body: "Create your organization so future vesting projects have a clean operational home.",
    selector: '[data-onboard="organization-card"]',
    icon: Sparkles,
  },
  {
    id: "project",
    kicker: "Step 3",
    title: "Launch a vesting project",
    body: "Use the project action when your subscription is active. This creates the token vesting container your team will manage.",
    selector: '[data-onboard="new-project"]',
    icon: Rocket,
  },
  {
    id: "recipients",
    kicker: "Step 4",
    title: "Add holders and schedules",
    body: "Open a project to add recipients, configure vesting schedules, and let holders claim from the portal.",
    selector: '[data-onboard="project-list"]',
    icon: CheckCircle2,
  },
  {
    id: "complete",
    kicker: "Mission ready",
    title: "Your onboarding map is loaded",
    body: "You can replay this guide anytime from the help button. Now move through the quest at your own pace.",
    icon: Trophy,
  },
];

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isLocalOnboardingComplete(userId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(userId)) === "true";
  } catch {
    return false;
  }
}

function setLocalOnboardingComplete(userId: string): void {
  try {
    window.localStorage.setItem(storageKey(userId), "true");
  } catch {
    // Local storage can be unavailable in private browser contexts.
  }
}

export function OnboardingGuide({ userId }: OnboardingGuideProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const activeStep = steps[activeIndex];
  const progress = ((activeIndex + 1) / steps.length) * 100;

  const syncCompletionToDb = useCallback(async () => {
    if (!userId) return;

    await supabase
      .from("project_owners")
      .update({ onboarding_completed: true })
      .eq("id", userId);
  }, [userId]);

  const markComplete = useCallback(async () => {
    if (userId) {
      setLocalOnboardingComplete(userId);
      await syncCompletionToDb();
    }
  }, [syncCompletionToDb, userId]);

  const closeAndComplete = useCallback(async () => {
    setOpen(false);
    setSpotlightRect(null);
    await markComplete();
  }, [markComplete]);

  const replay = useCallback(() => {
    setActiveIndex(0);
    setSpotlightRect(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.__vestingapp_replay_onboarding = replay;
    return () => {
      if (window.__vestingapp_replay_onboarding === replay) {
        window.__vestingapp_replay_onboarding = undefined;
      }
    };
  }, [replay]);

  useEffect(() => {
    if (!userId) return;

    if (isLocalOnboardingComplete(userId)) {
      void syncCompletionToDb();
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const checkRemoteStatus = async () => {
        const { data, error } = await supabase
          .from("project_owners")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle<{ onboarding_completed: boolean | null }>();

        if (cancelled) return;

        if (!error && data?.onboarding_completed) {
          setLocalOnboardingComplete(userId);
          return;
        }

        setActiveIndex(0);
        setOpen(true);
      };

      void checkRemoteStatus();
    }, OPEN_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [syncCompletionToDb, userId]);

  const updateSpotlight = useCallback(() => {
    if (!open || !activeStep.selector) {
      setSpotlightRect(null);
      return;
    }

    const target = document.querySelector<HTMLElement>(activeStep.selector);
    if (!target) {
      setSpotlightRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    const paddedLeft = clamp(rect.left - SPOTLIGHT_PADDING, VIEWPORT_GAP, window.innerWidth - VIEWPORT_GAP);
    const paddedTop = clamp(rect.top - SPOTLIGHT_PADDING, VIEWPORT_GAP, window.innerHeight - VIEWPORT_GAP);
    const paddedRight = clamp(rect.right + SPOTLIGHT_PADDING, VIEWPORT_GAP, window.innerWidth - VIEWPORT_GAP);
    const paddedBottom = clamp(rect.bottom + SPOTLIGHT_PADDING, VIEWPORT_GAP, window.innerHeight - VIEWPORT_GAP);

    setSpotlightRect({
      top: paddedTop,
      left: paddedLeft,
      width: Math.max(56, paddedRight - paddedLeft),
      height: Math.max(48, paddedBottom - paddedTop),
    });
  }, [activeStep.selector, open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(updateSpotlight);
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [open, updateSpotlight]);

  const overlayRects = useMemo<CSSProperties[]>(() => {
    if (!spotlightRect) {
      return [{ inset: 0 }];
    }

    const right = spotlightRect.left + spotlightRect.width;
    const bottom = spotlightRect.top + spotlightRect.height;

    return [
      { top: 0, left: 0, width: "100%", height: spotlightRect.top },
      { top: spotlightRect.top, left: 0, width: spotlightRect.left, height: spotlightRect.height },
      { top: spotlightRect.top, left: right, right: 0, height: spotlightRect.height },
      { top: bottom, left: 0, width: "100%", bottom: 0 },
    ];
  }, [spotlightRect]);

  const cardStyle = useMemo<CSSProperties>(() => {
    if (!spotlightRect) {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const belowTop = spotlightRect.top + spotlightRect.height + VIEWPORT_GAP;
    const aboveTop = spotlightRect.top - 300 - VIEWPORT_GAP;
    const top = belowTop + 300 < window.innerHeight ? belowTop : Math.max(VIEWPORT_GAP, aboveTop);
    const left = clamp(
      spotlightRect.left + spotlightRect.width / 2 - CARD_WIDTH / 2,
      VIEWPORT_GAP,
      window.innerWidth - CARD_WIDTH - VIEWPORT_GAP,
    );

    return { left, top, width: CARD_WIDTH };
  }, [spotlightRect]);

  const ActiveIcon = activeStep.icon;

  const goNext = async () => {
    if (activeIndex === steps.length - 1) {
      await closeAndComplete();
      return;
    }
    setActiveIndex((current) => current + 1);
  };

  const goBack = () => {
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  return (
    <>
      <button
        type="button"
        onClick={replay}
        className="fixed bottom-5 right-5 z-[70] flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(271_100%_64%/0.38)] bg-[hsl(265_35%_10%/0.9)] text-foreground shadow-2xl backdrop-blur-xl transition hover:border-[hsl(var(--accent))]"
        title="Replay onboarding"
        aria-label="Replay onboarding"
      >
        <CircleHelp className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {overlayRects.map((style, index) => (
              <motion.div
                key={index}
                className="fixed bg-[hsl(265_45%_4%/0.76)] backdrop-blur-[2px]"
                style={style}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            ))}

            {spotlightRect && (
              <motion.div
                className="pointer-events-none fixed rounded-2xl border border-[hsl(var(--accent))] shadow-[0_0_0_1px_hsl(157_87%_51%/0.35),0_0_42px_hsl(271_100%_64%/0.48)]"
                style={spotlightRect}
                layout
              />
            )}

            <motion.section
              className="fixed w-[min(calc(100vw-2rem),420px)] overflow-hidden rounded-2xl border border-[hsl(265_40%_24%)] bg-[hsl(265_35%_8%/0.96)] text-foreground shadow-2xl backdrop-blur-xl"
              style={cardStyle}
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              role="dialog"
              aria-modal="true"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[hsl(265_40%_18%)]">
                <motion.div
                  className="h-full bg-linear-to-r from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--primary))]"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="relative p-5">
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(271_100%_64%/0.26)] bg-[hsl(271_100%_64%/0.11)]">
                      <ActiveIcon className="h-5 w-5 text-[hsl(var(--accent))]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-[hsl(var(--accent))]">
                        {activeStep.kicker}
                      </p>
                      <h2 className="font-display text-xl font-bold leading-tight text-foreground">
                        {activeStep.title}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeAndComplete}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-[hsl(265_40%_18%)] hover:text-foreground"
                    aria-label="Close onboarding"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="relative mt-4 text-sm leading-6 text-muted-foreground">
                  {activeStep.body}
                </p>

                <div className="relative mt-5 flex items-center gap-2">
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === activeIndex
                          ? "w-8 bg-[hsl(var(--accent))]"
                          : index < activeIndex
                            ? "w-4 bg-[hsl(var(--primary))]"
                            : "w-4 bg-[hsl(265_40%_24%)]"
                      }`}
                      aria-label={`Go to onboarding step ${index + 1}`}
                    />
                  ))}
                </div>

                <div className="relative mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={activeIndex === 0}
                    className="flex items-center gap-2 rounded-xl border border-[hsl(265_40%_22%)] px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white transition"
                    style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-purple)" }}
                  >
                    {activeIndex === steps.length - 1 ? "Finish quest" : "Next"}
                    {activeIndex === steps.length - 1 ? (
                      <Trophy className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
