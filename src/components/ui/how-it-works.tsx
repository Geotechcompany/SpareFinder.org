import type React from "react";
import { cn } from "@/lib/utils";
import { FeatureSteps, type FeatureStep } from "@/components/ui/feature-section";

interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {}

/**
 * Replaces the previous "How It Works" UI with the new FeatureSteps component.
 * (Adapted from Next.js snippet: uses <img> instead of next/image.)
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  ...props
}) => {
  const features: FeatureStep[] = [
    {
      step: "Step 1",
      title: "Upload a part photo",
      content:
        "Snap a photo (or upload a file) of the spare part you need to identify. Add a short keyword if the part is ambiguous.",
      image:
        "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=2070&q=80",
    },
    {
      step: "Step 2",
      title: "AI identifies the part",
      content:
        "SpareFinder analyzes the image, matches against a large catalog, and returns the best candidates with confidence scores.",
      image:
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=2070&q=80",
    },
    {
      step: "Step 3",
      title: "Save, share, and source",
      content:
        "Review specs, suppliers, and alternatives. Save results to your history and share a clean report with your team.",
      image:
        "https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=2070&q=80",
    },
  ];

  return (
    <section
      id="how-it-works"
      className={cn(
        "relative w-full overflow-hidden bg-background py-16 sm:py-24 dark:bg-black",
        className
      )}
      {...props}
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/10" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div className="relative z-10">
        <FeatureSteps
          features={features}
          title="How It Works"
          autoPlayInterval={4000}
          imageHeight="h-[500px]"
        />
      </div>
    </section>
  );
};

