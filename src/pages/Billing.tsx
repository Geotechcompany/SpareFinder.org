import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Download,
  Check,
  Star,
  Calendar,
  DollarSign,
  Receipt,
  Crown,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Building,
  CheckCircle,
  AlertTriangle,
  Menu,
  Loader2,
  ArrowLeft,
  ExternalLink,
  X,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileSidebar from "@/components/MobileSidebar";
import { useDashboardLayout } from "@/contexts/DashboardLayoutContext";
import DashboardSkeleton from "@/components/DashboardSkeleton";

const Billing = () => {
  const [currentPlan, setCurrentPlan] = useState("free");
  const { inLayout } = useDashboardLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [billingData, setBillingData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle post-payment redirect
  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const paymentCancelled = searchParams.get("payment_cancelled");
    const sessionId = searchParams.get("session_id");
    const trialDeclined = searchParams.get("trial_declined");

    if (paymentSuccess === "true") {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated successfully.",
        variant: "default",
      });

      // Clear the URL parameters
      navigate("/dashboard/billing", { replace: true });
    } else if (paymentCancelled === "true") {
      toast({
        title: "Payment Cancelled",
        description:
          "Your payment was cancelled. You can try again at any time.",
        variant: "destructive",
      });

      // Clear the URL parameters
      navigate("/dashboard/billing", { replace: true });
    } else if (trialDeclined === "true") {
      toast({
        title: "Trial skipped",
        description:
          "You can start your 30-day free trial anytime from Billing.",
      });
      navigate("/dashboard/billing", { replace: true });
    } else if (sessionId) {
      // Handle Stripe checkout session success
      toast({
        title: "Processing Payment",
        description: "Please wait while we confirm your payment...",
        variant: "default",
      });

      // You could verify the session here
      setTimeout(() => {
        navigate("/dashboard/billing", { replace: true });
      }, 3000);
    }
  }, [searchParams, navigate, toast]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      if (!isMounted) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch billing info
        const billingResponse = await api.billing.getBillingInfo({
          signal: controller.signal,
        });

        if (isMounted && billingResponse) {
          setBillingData(billingResponse as any);
          setCurrentPlan((billingResponse as any).subscription?.tier || "free");

          // If the billing info already contains invoices, use them first
          const preloaded = (billingResponse as any).invoices as
            | any[]
            | undefined;
          if (preloaded && preloaded.length > 0) {
            const normalized = preloaded.map((inv: any) => ({
              id: inv.id,
              amount: Number(inv.amount ?? inv.total ?? 0),
              currency: String(inv.currency || "GBP").toUpperCase(),
              status: inv.status || "paid",
              date: inv.created_at || inv.created || new Date().toISOString(),
              invoice: inv.invoice_url || inv.hosted_invoice_url || "",
              description: inv.description || `Invoice ${inv.id}`,
            }));
            setInvoices(normalized);
          }
        }

        // Fetch invoices
        const invoicesResponse = await api.billing.getInvoices({
          signal: controller.signal,
        });

        if (isMounted && (invoicesResponse as any)) {
          const raw = (invoicesResponse as any).invoices || [];
          const normalized = raw.map((inv: any) => ({
            id: inv.id,
            amount: Number(inv.amount ?? inv.total ?? 0),
            currency: String(inv.currency || "GBP").toUpperCase(),
            status: inv.status || "paid",
            date: inv.created_at || inv.created || new Date().toISOString(),
            invoice: inv.invoice_url || inv.hosted_invoice_url || "",
            description: inv.description || `Invoice ${inv.id}`,
          }));
          setInvoices(normalized);
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load billing information";

          setError(errorMessage);

          toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
      controller.abort(); // Cancel any ongoing requests
    };
  }, []); // Empty dependency array ensures this runs only once

  const handlePlanChange = async (planId: string) => {
    try {
      // Starter (free) -> begin 30-day trial at £15/month via Stripe
      if (planId === "free") {
        const starter = plans.find((p) => p.id === "free");
        const checkoutResponse = await api.billing.createCheckoutSession({
          plan: "Starter",
          amount: 15,
          currency: "GBP",
          billing_cycle: "monthly",
          trial_days: 30,
          success_url: `${window.location.origin}/dashboard/billing?payment_success=true&tier=starter`,
          cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
        });

        if (checkoutResponse.success && checkoutResponse.data?.checkout_url) {
          window.location.href = checkoutResponse.data.checkout_url;
        } else {
          throw new Error("Failed to start Starter trial");
        }
        return;
      }

      // For paid plans, use Stripe checkout
      if (planId !== "free") {
        const selectedPlan = plans.find((p) => p.id === planId);
        if (!selectedPlan) {
          throw new Error("Invalid plan selected");
        }

        // Create Stripe checkout session
        const checkoutResponse = await api.billing.createCheckoutSession({
          plan: selectedPlan.name,
          amount: selectedPlan.price,
          currency: "GBP",
          billing_cycle: "monthly",
          success_url: `${window.location.origin}/dashboard/billing?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
        });

        if (checkoutResponse.data?.checkout_url) {
          // Redirect to Stripe checkout
          window.location.href = checkoutResponse.data.checkout_url;
        } else {
          throw new Error("Failed to create checkout session");
        }
      } else {
        // For free plan, update directly
        const response = await api.billing.updateSubscription(
          planId as "free" | "pro" | "enterprise"
        );

        if (response) {
          setCurrentPlan(planId);
          toast({
            title: "Subscription Updated",
            description: "Successfully downgraded to free plan",
          });
        }
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update subscription.",
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await api.billing.cancelSubscription();

      // Assuming the response indicates successful cancellation
      if (response) {
        setCurrentPlan("free");
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled.",
        });
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to cancel subscription.",
      });
    }
  };

  const plans = [
    {
      id: "free",
      name: "Starter / Basic",
      price: 12.99,
      period: "month",
      description: "For small users testing the service",
      features: [
        "20 image recognitions per month",
        "Basic search & match results",
        "Access via web portal only",
      ],
      popular: false,
      icon: Zap,
      color: "from-gray-600 to-gray-700",
      limit: "20 recognitions/month",
    },
    {
      id: "pro",
      name: "Professional / Business",
      price: 69.99,
      period: "month",
      description: "For SMEs managing spare parts more actively",
      features: [
        "500 recognitions per month",
        "Catalogue storage (part lists, drawings)",
        "API access for ERP/CMMS",
        "Analytics dashboard",
      ],
      popular: true,
      icon: Crown,
      color: "from-purple-600 to-blue-600",
      limit: "500 recognitions/month",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 460,
      period: "month",
      description: "For OEMs, large factories, distributors",
      features: [
        "Unlimited recognition",
        "Advanced AI customisation (train on their data)",
        "ERP/CMMS full integration",
        "Predictive demand analytics",
        "Dedicated support & SLA",
      ],
      popular: false,
      icon: Building,
      color: "from-green-600 to-emerald-600",
      limit: "Enterprise scale",
    },
  ];

  // Get current subscription data from API response
  const currentSubscription = billingData?.subscription
    ? {
        plan:
          billingData.subscription.tier === "free"
            ? "Starter"
            : billingData.subscription.tier === "pro"
            ? "Professional"
            : "Enterprise",
        status: billingData.subscription.status,
        nextBilling: billingData.subscription.current_period_end,
        amount:
          billingData.subscription.tier === "free"
            ? 12.99
            : billingData.subscription.tier === "pro"
            ? 69.99
            : 460,
        daysLeft: Math.ceil(
          (new Date(billingData.subscription.current_period_end).getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }
    : {
        plan: "Starter",
        status: "active",
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        amount: 0,
        daysLeft: 30,
      };

  const usageStats = billingData?.usage
    ? {
        uploadsThisMonth: billingData.usage.uploads_count || 0,
        uploadsLimit: currentPlan === "free" ? "10/month" : "Unlimited",
        accuracyRate: 96.8, // This would come from analytics
        avgProcessingTime: "0.3s", // This would come from analytics
      }
    : {
        uploadsThisMonth: 0,
        uploadsLimit: "10/month",
        accuracyRate: 0,
        avgProcessingTime: "0s",
      };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-600/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
      case "failed":
        return "bg-red-600/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Check className="w-4 h-4" />;
    }
  };

  const isStarter = billingData?.subscription?.tier === "free";
  const trialDaysLeft = billingData?.subscription
    ? Math.max(
        0,
        Math.ceil(
          (new Date(billingData.subscription.current_period_end).getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;
  const trialActive = isStarter && trialDaysLeft > 0;

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Sidebar and mobile menu handled by layout when inLayout */}
      {!inLayout && (
        <>
          <DashboardSidebar
            isCollapsed={isCollapsed}
            onToggle={handleToggleSidebar}
          />
          <MobileSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <button
            onClick={handleToggleMobileMenu}
            className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={
          inLayout
            ? { marginLeft: 0, width: "100%" }
            : {
                marginLeft: isCollapsed
                  ? "var(--collapsed-sidebar-width, 80px)"
                  : "var(--expanded-sidebar-width, 320px)",
                width: isCollapsed
                  ? "calc(100% - var(--collapsed-sidebar-width, 80px))"
                  : "calc(100% - var(--expanded-sidebar-width, 320px))",
              }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        {isLoading ? (
          <DashboardSkeleton
            variant="user"
            showSidebar={!inLayout}
            showCharts={false}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-6xl mx-auto"
          >
            {/* Payment Success Banner */}
            <AnimatePresence>
              {(searchParams.get("payment_success") === "true" ||
                searchParams.get("session_id")) && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl blur-xl opacity-60" />
                  <div className="relative bg-gradient-to-r from-green-600/10 to-emerald-600/10 backdrop-blur-xl rounded-3xl p-6 border border-green-500/30 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            Payment Successful!
                          </h3>
                          <p className="text-green-200">
                            Your subscription has been activated and is now
                            processing.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate("/dashboard/billing", { replace: true })
                        }
                        className="text-green-200 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
              <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-4"
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </motion.div>
                      <span className="text-purple-300 text-sm font-semibold">
                        Billing & Subscription
                      </span>
                    </motion.div>
                    <motion.h1
                      className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Subscription Management
                    </motion.h1>
                    <motion.p
                      className="text-gray-400 text-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      Manage your subscription and billing preferences
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6">
                        <Download className="w-4 h-4 mr-2" />
                        Download Invoice
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Current Subscription & Usage */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* Current Subscription */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
                  <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Crown className="w-5 h-5 text-yellow-400" />
                        <span>Current Subscription</span>
                        <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                          {currentSubscription.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            {currentSubscription.plan} Plan
                          </h3>
                          <p className="text-gray-400">
                            <span className="text-white font-semibold">
                              £{currentSubscription.amount}/month
                            </span>{" "}
                            • Next billing in{" "}
                            <span className="text-blue-400">
                              {currentSubscription.daysLeft} days
                            </span>
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            Billing date: {currentSubscription.nextBilling}
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              onClick={() => {
                                const el =
                                  document.getElementById("plans-section");
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth" });
                                }
                              }}
                              variant="outline"
                              className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30"
                            >
                              Change Plan
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              onClick={handleCancelSubscription}
                              variant="outline"
                              className="border-red-600/30 text-red-400 hover:bg-red-600/10 hover:border-red-500/50"
                            >
                              Cancel Subscription
                            </Button>
                          </motion.div>
                        </div>
                      </div>

                      {/* Usage Stats */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {usageStats.uploadsThisMonth.toLocaleString()}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Uploads this month
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {usageStats.accuracyRate}%
                          </div>
                          <div className="text-gray-400 text-sm">
                            Accuracy rate
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {usageStats.avgProcessingTime}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Avg processing
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">
                            ∞
                          </div>
                          <div className="text-gray-400 text-sm">
                            Upload limit
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pricing Plans */}
                <div id="plans-section" />
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
                  <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Available Plans
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Choose the plan that best fits your needs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {plans.map((plan, index) => (
                          <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                              plan.popular
                                ? "bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-purple-500/30"
                                : currentPlan === plan.id
                                ? "bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-green-500/30"
                                : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                            }`}
                          >
                            {plan.popular && (
                              <div className="absolute -top-3 left-6">
                                <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-500/30">
                                  <Star className="w-3 h-3 mr-1" />
                                  Most Popular
                                </Badge>
                              </div>
                            )}

                            {currentPlan === plan.id && (
                              <div className="absolute -top-3 left-6">
                                <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-500/30">
                                  <Check className="w-3 h-3 mr-1" />
                                  Current Plan
                                </Badge>
                              </div>
                            )}

                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${plan.color}`}
                                >
                                  <plan.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-white">
                                    {plan.name}
                                  </h3>
                                  <p className="text-gray-400 text-sm">
                                    {plan.description}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-white">
                                  £{plan.price}
                                  <span className="text-lg text-gray-400 font-normal">
                                    /{plan.period}
                                  </span>
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {plan.limit}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                              {plan.features.map((feature, featureIndex) => (
                                <div
                                  key={featureIndex}
                                  className="flex items-center space-x-2 text-sm"
                                >
                                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  <span className="text-gray-300">
                                    {feature}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() =>
                                  currentPlan !== plan.id &&
                                  handlePlanChange(plan.id)
                                }
                                className={`w-full h-12 ${
                                  currentPlan === plan.id
                                    ? "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                                    : plan.popular
                                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25"
                                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30"
                                }`}
                                disabled={currentPlan === plan.id}
                              >
                                {currentPlan === plan.id ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Current Plan
                                  </>
                                ) : plan.price === 0 ? (
                                  <>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Downgrade
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Upgrade via Stripe
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Billing History */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Receipt className="w-5 h-5 text-blue-400" />
                      <span>Billing History</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Your recent transactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {invoices.length > 0 ? (
                        invoices.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="text-white font-medium text-sm">
                                  {item.description}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  {item.date}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {item.invoice}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-bold">
                                  {item.currency}{" "}
                                  {Number(item.amount).toFixed(2)}
                                </div>
                                <Badge
                                  className={`${getStatusColor(
                                    item.status
                                  )} text-xs mt-1`}
                                >
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(item.status)}
                                    <span>{item.status}</span>
                                  </div>
                                </Badge>
                              </div>
                            </div>
                            {item.invoice && (
                              <a
                                href={item.invoice}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-xs underline"
                              >
                                View invoice
                              </a>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-400">No invoices yet</p>
                          <p className="text-gray-500 text-sm">
                            Your billing history will appear here
                          </p>
                        </div>
                      )}
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="mt-6"
                    >
                      <Button
                        variant="outline"
                        className="w-full border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View All Invoices
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Billing;
