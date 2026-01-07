import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  ShieldCheck,
  BarChart,
  Globe,
  Zap,
  Cloud,
  Factory,
  Cpu,
  Database,
  Server,
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
import { useState, useEffect, useRef, useMemo } from "react";
import { useInView } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DemoOne } from "@/components/ui/demo";
import { DashboardScrollDemo } from "@/components/DashboardScrollDemo";
import { HowItWorks } from "@/components/ui/how-it-works";
import CoreValueStatsDemo from "@/components/CoreValueStatsDemo";
import StaggerTestimonialsDemo from "@/components/StaggerTestimonialsDemo";
import Marquee from "@/components/ui/marquee";
import IndustrialApplications from "@/components/IndustrialApplications";
import FAQDemo from "@/components/FAQDemo";
import Orb from "@/components/ui/Orb";
import { Scene } from "@/components/ui/hero-section";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { FeaturesSectionWithHoverEffects } from "@/components/ui/feature-section-with-hover-effects";
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

// Cookie consent component
const CookieConsent = () => {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-4 text-foreground shadow-soft-elevated backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/95"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          We use cookies to enhance your experience. By continuing to visit this
          site you agree to our use of cookies.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShow(false)}
            className="border-border text-muted-foreground hover:bg-muted dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => setShow(false)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-purple-500/40"
          >
            Accept All
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const loadImage = (url: string) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(url);
    img.onerror = (err) => reject(err);
  });
};

