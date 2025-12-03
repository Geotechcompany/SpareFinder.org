import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Cpu, ShieldCheck, Layers, Zap } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "Performance",
    description: "Ultra-fast data processing in every situation.",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description: "Advanced protection for complete peace of mind.",
  },
  {
    icon: Layers,
    title: "Modularity",
    description: "Easy integration with existing architecture.",
  },
  {
    icon: Zap,
    title: "Responsiveness",
    description: "Instant response to every command.",
  },
];

const DemoOne = () => {
  return (
    <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center px-4 pb-4 pt-20 text-foreground sm:px-6 lg:px-8 md:min-h-[80vh] md:pt-0 dark:text-white">
      <div className="relative z-10 w-full max-w-6xl space-y-6 md:space-y-8">
      <div className="flex flex-col items-center space-y-4 text-center md:space-y-6">
        <Badge
          variant="secondary"
          className="rounded-full border border-border bg-gradient-to-r from-[#3A5AFE14] via-[#06B6D414] to-transparent px-3 py-1.5 text-xs font-medium text-primary shadow-soft-elevated backdrop-blur-xl md:px-4 md:py-2 md:text-sm dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          ✨ Next Generation Tools
        </Badge>

        <div className="flex flex-col items-center justify-center space-y-3 px-4 md:space-y-4">
          <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-5xl lg:text-6xl dark:text-white">
            Next-Generation AI Technology
          </h1>
          <p className="max-w-2xl px-4 text-base text-muted-foreground md:text-lg dark:text-neutral-300">
            Revolutionary computer vision technology that identifies industrial
            parts with 99.9% accuracy in milliseconds.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row md:gap-4">
            <Button
              className="w-full rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-soft-elevated transition-colors hover:bg-slate-50 sm:w-auto md:px-8 md:py-3 dark:border-white/10 dark:bg-white dark:text-black dark:hover:bg-white/90"
              asChild
            >
              <Link to="/register">Get Started</Link>
            </Button>
            <Button
              className="w-full rounded-xl border border-border bg-transparent px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto md:px-8 md:py-3 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              asChild
            >
              <a href="/#features">Learn More</a>
            </Button>
          </div>
        </div>
      </div>

        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:gap-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex h-32 flex-col items-start justify-start space-y-1.5 rounded-lg border border-border bg-card/95 p-3 text-foreground shadow-soft-elevated backdrop-blur-xl md:h-36 md:space-y-2 md:rounded-xl md:p-4 lg:h-40 lg:p-5 dark:border-white/10 dark:bg-white/5"
            >
              <feature.icon
                size={16}
                className="text-primary md:h-[18px] md:w-[18px] dark:text-white/80"
              />
              <h3 className="text-xs font-medium line-clamp-1 md:text-sm lg:text-base">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 md:text-sm dark:text-neutral-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export { DemoOne };
