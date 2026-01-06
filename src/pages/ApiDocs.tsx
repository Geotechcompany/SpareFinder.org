import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Code, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { FeatureLock } from "@/components/FeatureLock";
import { useSubscription } from "@/contexts/SubscriptionContext";

const CodeBlock: React.FC<{ children: string }> = ({ children }) => {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-background/70 p-4 text-xs text-foreground dark:bg-black/30 dark:text-white">
      <code>{children}</code>
    </pre>
  );
};

const ApiDocs: React.FC = () => {
  const { tier, isPlanActive } = useSubscription();
  const apiBaseUrl = useMemo(() => {
    return (
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      "https://sparefinder-org-pp8y.onrender.com"
    );
  }, []);

  const hasApiAccess = isPlanActive && (tier === "pro" || tier === "enterprise");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:from-gray-950 dark:via-purple-900/10 dark:to-blue-900/10">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-purple-600/15 text-purple-700 border-purple-500/20 dark:text-purple-200 dark:border-purple-500/30">
              Developer API
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30">
              Pro / Enterprise
            </Badge>
          </div>

          <h1 className="text-3xl font-bold tracking-tight dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent sm:text-4xl">
            SpareFinder API Documentation
          </h1>
          <p className="text-muted-foreground dark:text-gray-300">
            Integrate SpareFinder with ERP/CMMS tools using secure API keys.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/dashboard/settings">Open Settings → API Keys</Link>
            </Button>
            <Button asChild>
              <Link to="/contact">Contact Sales / Support</Link>
            </Button>
          </div>
        </motion.div>

        <Separator className="my-8" />

        <FeatureLock
          requiredTier="pro"
          featureName="API Access"
          description="Integrate SpareFinder with your ERP/CMMS tools using secure API keys. Available in Professional and Enterprise plans."
          showContent={!hasApiAccess}
        >
          <div className="grid grid-cols-1 gap-6">
          <Card className="rounded-3xl border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#8B5CF6]" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground dark:text-gray-300">
                Use the <span className="font-semibold text-foreground dark:text-white">x-api-key</span>{" "}
                header. Keys are shown <span className="font-semibold text-foreground dark:text-white">once</span>{" "}
                at creation—store them securely.
              </p>
              <CodeBlock>{`x-api-key: <YOUR_API_KEY>`}</CodeBlock>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Plan rules & limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold text-foreground dark:text-white">Pro</span>: API access enabled, monthly API call cap enforced.
                </li>
                <li>
                  <span className="font-semibold text-foreground dark:text-white">Enterprise</span>: API access enabled, unlimited API calls.
                </li>
                <li>All API calls count toward your monthly usage tracking.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-500" />
                Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">GET</Badge>
                  <code className="text-sm font-semibold">{`/api/external/v1/me`}</code>
                </div>
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  Returns subscription tier, limits, and current month usage for the key owner.
                </p>
                <CodeBlock>{`curl -X GET "${apiBaseUrl}/api/external/v1/me" \\
  -H "x-api-key: <YOUR_API_KEY>"`}</CodeBlock>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">POST</Badge>
                  <code className="text-sm font-semibold">{`/api/external/v1/search/keywords/schedule`}</code>
                  <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/20 dark:text-amber-200 dark:border-amber-500/30">
                    costs 1 credit
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  Schedule a keyword search job through the AI crew pipeline.
                </p>
                <CodeBlock>{`curl -X POST "${apiBaseUrl}/api/external/v1/search/keywords/schedule" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <YOUR_API_KEY>" \\
  -d '{"keywords":["bearing","SKF 6205","deep groove"]}'`}</CodeBlock>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">GET</Badge>
                  <code className="text-sm font-semibold">{`/api/external/v1/search/keywords/status/:jobId`}</code>
                </div>
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  Poll job status/results by jobId returned from <code>schedule</code>.
                </p>
                <CodeBlock>{`curl -X GET "${apiBaseUrl}/api/external/v1/search/keywords/status/<JOB_ID>" \\
  -H "x-api-key: <YOUR_API_KEY>"`}</CodeBlock>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/95 shadow-soft-elevated backdrop-blur-xl dark:bg-black/20 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Common errors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold text-foreground dark:text-white">401 api_key_invalid</span>: key missing/invalid/revoked.
                </li>
                <li>
                  <span className="font-semibold text-foreground dark:text-white">403 api_access_not_enabled</span>: your plan doesn’t include API access.
                </li>
                <li>
                  <span className="font-semibold text-foreground dark:text-white">429 api_limit_exceeded</span>: Pro monthly API call cap reached.
                </li>
                <li>
                  <span className="font-semibold text-foreground dark:text-white">402 insufficient_credits</span>: you ran out of credits for keyword scheduling.
                </li>
              </ul>
            </CardContent>
          </Card>
          </div>
        </FeatureLock>
      </div>

      <Footer />
    </div>
  );
};

export default ApiDocs;

