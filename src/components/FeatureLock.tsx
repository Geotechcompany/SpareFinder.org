import React from "react";
import { motion } from "framer-motion";
import { Lock, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PlanTier, canAccessFeature } from "@/lib/plans";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface FeatureLockProps {
  requiredTier: PlanTier;
  featureName: string;
  description?: string;
  children?: React.ReactNode;
  showContent?: boolean; // If true, shows content blurred behind lock
  className?: string;
}

const tierDisplayNames: Record<PlanTier, string> = {
  free: "Starter",
  pro: "Professional",
  enterprise: "Enterprise",
};

const tierColors: Record<PlanTier, string> = {
  free: "from-gray-600 to-gray-700",
  pro: "from-purple-600 to-blue-600",
  enterprise: "from-emerald-600 to-green-600",
};

export const FeatureLock: React.FC<FeatureLockProps> = ({
  requiredTier,
  featureName,
  description,
  children,
  showContent = true,
  className = "",
}) => {
  const navigate = useNavigate();
  const { tier, isLoading } = useSubscription();

  // Strict: only show content if user's plan includes this feature
  const hasAccess = canAccessFeature(tier, requiredTier);

  const handleUpgrade = () => {
    navigate("/dashboard/billing");
    // Scroll to the plans section after navigation
    setTimeout(() => {
      const plansSection = document.getElementById("plans-section");
      if (plansSection) {
        plansSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // User has required tier or higher: render children only (no lock)
  if (!isLoading && hasAccess) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {showContent && children && (
        <div className="blur-sm pointer-events-none opacity-50 select-none">
          {children}
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`absolute inset-0 flex items-center justify-center z-10 ${
          showContent ? "" : "relative"
        }`}
      >
        <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/10 backdrop-blur-xl shadow-2xl max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-6">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping" />
                <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-full">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground dark:text-white">
                {featureName} is Locked
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <Badge 
                className={`bg-gradient-to-r ${tierColors[requiredTier]} text-white border-0`}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {tierDisplayNames[requiredTier]} Plan Required
              </Badge>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25"
                size="lg"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Upgrade to {tierDisplayNames[requiredTier]}
              </Button>
              <Button
                onClick={() => navigate("/dashboard/billing")}
                variant="outline"
                className="w-full"
              >
                View All Plans
              </Button>
            </div>

            <p className="text-xs text-muted-foreground dark:text-gray-400">
              Unlock this feature and more with a {tierDisplayNames[requiredTier]} subscription
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

