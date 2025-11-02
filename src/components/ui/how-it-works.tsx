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
      "relative rounded-2xl border border-gray-800 bg-gray-900/50 p-8 transition-all duration-300 ease-in-out",
      "hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/50 hover:bg-gray-800/50"
    )}
  >
    {/* Icon */}
    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/50">
      {icon}
    </div>
    {/* Title and Description */}
    <h3 className="mb-3 text-2xl font-bold text-white">{title}</h3>
    <p className="mb-6 text-gray-400 text-lg leading-relaxed">{description}</p>
    {/* Benefits List */}
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center gap-3">
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
            <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"></div>
          </div>
          <span className="text-gray-300">{benefit}</span>
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
        "Simply drag & drop or capture a photo of any automotive or industrial part from your device.",
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
      className={cn("w-full bg-black py-16 sm:py-24 relative overflow-hidden", className)}
      {...props}
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30 mb-6">
            <span className="text-sm text-purple-300 font-medium">
              Simple 3-Step Process
            </span>
          </div>
          <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent sm:text-6xl mb-6">
            How It Works
          </h2>
          <p className="mt-4 text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto">
            Get accurate part identification in seconds with our streamlined AI-powered workflow
          </p>
        </div>

        {/* Step Indicators */}
        <div className="relative mx-auto mb-12 w-full max-w-4xl">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-0.5 w-[66.6667%] -translate-y-1/2 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"
          ></div>
          <div className="relative grid grid-cols-3">
            {stepsData.map((_, index) => (
              <div
                key={index}
                className="flex h-10 w-10 items-center justify-center justify-self-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-white ring-4 ring-black shadow-lg shadow-purple-500/50"
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