const Landing = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
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
  const { actualTheme } = useTheme();
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

    // Authenticated users can purchase directly via Stripe modal
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

  const features = useMemo(
    () => [
      {
        icon: Cpu,
        title: "AI-Powered Recognition",
        description:
          "Advanced computer vision models identify parts with 99.9% accuracy across 50+ industrial categories",
        image:
          "https://images.unsplash.com/photo-1639322537228-f710d8465a4d?auto=format&fit=crop&w=800",
      },
      {
        icon: Database,
        title: "Comprehensive Database",
        description:
          "Over 10 million parts from 1000+ manufacturers with detailed specifications and pricing",
        image:
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800",
      },
      {
        icon: Zap,
        title: "Instant Results",
        description:
          "Get complete part information, specifications, and supplier contacts in milliseconds",
        image:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800",
      },
      {
        icon: Cloud,
        title: "Multi-Format Support",
        description:
          "Upload images, PDFs, CAD files, or even capture photos directly from your mobile device",
        image:
          "https://images.unsplash.com/photo-1573164713712-03790a178651?auto=format&fit=crop&w=800",
      },
      {
        icon: Server,
        title: "Enterprise Integration",
        description:
          "REST APIs, webhook support, and seamless integration with ERP systems and inventory management",
        image:
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800",
      },
      {
        icon: ShieldCheck,
        title: "Quality Assurance",
        description:
          "Verified suppliers, authentic parts, and comprehensive warranty information to ensure reliability",
        image:
          "https://images.unsplash.com/photo-1587614382340-3ec188b4e842?auto=format&fit=crop&w=800",
      },
    ],
    []
  );

  const aiInterfaceImage =
    "https://images.unsplash.com/photo-1639322537228-f710d8465a4d?auto=format&fit=crop&w=1920";

  const pricingPlans = getAllPlans();

  useEffect(() => {
    const allImages = [aiInterfaceImage, ...features.map((f) => f.image)];

    Promise.all(
      allImages.map((url) =>
        loadImage(url).then(() => {
          setLoadedImages((prev) => new Set([...prev, url]));
        })
      )
    ).catch(console.error);
  }, [features]);

  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-black">
      <Header />

      {/* Primary H1 for SEO */}
      <h1 className="sr-only">
        SpareFinder – AI-powered industrial spare parts identification platform
      </h1>

      {/* Hero Section (DemoOne) */}
      <section className="relative mt-6 w-full overflow-visible pt-4 pb-8">
        {actualTheme === "light" && (
          <div className="pointer-events-none absolute inset-x-0 top-10 z-0 flex justify-center">
            <div className="h-[720px] w-full max-w-6xl">
              <Orb
                hoverIntensity={0.6}
                rotateOnHover
                hue={0}
                className="h-full w-full"
              />
            </div>
          </div>
        )}
        {actualTheme === "dark" && (
          <div className="pointer-events-none absolute inset-0 z-0">
            <Scene />
          </div>
        )}
        <div className="relative z-10">
          <DemoOne />
        </div>
      </section>

      {/* Dashboard Scroll Animation */}
      <section className="relative overflow-hidden bg-background dark:bg-black">
        <DashboardScrollDemo />
      </section>

      {/* Core Values Section */}
      <section className="relative overflow-hidden bg-background dark:bg-black">
        <CoreValueStatsDemo />
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-black dark:via-gray-900/50 dark:to-black" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#3A5AFE1A] blur-3xl dark:bg-purple-500/10" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#06B6D41A] blur-3xl dark:bg-blue-500/10" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center rounded-full border border-border bg-gradient-to-r from-[#3A5AFE14] via-[#06B6D414] to-transparent px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:border-purple-500/30 dark:from-purple-500/20 dark:to-blue-500/20 dark:text-purple-300"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary dark:text-purple-400" />
              <span>Powered by Advanced AI</span>
            </motion.div>
            <h2 className="mb-6 text-5xl font-bold tracking-tight text-foreground lg:text-6xl dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
              Core Capabilities
            </h2>
            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-muted-foreground">
              Revolutionary part identification technology that transforms how
              industrial teams work
            </p>
          </motion.div>

          <FeaturesSectionWithHoverEffects features={features} />
        </div>
      </section>

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
          <div className="absolute inset-0 bg-gradient-to-r from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-black dark:via-black/90 dark:to-black" />
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
        className="relative overflow-hidden bg-background py-24 px-4 sm:px-6 lg:px-8 dark:bg-black"
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#3A5AFE1A] blur-3xl dark:bg-purple-500/10" />
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
              className="mb-8 inline-flex items-center rounded-full border border-border bg-gradient-to-r from-[#3A5AFE14] via-[#06B6D414] to-transparent px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:border-purple-500/30 dark:from-purple-500/20 dark:to-blue-500/20 dark:text-purple-300"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary dark:text-purple-400" />
              <span>Customer Reviews</span>
            </motion.div>
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl dark:text-white">
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
              className="border-border text-foreground hover:bg-muted dark:border-purple-500/50 dark:text-white dark:hover:bg-purple-500/10"
            >
              <Link to="/reviews">View All Reviews</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How It Works section */}
      <HowItWorks />

      {/* Enhanced Pricing Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] py-20 dark:from-gray-900 dark:via-black dark:to-black">
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
            <DialogContent className="max-h-[90vh] max-w-[600px] overflow-y-auto border border-border bg-card text-foreground shadow-soft-elevated sm:max-w-[600px] dark:border-gray-700 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                  {selectedPlan
                    ? `Complete Your Payment for ${selectedPlan.name}`
                    : "Payment Required"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground dark:text-gray-300">
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
                    <div className="rounded-xl border border-border bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 p-4 dark:border-purple-500/30 dark:from-purple-900/20 dark:to-blue-900/20">
                      <h3 className="mb-2 text-lg font-semibold text-primary dark:text-purple-300">
                        Plan Summary
                      </h3>
                      <div className="flex items-center justify-between text-muted-foreground dark:text-gray-300">
                        <span>
                          {selectedPlan?.name} Plan (
                          {billingCycle === "annually" ? "Annual" : "Monthly"})
                        </span>
                        <span className="text-xl font-bold text-foreground dark:text-white">
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
                        <p className="text-muted-foreground dark:text-gray-300">
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
                          className="flex h-12 w-full items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-lg font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-purple-500/40 disabled:opacity-70"
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
                          className="w-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-70 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground/80 text-center">
                        By proceeding, you agree to our{" "}
                        <Link
                          to="/terms"
                          className="underline hover:text-primary dark:hover:text-purple-400"
                        >
                          Terms of Service
                        </Link>{" "}
                        and acknowledge our{" "}
                        <Link
                          to="/privacy"
                          className="underline hover:text-primary dark:hover:text-purple-400"
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
                    <h3 className="mb-2 text-xl font-semibold text-foreground dark:text-white">
                      No Plan Selected
                    </h3>
                    <p className="mb-6 text-muted-foreground dark:text-gray-400">
                      Please select a plan to proceed with payment.
                    </p>
                    <Button
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="bg-muted text-foreground hover:bg-muted/80 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
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

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl border border-border bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 p-10 shadow-soft-elevated backdrop-blur-xl sm:p-16 dark:border-white/10 dark:from-purple-900/50 dark:to-blue-900/50">
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground dark:text-white">
              Ready to Revolutionize Your Part Identification?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground dark:text-gray-300">
              Join hundreds of manufacturers already using our AI-powered
              platform
            </p>
            <div className="flex justify-center gap-4">
              <Button
                asChild
                className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6 text-lg font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-purple-500/40"
              >
                <Link to="/register">Start Free Trial</Link>
              </Button>
              <Button
                variant="outline"
                className="border-border px-8 py-6 text-lg font-medium text-foreground hover:bg-muted dark:border-gray-600 dark:text-white dark:hover:bg-white/10"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section (last content block before footer) */}
      <FAQDemo />

      <Footer />

      <CookieConsent />
    </div>
  );
};

export default Landing;
