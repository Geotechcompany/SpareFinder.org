import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  BarChart,
  Globe,
  Zap,
  Factory,
  TestTube2,
  Upload,
  Check,
  X,
  Target,
  Shield,
  Sparkles,
  Clock,
  Award,
  Users,
  Scale,
  Lock,
  Menu,
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroFrameScroll from "@/components/HeroFrameScroll";
import { DashboardScrollDemo } from "@/components/DashboardScrollDemo";
import { HowItWorks } from "@/components/ui/how-it-works";
import CoreValueStatsDemo from "@/components/CoreValueStatsDemo";
import CoreCapabilitiesStory from "@/components/CoreCapabilitiesStory";
import StaggerTestimonialsDemo from "@/components/StaggerTestimonialsDemo";
import Marquee from "@/components/ui/marquee";
import IndustrialApplications from "@/components/IndustrialApplications";
import FAQDemo from "@/components/FAQDemo";
import LandingFinalCta from "@/components/LandingFinalCta";
import { CookieConsent } from "@/components/CookieConsent";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import {
  fetchPlansFromApi,
  getAllPlans,
  formatPriceWithPeriod,
  type PlanFeature,
} from "@/lib/plans";
import { calculateAnnualPrice, ANNUAL_DISCOUNT_PERCENT } from "@/lib/plans";
import { PricingSection } from "@/components/ui/pricing-section";

interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface BenefitItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface CheckoutResponse {
  success: boolean;
  data?: {
    checkout_url: string;
    session_id: string;
  };
  error?: string;
}

type BillingCycle = "monthly" | "annually";

