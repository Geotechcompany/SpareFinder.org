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
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, ArrowRight, Building2, Target, Share2, Sparkles } from "lucide-react";
import { PLAN_CONFIG } from "@/lib/plans";
import {
  parsePlanTierFromPath,
  resolveSelectedTier,
  savePendingPlan,
  trialLocationForTier,
} from "@/lib/pending-plan";

type ApiPayload = {
  success?: boolean;
  message?: string;
  error?: string;
};

const apiSucceeded = (res: ApiPayload | null | undefined): boolean =>
  Boolean(res?.success);

const apiMessage = (res: ApiPayload | null | undefined, fallback: string): string =>
  res?.message || res?.error || fallback;

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/** Create first workspace or rename/activate existing one (avoids 403 on duplicate create). */
const syncWorkspaceForOnboarding = async (companyName: string) => {
  const listRes = await withTimeout(
    api.workspaces.list({ bootstrap: false }),
    20000,
    "Loading workspaces"
  );
  if (!apiSucceeded(listRes)) {
    throw new Error(apiMessage(listRes, "Could not load workspaces"));
  }

  const workspaces = listRes?.data?.workspaces ?? [];
  const activeId =
    listRes?.data?.activeWorkspaceId ?? workspaces[0]?.id ?? null;

  if (activeId) {
    const updateRes = await withTimeout(
      api.workspaces.update(activeId, companyName),
      20000,
      "Updating workspace"
    );
    if (!apiSucceeded(updateRes)) {
      throw new Error(apiMessage(updateRes, "Could not update workspace"));
    }
    await api.workspaces.activate(activeId);
    return;
  }

  try {
    const createRes = await withTimeout(
      api.workspaces.create(companyName),
      20000,
      "Creating workspace"
    );
    if (apiSucceeded(createRes)) return;
    throw new Error(apiMessage(createRes, "Could not create workspace"));
  } catch (err) {
    const retryList = await api.workspaces.list({ bootstrap: true });
    const retryWorkspaces = retryList?.data?.workspaces ?? [];
    if (retryList?.success && retryWorkspaces.length > 0) {
      const id = retryList.data?.activeWorkspaceId ?? retryWorkspaces[0].id;
      const updateRes = await api.workspaces.update(id, companyName);
      if (!apiSucceeded(updateRes)) {
        throw new Error(apiMessage(updateRes, "Could not update workspace"));
      }
      await api.workspaces.activate(id);
      return;
    }
    throw err;
  }
};

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
      src: "/images/landing-cta-factory.png",
      fallbackSrc: "/welcome_banner.png",
      alt: "Industrial workspace and spare parts operations",
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
      src: "/welcome_banner.png",
      fallbackSrc: "/registerphoto.png",
      alt: "SpareFinder workspace preview",
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
      src: "/welcome_banner.png",
      fallbackSrc: "/images/landing-cta-factory.png",
      alt: "Maintenance team using SpareFinder in the field",
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
      src: "/registerphoto.png",
      fallbackSrc: "/images/landing-cta-factory.png",
      alt: "AI-powered spare parts identification",
      kicker: "Almost there",
      caption: "Finish setup, then pick a plan and start identifying parts.",
    },
  },
];

const OnboardingProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading, checkAuth } = useAuth();
  const { refreshWorkspaces, needsSetup, isLoading: workspaceLoading } =
    useWorkspace();
  const { toast } = useToast();

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return typeof next === "string" && next.startsWith("/") ? next : "/dashboard/billing";
  }, [searchParams]);

  const pendingTrialTier = useMemo(
    () => resolveSelectedTier(null, nextPath),
    [nextPath]
  );

  // Keep landing plan selection in sync when `plan` is only inside ?next=
  useEffect(() => {
    const tier = parsePlanTierFromPath(nextPath) ?? pendingTrialTier;
    if (!tier) return;
    savePendingPlan({
      tier,
      planName: PLAN_CONFIG[tier].name,
    });
  }, [nextPath, pendingTrialTier]);

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [rightImageSrc, setRightImageSrc] = useState(activeStep.image.src);

  useEffect(() => {
    setRightImageSrc(activeStep.image.src);
  }, [activeStep.id, activeStep.image.src]);

  // Instant prefill from auth user; enrich from profile API in background (non-blocking).
  useEffect(() => {
    if (!user) return;
    if (user.company?.trim()) setCompany(user.company.trim());

    let cancelled = false;
    void api.user
      .getProfile()
      .then((resp) => {
        if (cancelled) return;
        const profile = (resp as { data?: { profile?: Record<string, unknown> } })
          ?.data?.profile;
        const onboarding =
          (profile?.preferences as { onboarding?: Record<string, unknown> } | undefined)
            ?.onboarding ?? {};
        const profileCompany = safeString(profile?.company);
        if (profileCompany) setCompany(profileCompany);
        if (safeString(onboarding.role)) setRole(safeString(onboarding.role));
        if (safeString(onboarding.companySize))
          setCompanySize(safeString(onboarding.companySize));
        if (safeString(onboarding.primaryGoal))
          setPrimaryGoal(safeString(onboarding.primaryGoal));
        setSelectedInterests(safeStringArray(onboarding.interests));
        if (safeString(onboarding.referralSource))
          setReferralSource(safeString(onboarding.referralSource));
        if (safeString(onboarding.referralSourceOther))
          setReferralSourceOther(safeString(onboarding.referralSourceOther));
      })
      .catch(() => {
        /* manual entry is fine */
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Skip profile wizard only when workspace exists AND company profile is already set.
  useEffect(() => {
    if (isLoading || workspaceLoading) return;
    if (!user) return;
    const profileComplete = Boolean(user.company?.trim());
    if (!needsSetup && profileComplete) {
      const tier = pendingTrialTier ?? parsePlanTierFromPath(nextPath);
      if (tier && nextPath.includes("/onboarding/trial")) {
        navigate(trialLocationForTier(tier), { replace: true });
      } else {
        navigate(nextPath, { replace: true });
      }
    }
  }, [
    isLoading,
    workspaceLoading,
    user,
    needsSetup,
    nextPath,
    navigate,
    pendingTrialTier,
  ]);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId]
    );
  };

  const canGoNext = useMemo(() => {
    if (activeStep.id === "company") {
      return (
        !!company.trim() && !!role.trim() && !!companySize.trim()
      );
    }
    if (activeStep.id === "goals") {
      return !!primaryGoal.trim();
    }
    if (activeStep.id === "referral") {
      return (
        !!referralSource.trim() &&
        (referralSource !== "other" || !!referralSourceOther.trim())
      );
    }
    return true;
  }, [
    activeStep.id,
    company,
    role,
    companySize,
    primaryGoal,
    referralSource,
    referralSourceOther,
  ]);

  const handleSubmit = async () => {
    const trimmedCompany = company.trim();
    if (!trimmedCompany) return;
    if (!referralSource.trim()) return;
    if (referralSource === "other" && !referralSourceOther.trim()) return;

    setIsSubmitting(true);
    try {
      const profileRes = await withTimeout(
        api.user.updateProfile({
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
        }),
        25000,
        "Saving profile"
      );
      if (!apiSucceeded(profileRes)) {
        throw new Error(apiMessage(profileRes, "Could not save your profile"));
      }

      await syncWorkspaceForOnboarding(trimmedCompany);

      // Store a dedicated record for admin analytics (non-blocking)
      void api.user
        .submitOnboardingSurvey({
          company: trimmedCompany,
          role: role || undefined,
          companySize: companySize || undefined,
          primaryGoal: primaryGoal || undefined,
          interests: selectedInterests.length ? selectedInterests : undefined,
          referralSource,
          referralSourceOther: referralSource === "other" ? referralSourceOther : undefined,
        })
        .catch((err) => console.warn("Onboarding survey insert failed:", err));

      await withTimeout(refreshWorkspaces(), 20000, "Refreshing workspace");
      void checkAuth();

      const tier = pendingTrialTier ?? parsePlanTierFromPath(nextPath);
      if (tier && nextPath.includes("/onboarding/trial")) {
        navigate(trialLocationForTier(tier), { replace: true });
      } else {
        navigate(nextPath, { replace: true });
      }
      toast({ title: "All set", description: "Thanks — your preferences are saved." });
    } catch (err) {
      console.error("Onboarding save failed:", err);
      const description =
        err instanceof Error
          ? err.message
          : "We couldn’t save your profile. Check your connection and try again.";
      toast({
        variant: "destructive",
        title: "Could not save",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleteDisabled =
    isSubmitting ||
    !company.trim() ||
    !role.trim() ||
    !companySize.trim() ||
    !primaryGoal.trim() ||
    !referralSource.trim() ||
    (referralSource === "other" && !referralSourceOther.trim());

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex w-full max-w-none flex-1 flex-col gap-0 lg:grid lg:min-h-[100dvh] lg:grid-cols-2 lg:gap-0">
          <Card className="flex min-h-[100dvh] flex-col rounded-none border-0 border-border bg-card shadow-soft-elevated dark:bg-card/95 lg:h-full lg:min-h-0 lg:border-r lg:border-border lg:bg-card/90 lg:backdrop-blur-xl lg:shadow-none">
            <CardHeader className="shrink-0 space-y-2 px-4 pt-6 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
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
            <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-4 pb-6 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-dark text-white">
                  {React.createElement(activeStep.icon, { className: "h-5 w-5" })}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{activeStep.title}</div>
                  <div className="text-xs text-muted-foreground">{activeStep.description}</div>
                </div>
              </div>

              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
              <div key={activeStep.id} className="space-y-5">
                  {activeStep.id === "company" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="company">Workspace name</Label>
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
                          <Select value={role || undefined} onValueChange={setRole}>
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
                          <Select value={companySize || undefined} onValueChange={setCompanySize}>
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
                        <Select value={primaryGoal || undefined} onValueChange={setPrimaryGoal}>
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
                        <Select value={referralSource || undefined} onValueChange={setReferralSource}>
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
              </div>
              </div>

              <div className="mt-6 flex shrink-0 flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {stepIndex > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div className="hidden sm:block sm:w-auto" aria-hidden />
                )}

                {activeStep.id === "review" ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isCompleteDisabled}
                    className="w-full sm:w-auto bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark"
                  >
                    {isSubmitting ? "Saving…" : "Finish & continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setStepIndex((s) => Math.min(STEP_META.length - 1, s + 1))}
                    disabled={isSubmitting || !canGoNext}
                    className="w-full sm:w-auto bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right-side visuals: full viewport width on lg (50% grid column), edge-to-edge image */}
          <div className="relative hidden min-h-0 lg:flex lg:min-h-[100dvh]">
            <div className="relative h-full min-h-[100dvh] w-full overflow-hidden border-0 bg-card/80 lg:shadow-none">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-blue-500/10" />

              <div className="absolute inset-0 lg:p-0">
                <div className="relative h-full min-h-[100dvh] overflow-hidden border-0 bg-background/60 lg:rounded-none">
                  <img
                    src={rightImageSrc}
                    alt={activeStep.image.alt}
                    className="h-full w-full min-h-[100dvh] object-cover object-center"
                    loading="eager"
                    decoding="async"
                    onError={() => {
                      if (rightImageSrc !== activeStep.image.fallbackSrc) {
                        setRightImageSrc(activeStep.image.fallbackSrc);
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white lg:bottom-10 lg:left-10 lg:right-10 xl:bottom-14 xl:left-14 xl:right-14">
                    <div className="text-sm font-semibold">{activeStep.image.kicker}</div>
                    <div className="mt-1 text-xs opacity-95">{activeStep.image.caption}</div>
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



