import { Animated3DCard } from "@/components/ui/animated-3d-card";
import { Factory } from "lucide-react";

const IndustrialApplications = () => {
  const applications = [
    {
      title: "Engineering spares Engineering spares",
      subtitle: "Streamline assembly lines with instant part identification for vehicles, engines, and transmission systems.",
      image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&h=600&q=80",
    },
    {
      title: "Heavy Equipment",
      subtitle: "Identify parts for construction machinery, excavators, bulldozers, and industrial equipment rapidly.",
      image: "https://images.unsplash.com/photo-1581094271901-8022df4466f9?auto=format&fit=crop&w=800&h=600&q=80",
    },
    {
      title: "Aerospace Components",
      subtitle: "Precision identification of aircraft parts, avionics, and critical aerospace components with verified OEM specs.",
      image: "https://images.unsplash.com/photo-1436262513933-a0b06755c784?auto=format&fit=crop&w=800&h=600&q=80",
    },
    {
      title: "Industrial Machinery",
      subtitle: "Engineering spares equipment, CNC machines, and industrial automation parts sourced from verified suppliers.",
      image: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=800&h=600&q=80",
    },
    {
      title: "Marine & Ship Parts",
      subtitle: "Marine engine components, navigation systems, and vessel parts identified with technical specifications.",
      image: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=800&h=600&q=80",
    },
    {
      title: "Agricultural Equipment",
      subtitle: "Farming machinery parts, tractors, harvesters, and irrigation systems with complete compatibility data.",
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&h=600&q=80",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-background py-24 px-4 sm:px-6 lg:px-8 dark:bg-black">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#3A5AFE0F] blur-3xl dark:bg-purple-500/5" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#06B6D40F] blur-3xl dark:bg-blue-500/5" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-20 text-center">
          <div className="mb-8 inline-flex items-center rounded-full border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-red-500/10 px-4 py-2 text-sm font-medium text-orange-500 shadow-soft-elevated backdrop-blur-xl dark:text-orange-300">
            <Factory className="mr-2 h-4 w-4 text-orange-400" />
            <span>
              Industry Applications
            </span>
          </div>
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl dark:bg-gradient-to-r dark:from-white dark:via-orange-200 dark:to-red-200 dark:bg-clip-text dark:text-transparent">
            Serving Every Industry
          </h2>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-muted-foreground dark:text-gray-400">
            From Engineering spares to aerospace, our AI-powered part identification works across all major industrial sectors
          </p>
        </div>

        {/* 3D Cards Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app, index) => (
            <Animated3DCard
              key={index}
              title={app.title}
              subtitle={app.subtitle}
              image={app.image}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-lg text-muted-foreground dark:text-gray-400">
            Don't see your industry? Our AI recognizes parts across 50+ categories
          </p>
        </div>
      </div>
    </section>
  );
};

export default IndustrialApplications;

