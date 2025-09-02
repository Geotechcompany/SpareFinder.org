import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Zap,
  Shield,
  BarChart3,
  Check,
  ArrowRight,
  Camera,
  Search,
  DollarSign,
  Star,
  Play,
  ChevronRight,
  Sparkles,
  Globe,
  Award,
  Users,
  TrendingUp,
  Menu,
  X,
  CreditCard,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    "details" | "processing" | "success" | "error"
  >("details");
  const [paymentForm, setPaymentForm] = useState({
    email: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    name: "",
    company: "",
  });

  const { toast } = useToast();

  const features = [
    {
      icon: Camera,
      title: "AI Vision Analysis",
      description:
        "Upload any spare part image and get instant AI-powered identification with detailed specs and compatibility data",
      color: "from-purple-500 to-blue-500",
    },
    {
      icon: Search,
      title: "Smart Web Scraping",
      description:
        "Automatically search across 50+ marketplaces including Amazon, eBay, and specialized automotive retailers",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Track market trends, price fluctuations, and get predictive insights on part availability",
      color: "from-cyan-500 to-teal-500",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Military-grade encryption, GDPR compliance, and secure cloud infrastructure with 99.9% uptime",
      color: "from-teal-500 to-green-500",
    },
  ];

  const testimonials = [
    {
      name: "Michael Rodriguez",
      role: "Senior Mechanic at AutoTech Solutions",
      content:
        "SpareFinder has revolutionized our workflow. What used to take hours now takes seconds. The accuracy is phenomenal.",
      avatar: "MR",
      rating: 5,
    },
    {
      name: "Sarah Chen",
      role: "Parts Manager at Global Motors",
      content:
        "We've reduced our part identification errors by 95%. The ROI was evident within the first month of implementation.",
      avatar: "SC",
      rating: 5,
    },
    {
      name: "David Thompson",
      role: "Fleet Manager at TransLogistics",
      content:
        "The AI's ability to find rare parts across multiple platforms has saved us thousands in downtime costs.",
      avatar: "DT",
      rating: 5,
    },
  ];

  const stats = [
    { label: "Parts Identified", value: "2.5M+", icon: Camera },
    { label: "Happy Customers", value: "50K+", icon: Users },
    { label: "Accuracy Rate", value: "99.2%", icon: Award },
    { label: "Time Saved", value: "5M+ hrs", icon: TrendingUp },
  ];

  const plans = [
    {
      id: "starter",
      name: "Starter / Basic",
      price: "£12.99",
      priceValue: 12.99,
      period: "/month",
      description: "For small users testing the service",
      features: [
        "20 image recognitions per month",
        "Basic search & match results",
        "Access via web portal only",
      ],
      popular: false,
      color: "from-gray-600 to-gray-700",
      billingCycle: "monthly",
    },
    {
      id: "professional",
      name: "Professional / Business",
      price: "£69.99",
      priceValue: 69.99,
      period: "/month",
      description: "For SMEs managing spare parts more actively",
      features: [
        "500 recognitions per month",
        "Catalogue storage (part lists, drawings)",
        "API access for ERP/CMMS integration",
        "Analytics dashboard",
      ],
      popular: true,
      color: "from-purple-600 to-blue-600",
      billingCycle: "monthly",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "£460",
      priceValue: 460,
      period: "/month",
      description: "For OEMs, large factories, distributors",
      features: [
        "Unlimited AI identifications",
        "Advanced AI customisation (train on their data)",
        "ERP/CMMS full integration",
        "Predictive demand analytics",
        "Dedicated support & SLA",
      ],
      popular: false,
      color: "from-amber-500 to-orange-600",
      billingCycle: "monthly",
    },
  ];

  // Payment processing functions
  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setPaymentStep("details");
    setIsPaymentModalOpen(true);
  };

  const handlePaymentFormChange = (field: string, value: string) => {
    setPaymentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validatePaymentForm = () => {
    const { email, cardNumber, expiryDate, cvv, name } = paymentForm;

    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      });
      return false;
    }

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
      toast({
        variant: "destructive",
        title: "Invalid Card Number",
        description: "Please enter a valid card number",
      });
      return false;
    }

    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      toast({
        variant: "destructive",
        title: "Invalid Expiry Date",
        description: "Please enter expiry date in MM/YY format",
      });
      return false;
    }

    if (!cvv || cvv.length < 3) {
      toast({
        variant: "destructive",
        title: "Invalid CVV",
        description: "Please enter a valid CVV",
      });
      return false;
    }

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter the cardholder name",
      });
      return false;
    }

    return true;
  };

  const processPayment = async () => {
    if (!validatePaymentForm() || !selectedPlan) return;

    try {
      setIsProcessingPayment(true);
      setPaymentStep("processing");

      // Simulate payment processing (replace with actual payment gateway integration)
      const paymentData = {
        plan: selectedPlan.id,
        amount: selectedPlan.priceValue,
        currency: "GBP",
        billing_cycle: selectedPlan.billingCycle,
        customer: {
          email: paymentForm.email,
          name: paymentForm.name,
          company: paymentForm.company,
        },
        payment_method: {
          card_number: paymentForm.cardNumber.replace(/\s/g, ""),
          expiry_date: paymentForm.expiryDate,
          cvv: paymentForm.cvv,
        },
      };

      // Process payment using configured payment methods
      try {
        const response = await api.billing.processPayment(paymentData);

        if (response.success) {
          setPaymentStep("success");
          toast({
            title: "Payment Successful!",
            description: `Welcome to SpareFinder ${selectedPlan.name}. Check your email for confirmation.`,
          });

          // Clear form
          setPaymentForm({
            email: "",
            cardNumber: "",
            expiryDate: "",
            cvv: "",
            name: "",
            company: "",
          });
        } else {
          throw new Error(
            response.message || "Payment failed. Please try again."
          );
        }
      } catch (apiError) {
        console.error("API Error:", apiError);
        throw apiError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStep("error");
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digit characters
    const v = value.replace(/\D/g, "");
    // Add slash after 2 digits
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 light:from-slate-50 light:via-purple-50 light:to-slate-50">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 bg-black/95 backdrop-blur-xl border-l border-white/20 z-50 md:hidden"
            >
              <div className="p-6">
                {/* Close Button */}
                <div className="flex justify-end mb-8">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Logo */}
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">
                    SpareFinder
                  </span>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-4 mb-8">
                  {[
                    { name: "Features", href: "#features" },
                    { name: "Pricing", href: "#pricing" },
                    { name: "Reviews", href: "#testimonials" },
                  ].map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="block py-3 px-4 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                </nav>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <Link to="/login" className="block">
                    <Button
                      variant="ghost"
                      className="w-full text-white hover:bg-white/10 rounded-xl justify-start"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" className="block">
                    <Button
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/25 rounded-xl"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Enhanced Navigation */}
      <nav className="fixed top-4 left-4 right-4 z-50 backdrop-blur-xl bg-black/30 border border-white/20 rounded-2xl shadow-2xl shadow-black/20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  SpareFinder
                </span>
                <div className="flex items-center space-x-1">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30"
                  >
                    Pro
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-500/20 text-green-300 border-green-500/30"
                  >
                    AI Powered
                  </Badge>
                </div>
              </div>
            </motion.div>

            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-300 hover:text-white transition-colors relative group"
              >
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-400 transition-all group-hover:w-full"></span>
              </a>
              <a
                href="#pricing"
                className="text-gray-300 hover:text-white transition-colors relative group"
              >
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-400 transition-all group-hover:w-full"></span>
              </a>
              <a
                href="#testimonials"
                className="text-gray-300 hover:text-white transition-colors relative group"
              >
                Reviews
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-400 transition-all group-hover:w-full"></span>
              </a>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />

              {/* Desktop Buttons */}
              <div className="hidden md:flex items-center space-x-4">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-white hover:text-purple-300 hover:bg-white/10 rounded-xl"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 shadow-lg shadow-purple-500/25 rounded-xl">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Enhanced Visuals */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl mx-auto"
          >
            <Badge className="mb-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/30 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Revolutionary AI Technology
            </Badge>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight relative z-20">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                Industrial AI{" "}
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-transparent z-30">
                Part Recognition
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed relative z-20 ">
              Revolutionary computer vision technology that identifies
              industrial parts with{" "}
              <span className="text-purple-300 font-semibold">
                99.9% accuracy
              </span>{" "}
              in milliseconds
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-10 py-4 h-14 shadow-xl shadow-purple-500/25 group"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-10 py-4 h-14 backdrop-blur-sm group"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
                <span className="ml-2 text-sm bg-red-500 text-white px-2 py-1 rounded-full">
                  2:30
                </span>
              </Button>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
                    <stat.icon className="w-6 h-6 text-purple-300" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <Badge className="mb-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30">
              <Globe className="w-4 h-4 mr-2" />
              Powered by Advanced AI
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Next-Generation
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {" "}
                Technology
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our cutting-edge platform combines computer vision, machine
              learning, and real-time data processing to deliver unprecedented
              accuracy and speed.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="group"
              >
                <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-xl hover:border-purple-500/50 transition-all duration-500 h-full group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-purple-500/20">
                  <CardHeader>
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-24 px-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20"
      >
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 border-green-500/30">
              <Star className="w-4 h-4 mr-2" />
              Trusted by Professionals
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What Our Customers Say
            </h2>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-xl">
              <CardContent className="p-8 md:p-12">
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-6 h-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-xl md:text-2xl text-white text-center mb-8 font-medium leading-relaxed">
                  "{testimonials[activeTestimonial].content}"
                </blockquote>
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonials[activeTestimonial].avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold">
                      {testimonials[activeTestimonial].name}
                    </div>
                    <div className="text-gray-400">
                      {testimonials[activeTestimonial].role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === activeTestimonial
                      ? "bg-purple-500 w-8"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <Badge className="mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30">
              <span className="text-lg">£</span>
              <span className="ml-1">Transparent Pricing</span>
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Choose Your
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Plan
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                onHoverStart={() => setHoveredPlan(plan.id)}
                onHoverEnd={() => setHoveredPlan(null)}
                className="relative"
              >
                <Card
                  className={`relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-xl transition-all duration-500 h-full ${
                    plan.popular ? "ring-2 ring-purple-500 scale-105" : ""
                  } ${
                    hoveredPlan === plan.id
                      ? "scale-105 shadow-2xl shadow-purple-500/20"
                      : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 text-sm font-bold shadow-lg">
                        <Award className="w-4 h-4 mr-2" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8">
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${plan.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}
                    >
                      {plan.id === "starter" && (
                        <Camera className="w-8 h-8 text-white" />
                      )}
                      {plan.id === "professional" && (
                        <Zap className="w-8 h-8 text-white" />
                      )}
                      {plan.id === "enterprise" && (
                        <Shield className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <CardTitle className="text-2xl font-bold text-white mb-2">
                      {plan.name}
                    </CardTitle>
                    <div className="flex items-baseline justify-center mb-4">
                      <span className="text-4xl md:text-5xl font-bold text-white">
                        {plan.price}
                      </span>
                      <span className="text-gray-400 ml-2">{plan.period}</span>
                    </div>
                    <CardDescription className="text-gray-300 text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-start text-gray-300"
                        >
                          <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full h-12 text-lg font-semibold ${
                        plan.popular
                          ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/25"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() =>
                        plan.id === "enterprise" ? null : handlePlanSelect(plan)
                      }
                    >
                      {plan.id === "enterprise"
                        ? "Contact Sales"
                        : "Get Started"}
                      <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pay-as-you-go banner */}
          <div className="max-w-4xl mx-auto mt-10">
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-white text-2xl">
                  Pay‑as‑you‑go
                </CardTitle>
                <CardDescription className="text-gray-300">
                  £0.70 per upload — perfect for occasional use
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-8">
                <div className="text-4xl font-bold text-white">£0.70</div>
                <div className="text-gray-400">per image recognition</div>
                <Link to="/register">
                  <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-blue-900/30"></div>
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <Badge className="mb-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Limited Time Offer
            </Badge>

            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Ready to Transform Your
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {" "}
                Workflow?
              </span>
            </h2>

            <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Join over 50,000 mechanics, engineers, and hobbyists who trust
              SpareFinder for accurate, instant spare part identification. Start
              your free trial today.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold text-lg px-12 py-4 h-16 shadow-xl shadow-yellow-500/25 group"
              >
                Start Free Trial - 14 Days
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-12 py-4 h-16 backdrop-blur-sm"
              >
                Schedule Demo
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </Button>
            </div>

            <div className="mt-8 text-sm text-gray-400">
              No credit card required • Cancel anytime • 99.9% uptime guarantee
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="border-t border-white/10 py-16 px-6 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">
                  SpareFinder
                </span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Revolutionizing automotive part identification with cutting-edge
                AI technology. Trusted by professionals worldwide.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
                  <Globe className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              <p>&copy; 2025 SpareFinder. All rights reserved.</p>
            </div>
            <div className="flex space-x-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-bold">
              {paymentStep === "success"
                ? "Payment Successful!"
                : paymentStep === "error"
                ? "Payment Failed"
                : paymentStep === "processing"
                ? "Processing Payment..."
                : `Subscribe to ${selectedPlan?.name}`}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {paymentStep === "success"
                ? "Welcome to SpareFinder! Check your email for confirmation."
                : paymentStep === "error"
                ? "There was an issue processing your payment. Please try again."
                : paymentStep === "processing"
                ? "Please wait while we process your payment..."
                : `${selectedPlan?.price}${selectedPlan?.period} - ${selectedPlan?.description}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {paymentStep === "details" && (
              <div className="space-y-4">
                {/* Customer Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-200">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={paymentForm.name}
                        onChange={(e) =>
                          handlePaymentFormChange("name", e.target.value)
                        }
                        placeholder="John Doe"
                        className="bg-white/10 border-white/20 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company" className="text-gray-200">
                        Company (Optional)
                      </Label>
                      <Input
                        id="company"
                        value={paymentForm.company}
                        onChange={(e) =>
                          handlePaymentFormChange("company", e.target.value)
                        }
                        placeholder="Company Ltd"
                        className="bg-white/10 border-white/20 text-white mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-gray-200">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={paymentForm.email}
                      onChange={(e) =>
                        handlePaymentFormChange("email", e.target.value)
                      }
                      placeholder="john@example.com"
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>
                </div>

                {/* Payment Information */}
                <div className="border-t border-white/20 pt-4">
                  <h3 className="text-white font-semibold mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber" className="text-gray-200">
                        Card Number
                      </Label>
                      <Input
                        id="cardNumber"
                        value={paymentForm.cardNumber}
                        onChange={(e) =>
                          handlePaymentFormChange(
                            "cardNumber",
                            formatCardNumber(e.target.value)
                          )
                        }
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="bg-white/10 border-white/20 text-white mt-1 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate" className="text-gray-200">
                          Expiry Date
                        </Label>
                        <Input
                          id="expiryDate"
                          value={paymentForm.expiryDate}
                          onChange={(e) =>
                            handlePaymentFormChange(
                              "expiryDate",
                              formatExpiryDate(e.target.value)
                            )
                          }
                          placeholder="MM/YY"
                          maxLength={5}
                          className="bg-white/10 border-white/20 text-white mt-1 font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv" className="text-gray-200">
                          CVV
                        </Label>
                        <Input
                          id="cvv"
                          value={paymentForm.cvv}
                          onChange={(e) =>
                            handlePaymentFormChange(
                              "cvv",
                              e.target.value.replace(/\D/g, "").slice(0, 4)
                            )
                          }
                          placeholder="123"
                          maxLength={4}
                          className="bg-white/10 border-white/20 text-white mt-1 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-300">Total:</span>
                    <span className="text-white font-bold">
                      {selectedPlan?.price}
                      {selectedPlan?.period}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    You can cancel anytime. No hidden fees.
                  </p>
                </div>

                <Button
                  onClick={processPayment}
                  disabled={isProcessingPayment}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Subscribe Now
                </Button>
              </div>
            )}

            {paymentStep === "processing" && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-white font-semibold">
                  Processing your payment...
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  This may take a few moments
                </p>
              </div>
            )}

            {paymentStep === "success" && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">
                  Payment Successful!
                </p>
                <p className="text-gray-300 mb-6">
                  Welcome to SpareFinder {selectedPlan?.name}. You'll receive a
                  confirmation email shortly.
                </p>
                <Button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Get Started
                </Button>
              </div>
            )}

            {paymentStep === "error" && (
              <div className="text-center py-8">
                <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Payment Failed</p>
                <p className="text-gray-300 mb-6">
                  There was an issue processing your payment. Please check your
                  card details and try again.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setPaymentStep("details")}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => setIsPaymentModalOpen(false)}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
