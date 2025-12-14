import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Target, Share2, Sparkles } from "lucide-react";

type Interest = {
  id: string;
  label: string;
};

const INTERESTS: Interest[] = [
  { id: "part-matching", label: "Part matching & identification" },
  { id: "inventory", label: "Inventory / stock lookup" },
  { id: "procurement", label: "Procurement & sourcing" },
  { id: "workshop", label: "Workshop / maintenance" },
  { id: "dealership", label: "Dealership / sales" },
  { id: "analytics", label: "Analytics & performance" },
];

const safeString = (value: unknown): string => (typeof value === "string" ? value : "");

const safeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];

type StepId = "company" | "goals" | "referral" | "review";

const STEP_META: Array<{
  id: StepId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  image: { src: string; fallbackSrc: string; alt: string; kicker: string; caption: string };
}> = [
  {
    id: "company",
    title: "Your workspace",
    description: "Company details to personalize your dashboard.",
    icon: Building2,
    image: {
      src: "https://images.unsplash.com/photo-1587614382340-3ec188b4e842?auto=format&fit=crop&w=1600&q=80",
      fallbackSrc: "/registerphoto.png",
      alt: "Industrial workshop",
      kicker: "Set up once",
      caption: "Your company details help tailor insights and recommendations.",
    },
  },
  {
    id: "goals",
    title: "Goals & interests",
    description: "Tell us what you want to achieve first.",
    icon: Target,
    image: {
      src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
      fallbackSrc: "/dashboard.png",
      alt: "Analytics dashboard",
      kicker: "Personalized",
      caption: "We’ll adapt your experience based on what matters to you.",
    },
  },
  {
    id: "referral",
    title: "Discovery",
    description: "Help us understand how you found SpareFinder.",
    icon: Share2,
    image: {
      src: "https://images.unsplash.com/photo-1573164713712-03790a178651?auto=format&fit=crop&w=1600&q=80",
      fallbackSrc: "/registerphoto.png",
      alt: "Team collaboration",
      kicker: "Improve onboarding",
      caption: "Your feedback helps us invest in the best channels.",
    },
  },
  {
    id: "review",
    title: "Review & finish",
    description: "Confirm details before continuing.",
    icon: Sparkles,
    image: {
      src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
      fallbackSrc: "/dashboard.png",
      alt: "Technology abstract",
      kicker: "Almost there",
      caption: "Finish setup, then pick a plan and start identifying parts.",
    },
  },
];

const OnboardingProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading, checkAuth } = useAuth();
  const { toast } = useToast();

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return typeof next === "string" && next.startsWith("/") ? next : "/onboarding/trial";
  }, [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefillLoading, setIsPrefillLoading] = useState(true);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState<string>("");
  const [companySize, setCompanySize] = useState<string>("");
  const [primaryGoal, setPrimaryGoal] = useState<string>("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [referralSource, setReferralSource] = useState<string>("");
  const [referralSourceOther, setReferralSourceOther] = useState<string>("");

  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = STEP_META[stepIndex];
  const progressValue = Math.round(((stepIndex + 1) / STEP_META.length) * 100);

  const [rightImageSrc, setRightImageSrc] = useState(STEP_META[0].image.src);

  // Prefill from backend profile (includes preferences) to avoid asking twice.
  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (isLoading) return;
      if (!user) return;

      try {
        const resp = await api.user.getProfile();
        const profile = (resp as any)?.data?.profile;
        const preferences = profile?.preferences ?? {};
        const onboarding = preferences?.onboarding ?? {};

        if (!isMounted) return;
        setCompany(safeString(profile?.company) || safeString(user.company) || "");
        setRole(safeString(onboarding.role));
        setCompanySize(safeString(onboarding.companySize));
        setPrimaryGoal(safeString(onboarding.primaryGoal));
        setSelectedInterests(safeStringArray(onboarding.interests));
        setReferralSource(safeString(onboarding.referralSource));
        setReferralSourceOther(safeString(onboarding.referralSourceOther));
      } catch {
        // ignore; we can still allow manual entry
        if (!isMounted) return;
        setCompany(user.company ?? "");
      } finally {
        if (!isMounted) return;
        setIsPrefillLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [isLoading, user]);

  // If already completed (company exists), skip.
  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (user.company && user.company.trim().length > 0) {
      navigate(nextPath, { replace: true });
    }
  }, [isLoading, user, nextPath, navigate]);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId]
    );
  };

  const canGoNext = () => {
    if (activeStep.id === "company") return !!company.trim();
    if (activeStep.id === "referral") return !!referralSource.trim() && (referralSource !== "other" || !!referralSourceOther.trim());
    return true;
  };

  const handleSubmit = async () => {
    const trimmedCompany = company.trim();
    if (!trimmedCompany) return;
    if (!referralSource.trim()) return;
    if (referralSource === "other" && !referralSourceOther.trim()) return;

    setIsSubmitting(true);
    try {
      await api.user.updateProfile({
        company: trimmedCompany,
        preferences: {
          onboarding: {
            role: role || undefined,
            companySize: companySize || undefined,
            primaryGoal: primaryGoal || undefined,
            interests: selectedInterests.length ? selectedInterests : undefined,
            referralSource: referralSource || undefined,
            referralSourceOther: referralSourceOther || undefined,
            completedAt: new Date().toISOString(),
          },
        },
      });

      // Store a dedicated record for admin analytics
      try {
        await api.user.submitOnboardingSurvey({
          company: trimmedCompany,
          role: role || undefined,
          companySize: companySize || undefined,
          primaryGoal: primaryGoal || undefined,
          interests: selectedInterests.length ? selectedInterests : undefined,
          referralSource,
          referralSourceOther: referralSource === "other" ? referralSourceOther : undefined,
        });
      } catch (err) {
        // Don't block onboarding completion if analytics insert fails; log + toast.
        console.warn("Onboarding survey insert failed:", err);
      }

      await checkAuth(); // refresh auth-context user.company
      navigate(nextPath, { replace: true });
      toast({ title: "All set", description: "Thanks — your preferences are saved." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleteDisabled = isSubmitting || isPrefillLoading || !company.trim();

  useEffect(() => {
    setRightImageSrc(activeStep.image.src);
  }, [activeStep.id]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
          <Card className="border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Quick onboarding</CardTitle>
                  <CardDescription>
                    Personalize your workspace in under a minute. You can edit this later in{" "}
                    <span className="font-medium">Settings</span>.
                  </CardDescription>
                </div>
                <div className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  Step <span className="font-semibold text-foreground">{stepIndex + 1}</span> / {STEP_META.length}
                </div>
              </div>
              <Progress value={progressValue} className="h-2 bg-muted/50" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  {React.createElement(activeStep.icon, { className: "h-5 w-5" })}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{activeStep.title}</div>
                  <div className="text-xs text-muted-foreground">{activeStep.description}</div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {activeStep.id === "company" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company name</Label>
                        <Input
                          id="company"
                          placeholder="e.g. BQI Tech, SpareFinder Garage, FleetWorks Ltd"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          autoComplete="organization"
                        />
                        <p className="text-xs text-muted-foreground">This becomes your workspace name in the dashboard.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Your role</Label>
                          <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner / Founder</SelectItem>
                              <SelectItem value="procurement">Procurement / Buyer</SelectItem>
                              <SelectItem value="mechanic">Mechanic / Technician</SelectItem>
                              <SelectItem value="manager">Operations / Fleet Manager</SelectItem>
                              <SelectItem value="sales">Sales / Dealership</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Company size</Label>
                          <Select value={companySize} onValueChange={setCompanySize}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Just me</SelectItem>
                              <SelectItem value="2-10">2–10</SelectItem>
                              <SelectItem value="11-50">11–50</SelectItem>
                              <SelectItem value="51-200">51–200</SelectItem>
                              <SelectItem value="200+">200+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeStep.id === "goals" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Primary goal</Label>
                        <Select value={primaryGoal} onValueChange={setPrimaryGoal}>
                          <SelectTrigger>
                            <SelectValue placeholder="What do you want to achieve first?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="faster-matching">Find the right parts faster</SelectItem>
                            <SelectItem value="reduce-costs">Reduce sourcing costs</SelectItem>
                            <SelectItem value="improve-accuracy">Improve match accuracy</SelectItem>
                            <SelectItem value="track-performance">Track performance & KPIs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label>Interests</Label>
                          <p className="mt-1 text-sm text-muted-foreground">Pick all that apply.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {INTERESTS.map((interest) => {
                            const checked = selectedInterests.includes(interest.id);
                            return (
                              <label
                                key={interest.id}
                                className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3 hover:bg-muted/30 transition-colors"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleInterest(interest.id)}
                                  className="mt-0.5"
                                />
                                <span className="text-sm">{interest.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeStep.id === "referral" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Where did you hear about SpareFinder?</Label>
                        <Select value={referralSource} onValueChange={setReferralSource}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google">Google / Search</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="friend">Friend / colleague</SelectItem>
                            <SelectItem value="blog">Blog / article</SelectItem>
                            <SelectItem value="event">Event / conference</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {referralSource === "other" ? (
                        <div className="space-y-2">
                          <Label htmlFor="referralOther">Please specify</Label>
                          <Input
                            id="referralOther"
                            placeholder="e.g. WhatsApp group, newsletter, partner"
                            value={referralSourceOther}
                            onChange={(e) => setReferralSourceOther(e.target.value)}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {activeStep.id === "review" ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <div className="text-sm font-semibold">Summary</div>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Company</span>
                            <span className="font-medium">{company || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Role</span>
                            <span className="font-medium">{role || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Company size</span>
                            <span className="font-medium">{companySize || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Primary goal</span>
                            <span className="font-medium">{primaryGoal || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Heard via</span>
                            <span className="font-medium">
                              {referralSource || "—"}
                              {referralSource === "other" && referralSourceOther ? `: ${referralSourceOther}` : ""}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Interests</span>
                            <span className="font-medium text-right">
                              {selectedInterests.length ? selectedInterests.join(", ") : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        By continuing, you’ll proceed to plan selection. You can update these answers later.
                      </p>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (stepIndex === 0) navigate(nextPath);
                    else setStepIndex((s) => Math.max(0, s - 1));
                  }}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {stepIndex === 0 ? "Skip for now" : "Back"}
                </Button>

                {activeStep.id === "review" ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isCompleteDisabled}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isSubmitting ? "Saving…" : "Finish & continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setStepIndex((s) => Math.min(STEP_META.length - 1, s + 1))}
                    disabled={isSubmitting || isPrefillLoading || !canGoNext()}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right-side visuals */}
          <div className="hidden lg:block">
            <div className="relative h-full min-h-[520px] overflow-hidden rounded-2xl border border-border bg-card/80 shadow-soft-elevated">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />

              <div className="absolute inset-0 p-6">
                <div className="relative h-full overflow-hidden rounded-xl border border-border bg-background/60">
                  <img
                    src={rightImageSrc}
                    alt={activeStep.image.alt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setRightImageSrc(activeStep.image.fallbackSrc)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-sm font-semibold">{activeStep.image.kicker}</div>
                    <div className="mt-1 text-xs opacity-95">{activeStep.image.caption}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingProfile;