const Landing = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanFeature | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Stripe Checkout function
  const processStripePayment = async (plan: PlanFeature) => {
    try {
      setIsProcessing(true);

      // Create Stripe checkout session
      const isAnnual = billingCycle === "annually";
      const amount = isAnnual ? calculateAnnualPrice(plan.price) : plan.price;
      const checkoutData = {
        plan: plan.name,
        amount,
        currency: "GBP",
        billing_cycle: isAnnual ? "annual" : "monthly",
        trial_days: isAnnual ? 0 : (plan.trial?.days ?? 0),
        success_url: `${window.location.origin}/dashboard/billing?payment_success=true`,
        cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
      };

      const response = (await api.billing.createCheckoutSession(
        checkoutData
      )) as CheckoutResponse;

      if (response.success && response.data?.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error(response.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Stripe checkout error:", error);
      toast({
        title: "Checkout Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start checkout process",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  // Handle plan selection: require login first, then purchase inside app
  const handlePlanSelect = (plan: PlanFeature) => {
    if (!isAuthenticated) {
      const planParam =
        typeof plan.name === "string"
          ? encodeURIComponent(plan.name.toLowerCase())
          : "";
      navigate(
        planParam ? `/login?plan=${planParam}` : "/login"
      );
      return;
    }

    if (plan.id === "enterprise") {
      toast({
        title: "Enterprise Plan",
        description:
          "Our sales team will contact you to discuss custom enterprise solutions.",
        variant: "default",
      });
      return;
    }

    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  // Handle Stripe checkout
  const handleStripeCheckout = async () => {
    if (!selectedPlan) return;

    setIsPaymentModalOpen(false);
    await processStripePayment(selectedPlan);
  };

  // Reset modal state
  const resetPaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPlan(null);
    setIsProcessing(false);
  };

  const aiInterfaceImage =
    "https://images.unsplash.com/photo-1639322537228-f710d8465a4d?auto=format&fit=crop&w=1920";

  const [pricingPlans, setPricingPlans] = useState<PlanFeature[]>(() => getAllPlans());

  useEffect(() => {
    fetchPlansFromApi().then(setPricingPlans);
  }, []);

  return (
    <div className="landing-premium min-h-screen bg-background text-foreground">
      <Header overlay />

      {/* Hero — full-bleed under fixed nav; no top margin */}
      <section className="relative w-full overflow-visible">
        <HeroFrameScroll />
      </section>

      <main id="main-content" className="relative">

      {/* Dashboard Scroll Animation + product tour */}
      <section className="relative z-20 overflow-visible bg-background">
        <DashboardScrollDemo />
      </section>

      {/* Core values stats — restored after hero / dashboard block */}
      <section className="relative z-10 overflow-visible bg-background">
        <CoreValueStatsDemo />
      </section>

      {/* Core Capabilities — stacked scroll story (GSAP pin + rotate) */}
      <CoreCapabilitiesStory />

      {/* Industrial Applications */}
      <IndustrialApplications />

      {/* Stats Section */}
      <section className="relative py-20">
        <div className="absolute inset-0">
          <img
            src="/images/circuit-board-bg.jpg"
            className="w-full h-full object-cover opacity-20"
            alt="Circuit board background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-muted/20 to-background" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "1M+", label: "Parts Identified" },
              { value: "99.9%", label: "Accuracy Rate" },
              { value: "50+", label: "Industries Served" },
              { value: "24/7", label: "Global Support" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-6"
              >
                <div className="mb-2 text-5xl font-bold bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#06B6D4] bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="relative overflow-hidden bg-background py-24 px-4 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#3A5AFE1A] blur-3xl dark:bg-brand/10" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#06B6D41A] blur-3xl dark:bg-blue-500/10" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center rounded-full border border-border bg-card/80 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary dark:text-brand-light" />
              <span>Customer Reviews</span>
            </motion.div>
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl ">
              Loved by Professionals Worldwide
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              See what our customers are saying about SpareFinder. Click on any
              review to read more.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {/* Full-bleed marquee (break out of max-width container to touch page edges) */}
            <div className="relative left-1/2 w-screen -translate-x-1/2">
              <Marquee />
            </div>
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Button
              asChild
              variant="outline"
              className="border-border text-foreground hover:bg-muted dark:border-brand/50  dark:hover:bg-brand/10"
            >
              <Link to="/reviews">View All Reviews</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How It Works section */}
      <HowItWorks />

      {/* Enhanced Pricing Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] bg-repeat opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-[#F0F2F5]/90 to-[#E8EBF1]/95 opacity-95 dark:from-gray-900 dark:via-black dark:to-black" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <PricingSection
            plans={pricingPlans}
            billingCycle={billingCycle}
            onBillingCycleChange={setBillingCycle}
            onSelectPlan={handlePlanSelect}
                      />
        </div>
      </section>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <Dialog open={isPaymentModalOpen} onOpenChange={resetPaymentModal}>
            <DialogContent className="max-h-[90vh] max-w-[600px] overflow-y-auto border border-border bg-card text-foreground shadow-soft-elevated sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  {selectedPlan
                    ? `Complete Your Payment for ${selectedPlan.name}`
                    : "Payment Required"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground ">
                  {selectedPlan
                    ? (() => {
                        const isAnnual = billingCycle === "annually";
                        const amount = isAnnual
                          ? calculateAnnualPrice(selectedPlan.price)
                          : selectedPlan.price;
                        return `Subscribe to ${selectedPlan.name} plan for £${amount.toFixed(
                          2
                        )}/${isAnnual ? "year" : "month"}`;
                      })()
                    : "Please select a plan to proceed with payment."}
                </DialogDescription>
              </DialogHeader>

              <AnimatePresence mode="wait">
                {selectedPlan && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 py-4"
                  >
                    {/* Plan Summary */}
                    <div className="rounded-xl border border-border bg-primary/10 p-4">
                      <h3 className="mb-2 text-lg font-semibold text-primary dark:text-brand-light">
                        Plan Summary
                      </h3>
                      <div className="flex items-center justify-between text-muted-foreground ">
                        <span>
                          {selectedPlan?.name} Plan (
                          {billingCycle === "annually" ? "Annual" : "Monthly"})
                        </span>
                        <span className="text-xl font-bold text-foreground ">
                          {(() => {
                            const isAnnual = billingCycle === "annually";
                            const amount = selectedPlan
                              ? isAnnual
                                ? calculateAnnualPrice(selectedPlan.price)
                                : selectedPlan.price
                              : 0;
                            return `£${amount.toFixed(2)}/${
                              isAnnual ? "year" : "month"
                            }`;
                          })()}
                        </span>
                      </div>
                      {billingCycle === "annually" && (
                        <div className="text-sm text-green-400 mt-1">
                          💰 Save {ANNUAL_DISCOUNT_PERCENT}% with annual billing
                        </div>
                      )}
                    </div>

                    {/* Stripe Checkout Information */}
                    <div className="space-y-6">
                      <h3 className="flex items-center text-lg font-semibold text-emerald-600 dark:text-green-300">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Secure Payment via Stripe
                      </h3>

                      {/* Stripe Benefits */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-green-500/30 dark:bg-gradient-to-r dark:from-green-900/20 dark:to-emerald-900/20 dark:text-green-300">
                        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2" />
                            Bank-level security
                          </div>
                          <div className="flex items-center">
                            <Lock className="w-4 h-4 mr-2" />
                            PCI DSS compliant
                          </div>
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Multiple payment methods
                          </div>
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 mr-2" />
                            Global payment processing
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-muted-foreground ">
                          🔒 You will be redirected to Stripe's secure payment
                          page to complete your payment.
                        </p>
                        <p className="text-sm text-muted-foreground/80 dark:text-gray-400">
                          ✓ Your subscription will be activated instantly upon
                          successful payment
                          <br />
                          ✓ You'll receive a confirmation email with your
                          subscription details
                          <br />✓ Cancel anytime from your dashboard
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-4">
                        <Button
                          onClick={handleStripeCheckout}
                          disabled={isProcessing}
                          className="premium-button flex h-12 w-full items-center justify-center bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Redirecting to Stripe...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-5 h-5 mr-2" />
                              Proceed to Secure Payment
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={resetPaymentModal}
                          disabled={isProcessing}
                          className="w-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-70 dark:border-gray-600  dark:hover:bg-gray-800"
                        >
                          Cancel
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground/80 text-center">
                        By proceeding, you agree to our{" "}
                        <Link
                          to="/terms-of-service"
                          className="underline hover:text-primary dark:hover:text-brand-light"
                        >
                          Terms of Use
                        </Link>{" "}
                        and acknowledge our{" "}
                        <Link
                          to="/privacy-policy"
                          className="underline hover:text-primary dark:hover:text-brand-light"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </div>
                  </motion.div>
                )}

                {!selectedPlan && (
                  <motion.div
                    key="no-plan"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="py-12 text-center"
                  >
                    <h3 className="mb-2 text-xl font-semibold text-foreground ">
                      No Plan Selected
                    </h3>
                    <p className="mb-6 text-muted-foreground dark:text-gray-400">
                      Please select a plan to proceed with payment.
                    </p>
                    <Button
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="bg-muted text-foreground hover:bg-muted/80 dark:bg-gray-700 dark:hover:bg-gray-600 "
                    >
                      Cancel
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      <LandingFinalCta />

      {/* FAQ Section (last content block before footer) */}
      <FAQDemo />

      </main>

      <Footer />

      <CookieConsent />
    </div>
  );
};

export default Landing;
