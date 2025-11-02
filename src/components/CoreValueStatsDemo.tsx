import CoreValueStats, { CoreStat } from "@/components/ui/core-value-stats";

export default function CoreValueStatsDemo() {
  const stats: CoreStat[] = [
    {
      value: "99.9%",
      label: "AI Accuracy",
      description: "Industry-leading part identification accuracy powered by advanced computer vision and neural networks.",
    },
    {
      value: "10M+",
      label: "Parts Database",
      description: "Comprehensive catalog of automotive and industrial parts from over 1,000 verified manufacturers worldwide.",
    },
    {
      value: "50+",
      label: "Industrial Categories",
      description: "From automotive to heavy machinery, our AI recognizes parts across all major industrial sectors.",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800",
    },
    {
      value: "24/7",
      label: "Expert Support",
      description: "Round-the-clock technical support from automotive engineers and part identification specialists.",
    },
    {
      value: "500+",
      label: "Enterprise Clients",
      description: "Trusted by leading manufacturers, repair shops, and industrial operations globally for reliable part sourcing.",
    },
  ];

  return (
    <CoreValueStats 
      title="Building the Future of Part Identification with AI"
      subtitle="Why Choose SpareFinder"
      description="From instant recognition to verified suppliers, we provide the most comprehensive AI-powered part identification platform for the modern industrial era."
      stats={stats}
    />
  );
}

