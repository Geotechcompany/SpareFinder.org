import { cn } from "@/lib/utils";
import { Upload, Cpu, CheckCircle } from "lucide-react";
import type React from "react";

// The main props for the HowItWorks component
interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {}

// The props for a single step card
interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

/**
 * A single step card within the "How It Works" section.
 * It displays an icon, title, description, and a list of benefits.
 */
const StepCard: React.FC<StepCardProps> = ({
  icon,
  title,
  description,
  benefits,
}) => (
  <div
    className={cn(
      "relative rounded-2xl border border-border bg-card p-8 text-foreground shadow-soft-elevated transition-all duration-300 ease-in-out",
      "hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20 hover:border-primary/40 hover:bg-muted/60",
      "dark:border-gray-800 dark:bg-gray-900/50 dark:hover:bg-gray-800/50 dark:hover:border-purple-500/50"
    )}
  >
    {/* Icon */}
    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-[#3A5AFE] to-[#8B5CF6] shadow-lg shadow-purple-500/40">
      {icon}
    </div>
    {/* Title and Description */}
    <h3 className="mb-3 text-2xl font-bold text-foreground dark:text-white">
      {title}
    </h3>
    <p className="mb-6 text-lg leading-relaxed text-muted-foreground dark:text-gray-400">
      {description}
    </p>
    {/* Benefits List */}
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center gap-3">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#3A5AFE] to-[#8B5CF6]" />
          </div>
          <span className="text-sm text-muted-foreground dark:text-gray-300">
            {benefit}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * A responsive "How It Works" section that displays a 3-step process.
 * Customized for SpareFinder AI-powered part identification.
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  ...props
}) => {
  const stepsData = [
    {
      icon: <Upload className="h-8 w-8 text-white" />,
      title: "Upload Part Image",
      description:
        "Simply drag & drop or capture a photo of any Manufacturing or industrial part from your device.",
      benefits: [
        "Supports JPG, PNG, PDF, and CAD files",
        "Mobile camera integration",
        "Instant image validation",
      ],
    },
    {
      icon: <Cpu className="h-8 w-8 text-white" />,
      title: "AI Analysis",
      description:
        "Our advanced neural networks analyze the image in milliseconds, identifying the part with 99.9% accuracy.",
      benefits: [
        "Recognition across 50+ industrial categories",
        "Automatic part classification",
        "Cross-reference with 10M+ parts database",
      ],
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-white" />,
      title: "Get Complete Results",
      description:
        "Receive detailed specifications, verified suppliers, pricing, and replacement options instantly.",
      benefits: [
        "Technical specs and compatibility",
        "Top 3 verified suppliers with contact info",
        "Alternative and replacement suggestions",
      ],
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
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#3A5AFE1A] blur-3xl dark:bg-purple-500/10" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#06B6D41A] blur-3xl dark:bg-blue-500/10" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-border bg-gradient-to-r from-[#3A5AFE14] via-[#06B6D414] to-transparent px-4 py-2 text-xs font-medium text-primary shadow-soft-elevated backdrop-blur-xl dark:border-purple-500/30 dark:from-purple-500/20 dark:to-blue-500/20 dark:text-purple-300">
            <span className="text-sm font-medium">
              Simple 3-Step Process
            </span>
          </div>
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            Get accurate part identification in seconds with our streamlined AI-powered workflow
          </p>
        </div>

        {/* Step Indicators */}
        <div className="relative mx-auto mb-12 w-full max-w-4xl">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-0.5 w-[66.6667%] -translate-y-1/2 bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#8B5CF6]"
          />
          <div className="relative grid grid-cols-3">
            {stepsData.map((_, index) => (
              <div
                key={index}
                className="flex h-10 w-10 items-center justify-center justify-self-center rounded-full bg-gradient-to-r from-[#3A5AFE] to-[#8B5CF6] font-bold text-white ring-4 ring-background shadow-lg shadow-purple-500/50 dark:ring-black"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {stepsData.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              benefits={step.benefits}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

