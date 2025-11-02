import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { PLAN_CONFIG } from "@/lib/plans";

const Trial: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"trial" | "paid" | null>(null);

  const startTrial = async () => {
    try {
      setLoading("trial");
      const starterPlan = PLAN_CONFIG.free;
      const resp = (await api.billing.createCheckoutSession({
        plan: starterPlan.name,
        amount: starterPlan.price,
        currency: starterPlan.currency.toUpperCase(),
        billing_cycle: "monthly",
        trial_days: starterPlan.trial?.days || 30,
        success_url: `${window.location.origin}/dashboard/billing?payment_success=true`,
        cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
      })) as {
        success: boolean;
        data?: { checkout_url?: string };
        error?: string;
      };
      if (resp.success && resp.data?.checkout_url) {
        window.location.href = resp.data.checkout_url;
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoading(null);
    }
  };

  const startPaid = async () => {
    try {
      setLoading("paid");
      const starterPlan = PLAN_CONFIG.free;
      const resp = (await api.billing.createCheckoutSession({
        plan: starterPlan.name,
        amount: starterPlan.price,
        currency: starterPlan.currency.toUpperCase(),
        billing_cycle: "monthly",
        trial_days: starterPlan.trial?.days || 30,
        success_url: `${window.location.origin}/dashboard/billing?payment_success=true`,
        cancel_url: `${window.location.origin}/dashboard/billing?payment_cancelled=true`,
      })) as {
        success: boolean;
        data?: { checkout_url?: string };
        error?: string;
      };
      if (resp.success && resp.data?.checkout_url) {
        window.location.href = resp.data.checkout_url;
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-[#0b0b14] to-black p-6">
      <Card className="max-w-2xl w-full border-white/10 bg-gradient-to-b from-zinc-900/40 to-black/60">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">
            Start your Starter plan
          </CardTitle>
          <CardDescription className="text-gray-300">
            Enjoy a 30-day free trial. No charge today. £
            {PLAN_CONFIG.free.price}/month after trial. Cancel anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <img
              src="/favicon.svg"
              alt="Starter"
              className="w-full h-40 object-contain bg-gradient-to-r from-purple-600/10 to-blue-600/10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={startTrial}
              disabled={loading !== null}
              className="h-12"
            >
              {loading === "trial" ? "Redirecting…" : "Start 30-day Free Trial"}
            </Button>
            <Button
              onClick={startPaid}
              variant="secondary"
              disabled={loading !== null}
              className="h-12 bg-white/10 hover:bg-white/20"
            >
              {loading === "paid"
                ? "Redirecting…"
                : `Pay £${PLAN_CONFIG.free.price}/month now`}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Shield className="w-4 h-4" />
            No credits will be granted until checkout completes successfully.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Trial;
