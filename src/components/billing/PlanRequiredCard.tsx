import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

export const PlanRequiredCard: React.FC<{
  title?: string;
  description?: string;
}> = ({
  title = "Activate a plan to continue",
  description = "Start a free trial or subscribe to unlock uploads, history, reviews, and analytics.",
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70dvh] flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-2xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/10 blur-3xl" />

        <Card className="relative overflow-hidden border-border bg-card/90 backdrop-blur-xl shadow-soft-elevated">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 dark:from-purple-500/10 dark:to-blue-500/10" />
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-200">
                <LockKeyhole className="h-3.5 w-3.5" />
                Locked
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate("/onboarding/trial")}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20"
              >
                Choose a plan / start trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/billing")}
                className="w-full sm:w-auto"
              >
                Go to Billing
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can close this and browse your account, but core features stay locked until a plan is active.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
