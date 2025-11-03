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
import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { useInView } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DemoOne } from "@/components/ui/demo";
import { DashboardScrollDemo } from "@/components/DashboardScrollDemo";
import { HowItWorks } from "@/components/ui/how-it-works";
import CoreValueStatsDemo from "@/components/CoreValueStatsDemo";
import StaggerTestimonialsDemo from "@/components/StaggerTestimonialsDemo";
import IndustrialApplications from "@/components/IndustrialApplications";
import FAQDemo from "@/components/FAQDemo";
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

interface PricingPlan {
  name: string;
  price: {
    monthly: string;
    annual: string;
  };
  features: string[];
  cta: string;
  featured: boolean;
}

// Cookie consent component
const CookieConsent = () => {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-gray-300 text-sm">
          We use cookies to enhance your experience. By continuing to visit this
          site you agree to our use of cookies.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShow(false)}
            className="text-gray-400 border-gray-700 hover:bg-gray-800"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => setShow(false)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
  const [isAnnual, setIsAnnual] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();

  // Stripe Checkout function
  const processStripePayment = async (plan: PricingPlan) => {
    try {
      setIsProcessing(true);

      // Create Stripe checkout session
      const checkoutData = {
        plan: plan.name,
        amount: parseFloat(plan.price[isAnnual ? "annual" : "monthly"]),
        currency: "GBP",
        billing_cycle: "monthly",
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

  // Handle plan selection with Stripe integration
  const handlePlanSelect = async (plan: PricingPlan) => {
    if (
      typeof plan.name === "string" &&
      plan.name.toLowerCase().includes("enterprise")
    ) {
      // Enterprise plan - contact sales
      toast({
        title: "Enterprise Plan",
        description:
          "Our sales team will contact you to discuss custom enterprise solutions.",
        variant: "default",
      });
      return;
    }

    // Paid plans - show Stripe checkout confirmation
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

  const pricing: PricingPlan[] = getAllPlans().map((plan) => ({
    name: plan.name,
    price: {
      monthly: plan.price.toString(),
      annual: plan.price.toString(),
    },
    features: plan.features,
    cta:
      plan.id === "enterprise"
        ? "Contact Sales"
        : plan.popular
        ? "Go Professional"
        : "Get Started",
    featured: plan.popular,
  }));

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
    <div className="min-h-screen bg-black">
      <Header />

      {/* Hero Section (DemoOne) */}
      <section className="relative -mt-20 pt-0 pb-16 overflow-hidden w-full">
        <DemoOne />
      </section>

      {/* Dashboard Scroll Animation */}
      <section className="relative bg-black overflow-hidden">
        <DashboardScrollDemo />
      </section>

      {/* Core Values Section */}
      <section className="relative bg-black overflow-hidden">
        <CoreValueStatsDemo />
      </section>

      {/* Features Grid */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
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
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-sm text-purple-300 font-medium">
                Powered by Advanced AI
              </span>
            </motion.div>
            <h2 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-6">
              Core Capabilities
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
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
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black" />
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
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-300 uppercase text-sm tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <StaggerTestimonialsDemo />

      {/* FAQ Section */}
      <FAQDemo />

      {/* How It Works section */}
      <HowItWorks />

      {/* Enhanced Pricing Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] bg-repeat opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-black opacity-90" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/20 text-purple-400">
              Flexible Pricing
            </span>
            <h2 className="text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
              Start with our free tier and scale as you grow. All plans include
              core AI features.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {pricing.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`relative group rounded-2xl p-8 ${
                  plan.featured
                    ? "bg-gradient-to-b from-purple-900/30 to-blue-900/30 border-2 border-purple-500/30"
                    : "bg-gray-800/30 border border-gray-700/50"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-sm font-medium">
                    Most Popular
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-2xl font-semibold text-white mb-4">
                    {plan.name}
                  </h3>
                  <div className="mb-6">
                    <div className="flex items-center justify-center">
                      <span className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        £{plan.price.monthly}
                      </span>
                      {plan.price.monthly !== "Custom" && (
                        <span className="text-gray-400 ml-2">/mo</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center text-gray-300"
                      >
                        <div className="mr-2 rounded-full p-1 bg-green-500/10">
                          <Check className="h-4 w-4 text-green-400" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handlePlanSelect(plan)}
                    className={`w-full group relative overflow-hidden ${
                      plan.featured
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                    size="lg"
                  >
                    {plan.cta}
                    {plan.featured && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6 }}
                      />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <Dialog open={isPaymentModalOpen} onOpenChange={resetPaymentModal}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {selectedPlan
                    ? `Complete Your Payment for ${selectedPlan.name}`
                    : "Payment Required"}
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                  {selectedPlan
                    ? `Subscribe to ${selectedPlan.name} plan for £${
                        selectedPlan.price[isAnnual ? "annual" : "monthly"]
                      }/${isAnnual ? "year" : "month"}`
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
                    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-4 border border-purple-500/30">
                      <h3 className="text-lg font-semibold text-purple-300 mb-2">
                        Plan Summary
                      </h3>
                      <div className="flex justify-between items-center text-gray-300">
                        <span>
                          {selectedPlan?.name} Plan (
                          {isAnnual ? "Annual" : "Monthly"})
                        </span>
                        <span className="text-xl font-bold text-white">
                          £
                          {selectedPlan?.price[isAnnual ? "annual" : "monthly"]}
                          /{isAnnual ? "year" : "month"}
                        </span>
                      </div>
                      {isAnnual && (
                        <div className="text-sm text-green-400 mt-1">
                          💰 Save 20% with annual billing
                        </div>
                      )}
                    </div>

                    {/* Stripe Checkout Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-green-300 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Secure Payment via Stripe
                      </h3>

                      {/* Stripe Benefits */}
                      <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-xl p-4 border border-green-500/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center text-green-300">
                            <Shield className="w-4 h-4 mr-2" />
                            Bank-level security
                          </div>
                          <div className="flex items-center text-green-300">
                            <Lock className="w-4 h-4 mr-2" />
                            PCI DSS compliant
                          </div>
                          <div className="flex items-center text-green-300">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Multiple payment methods
                          </div>
                          <div className="flex items-center text-green-300">
                            <Globe className="w-4 h-4 mr-2" />
                            Global payment processing
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-gray-300">
                          🔒 You will be redirected to Stripe's secure payment
                          page to complete your payment.
                        </p>
                        <p className="text-gray-400 text-sm">
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
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white w-full h-12 text-lg font-semibold shadow-lg shadow-purple-500/25"
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
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full"
                        >
                          Cancel
                        </Button>
                      </div>

                      <p className="text-xs text-gray-500 text-center">
                        By proceeding, you agree to our{" "}
                        <Link
                          to="/terms"
                          className="underline hover:text-purple-400"
                        >
                          Terms of Service
                        </Link>{" "}
                        and acknowledge our{" "}
                        <Link
                          to="/privacy"
                          className="underline hover:text-purple-400"
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
                    className="text-center py-12"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Plan Selected
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Please select a plan to proceed with payment.
                    </p>
                    <Button
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-white"
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
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-3xl p-16 border border-white/10 backdrop-blur-xl">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Revolutionize Your Part Identification?
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Join hundreds of manufacturers already using our AI-powered
              platform
            </p>
            <div className="flex justify-center gap-4">
              <Button
                asChild
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6"
              >
                <Link to="/register">Start Free Trial</Link>
              </Button>
              <Button
                variant="outline"
                className="text-white border-gray-600 hover:bg-white/10 text-lg px-8 py-6"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <CookieConsent />
    </div>
  );
};

export default Landing;
