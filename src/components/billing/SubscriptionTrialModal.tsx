import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Clock, Sparkles, Star, Zap } from "lucide-react";

type Tier = "free" | "pro" | "enterprise";

export interface TrialPlan {
  tier: Tier;
  name: string;
  price: string; // formatted (e.g., "£69.99/mo")
  trialDays: number;
  nextCharge: string; // formatted date
  features: string[];
  colorClass: string; // bg gradient classes
  note?: string;
}

interface SubscriptionTrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: TrialPlan;
  onStartTrial: (tier: Tier) => void;
  isProcessing?: boolean;
  paymentError?: string | null;
}

export const SubscriptionTrialModal: React.FC<SubscriptionTrialModalProps> = ({
  open,
  onOpenChange,
  plan,
  onStartTrial,
  isProcessing = false,
  paymentError = null,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-white/20 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl">
        {/* Header with enhanced styling */}
        <div className="relative p-8 border-b border-white/10">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10" />
          <div className="relative flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/25">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            
            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Start your {plan.name} plan
              </h2>
              <p className="text-gray-300 text-base">
                Enjoy a {plan.trialDays}-day free trial. No charge today. {plan.price} after trial. Cancel anytime.
              </p>
            </div>
            
            {/* Trial badge */}
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 px-4 py-1.5 text-sm font-medium">
              <Star className="w-4 h-4 mr-1.5" />
              {plan.trialDays}-day FREE trial
            </Badge>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Enhanced plan preview */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            {/* Gradient background matching the plan */}
            <div className={`h-32 bg-gradient-to-r ${plan.colorClass} relative`}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute top-4 right-4">
                <Zap className="w-8 h-8 text-white/80" />
              </div>
            </div>
            
            {/* Plan details card */}
            <div className="p-6 bg-gradient-to-b from-gray-900/80 to-black/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-gray-300">{plan.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Today</p>
                  <p className="text-2xl font-bold text-emerald-400">£0</p>
                </div>
              </div>
              
              {/* Features list */}
              <div className="grid grid-cols-1 gap-2">
                {plan.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    {feature}
                  </div>
                ))}
                {plan.features.length > 3 && (
                  <div className="text-sm text-gray-400 mt-2">
                    + {plan.features.length - 3} more features
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline info */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white text-sm">
                  Your trial timeline
                </p>
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  <p>• Today: Start your free {plan.trialDays}-day trial</p>
                  <p>• Day {Math.max(1, plan.trialDays - 7)}: We'll send you a reminder</p>
                  <p>• Day {plan.trialDays}: Billing begins at {plan.price} (cancel anytime)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment error */}
          {paymentError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm flex gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-300">
                  We couldn't start your trial with this payment method.
                </p>
                <p className="text-gray-400 mt-1">
                  Please use a different card, or upgrade without a trial.
                </p>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="space-y-4">
            {/* Security note */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-2 h-2 text-emerald-400" />
              </div>
              No credit card charged until trial ends
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                className="flex-1 bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
              >
                Maybe later
              </Button>
              <Button
                onClick={() => onStartTrial(plan.tier)}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-none shadow-lg shadow-purple-500/25 transition-all duration-200 hover:shadow-purple-500/40 hover:scale-[1.02]"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Starting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Start {plan.trialDays}-day trial
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionTrialModal;