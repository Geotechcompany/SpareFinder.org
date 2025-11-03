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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 relative z-10 py-10 max-w-7xl mx-auto">
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
        "flex flex-col lg:border-r py-10 relative group/feature border-gray-800/50",
        (index === 0 || index === 3) && "lg:border-l border-gray-800/50",
        index < 3 && "lg:border-b border-gray-800/50"
      )}
    >
      {index < 3 ? (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      ) : (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-blue-900/20 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="mb-4 relative z-10 px-10 text-purple-400 group-hover/feature:text-purple-300 transition-colors duration-200">
        <Icon className="w-8 h-8" />
      </div>

      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-gray-700 group-hover/feature:bg-gradient-to-b group-hover/feature:from-purple-500 group-hover/feature:to-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-white group-hover/feature:bg-gradient-to-r group-hover/feature:from-purple-300 group-hover/feature:to-blue-300 group-hover/feature:bg-clip-text group-hover/feature:text-transparent">
          {title}
        </span>
      </div>

      <p className="text-sm text-gray-400 group-hover/feature:text-gray-300 max-w-xs relative z-10 px-10 transition-colors duration-200 leading-relaxed">
        {description}
      </p>
    </div>
  );
};
