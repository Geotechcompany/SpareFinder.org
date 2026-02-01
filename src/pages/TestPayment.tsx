import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  PoundSterling,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

const TestPayment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    email: "",
  });

  const planDetails = {
    name: "3-Month Plan",
    price: 43,
    currency: "GBP",
    duration: "3 months",
    description: "Get 3 months of premium access at a discounted rate",
    features: [
      "Unlimited part searches",
      "Priority support",
      "Advanced analytics",
      "API access",
      "Email notifications",
    ],
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Format card number (add spaces every 4 digits)
    if (name === "cardNumber") {
      const cleaned = value.replace(/\s/g, "");
      const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
      setFormData((prev) => ({ ...prev, [name]: formatted }));
      return;
    }
    
    // Format expiry date (MM/YY)
    if (name === "expiryDate") {
      const cleaned = value.replace(/\D/g, "");
      let formatted = cleaned;
      if (cleaned.length >= 2) {
        formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
      }
      setFormData((prev) => ({ ...prev, [name]: formatted }));
      return;
    }
    
    // Limit CVV to 3-4 digits
    if (name === "cvv") {
      const cleaned = value.replace(/\D/g, "").slice(0, 4);
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Create checkout session via API
      const checkoutResponse = (await api.billing.createCheckoutSession({
        plan: planDetails.name,
        amount: planDetails.price,
        currency: planDetails.currency,
        billing_cycle: "3_months",
        success_url: `${window.location.origin}/test-payment?success=true`,
        cancel_url: `${window.location.origin}/test-payment?cancelled=true`,
      })) as {
        success: boolean;
        data?: { checkout_url?: string };
        error?: string;
      };

      if (checkoutResponse.success && checkoutResponse.data?.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = checkoutResponse.data.checkout_url;
        return;
      } else {
        throw new Error(
          checkoutResponse.error || 
          "Failed to create checkout session. Please try again."
        );
      }
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred processing your payment. Please try again.",
      });
    }
  };

  // Check for success/cancel URL params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setPaymentSuccess(true);
      toast({
        title: "Payment Successful!",
        description: `You've successfully subscribed to the ${planDetails.name}`,
      });
    }
    if (params.get("cancelled") === "true") {
      toast({
        variant: "destructive",
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
      });
    }
  }, [toast]);

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-950 dark:via-purple-900/10 dark:to-blue-900/10 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="border-2 border-green-500 dark:border-green-400">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Payment Successful!
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Your subscription to the {planDetails.name} has been
                    activated.
                  </p>
                </div>
                <div className="pt-4 space-y-2">
                  <Button
                    onClick={() => navigate("/dashboard/billing")}
                    className="w-full"
                  >
                    View Subscription
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-950 dark:via-purple-900/10 dark:to-blue-900/10 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {planDetails.name}
                </CardTitle>
                <CardDescription>{planDetails.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      <PoundSterling className="w-6 h-6 inline" />
                      {planDetails.price}
                    </span>
                    <span className="text-muted-foreground">
                      / {planDetails.duration}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    That's just £{((planDetails.price / 3).toFixed(2))} per month
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">What's included:</h3>
                  <ul className="space-y-2">
                    {planDetails.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  <Badge variant="secondary" className="w-full justify-center py-2">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Test Payment Mode
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  Enter your payment information to complete your subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      name="cardholderName"
                      placeholder="John Doe"
                      value={formData.cardholderName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      name="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      maxLength={19}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        name="expiryDate"
                        placeholder="MM/YY"
                        value={formData.expiryDate}
                        onChange={handleInputChange}
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        name="cvv"
                        placeholder="123"
                        value={formData.cvv}
                        onChange={handleInputChange}
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>
                        £{planDetails.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay £{planDetails.price.toFixed(2)} with Stripe
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By clicking "Pay", you agree to our Terms of Service and
                    Privacy Policy. This is a test payment page.
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TestPayment;

