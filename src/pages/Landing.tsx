import { motion, useScroll, useTransform } from "framer-motion";
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
  Sparkles,
  Clock,
  Award,
  Users,
  Scale,
  Menu,
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
import { useToast } from "@/components/ui/use-toast";
import {
  fetchPlansFromApi,
  getAllPlans,
  type PlanFeature,
} from "@/lib/plans";
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

type BillingCycle = "monthly" | "annually";

const Landing = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const planSignupPath = (plan: PlanFeature) => {
    const tier =
      plan.id === "enterprise"
        ? "enterprise"
        : plan.id === "professional"
        ? "pro"
        : "starter";
    const next = encodeURIComponent("/onboarding/trial");
    return `/register?plan=${tier}&next=${next}`;
  };

  // Pricing CTAs → sign up (then plan selection / trial onboarding)
  const handlePlanSelect = (plan: PlanFeature) => {
    if (plan.id === "enterprise") {
      toast({
        title: "Enterprise Plan",
        description:
          "Our sales team will contact you to discuss custom enterprise solutions.",
        variant: "default",
      });
      navigate("/contact");
      return;
    }

    if (isAuthenticated) {
      navigate("/onboarding/trial");
      return;
    }

    navigate(planSignupPath(plan));
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
