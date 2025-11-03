import { Animated3DCard } from "@/components/ui/animated-3d-card";
import { Factory } from "lucide-react";

const IndustrialApplications = () => {
  const applications = [
    {
      title: "Automotive Manufacturing",
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
      subtitle: "Manufacturing equipment, CNC machines, and industrial automation parts sourced from verified suppliers.",
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
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-black">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full border border-orange-500/30 mb-8">
            <Factory className="w-4 h-4 text-orange-400 mr-2" />
            <span className="text-sm text-orange-300 font-medium">
              Industry Applications
            </span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-orange-200 to-red-200 bg-clip-text text-transparent mb-6">
            Serving Every Industry
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            From automotive to aerospace, our AI-powered part identification works across all major industrial sectors
          </p>
        </div>

        {/* 3D Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        <div className="text-center mt-20">
          <p className="text-gray-400 text-lg">
            Don't see your industry? Our AI recognizes parts across 50+ categories
          </p>
        </div>
      </div>
    </section>
  );
};

export default IndustrialApplications;

