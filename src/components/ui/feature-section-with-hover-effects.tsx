import { cn } from "@/lib/utils";
import {
  Cpu,
  Database,
  Zap,
  Cloud,
  Server,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  index: number;
}

interface FeaturesSectionProps {
  features?: Array<{
    title: string;
    description: string;
    icon: LucideIcon;
  }>;
}

export function FeaturesSectionWithHoverEffects({
  features: customFeatures,
}: FeaturesSectionProps = {}) {
  const defaultFeatures = [
    {
      title: "AI-Powered Recognition",
      description:
        "Advanced computer vision models identify parts with 99.9% accuracy across 50+ industrial categories",
      icon: Cpu,
    },
    {
      title: "Comprehensive Database",
      description:
        "Over 10 million parts from 1000+ manufacturers with detailed specifications and pricing",
      icon: Database,
    },
    {
      title: "Instant Results",
      description:
        "Get complete part information, specifications, and supplier contacts in milliseconds",
      icon: Zap,
    },
    {
      title: "Multi-Format Support",
      description:
        "Upload images, PDFs, CAD files, or even capture photos directly from your mobile device",
      icon: Cloud,
    },
    {
      title: "Enterprise Integration",
      description:
        "REST APIs, webhook support, and seamless integration with ERP systems and inventory management",
      icon: Server,
    },
    {
      title: "Quality Assurance",
      description:
        "Verified suppliers, authentic parts, and comprehensive warranty information to ensure reliability",
      icon: ShieldCheck,
    },
  ];

  const features = customFeatures || defaultFeatures;

  return (
    <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 py-10 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon: Icon,
  index,
}: Feature & { icon: LucideIcon }) => {
  return (
    <div
      className={cn(
        "group/feature relative flex flex-col border-border/60 py-10 lg:border-r dark:border-gray-800/50",
        (index === 0 || index === 3) &&
          "lg:border-l border-border/60 dark:border-gray-800/50",
        index < 3 && "lg:border-b border-border/60 dark:border-gray-800/50"
      )}
    >
      {index < 3 ? (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      ) : (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-blue-900/20 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="relative z-10 mb-4 px-10 text-primary transition-colors duration-200 group-hover/feature:text-primary/80 dark:text-purple-400 dark:group-hover/feature:text-purple-300">
        <Icon className="w-8 h-8" />
      </div>

      <div className="relative z-10 mb-2 px-10 text-lg font-bold">
        <div className="absolute inset-y-0 left-0 h-6 w-1 origin-center rounded-tr-full rounded-br-full bg-border transition-all duration-200 group-hover/feature:h-8 group-hover/feature:bg-gradient-to-b group-hover/feature:from-[#3A5AFE] group-hover/feature:to-[#8B5CF6] dark:bg-gray-700" />
        <span className="inline-block translate-x-0 text-foreground transition duration-200 group-hover/feature:translate-x-2 group-hover/feature:bg-gradient-to-r group-hover/feature:from-[#3A5AFE] group-hover/feature:to-[#8B5CF6] group-hover/feature:bg-clip-text group-hover/feature:text-transparent dark:text-white">
          {title}
        </span>
      </div>

      <p className="relative z-10 max-w-xs px-10 text-sm leading-relaxed text-muted-foreground transition-colors duration-200 group-hover/feature:text-foreground dark:text-gray-400 dark:group-hover/feature:text-gray-300">
        {description}
      </p>
    </div>
  );
};
