import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";
import { Users } from "lucide-react";

const StaggerTestimonialsDemo = () => {
  return (
    <section className="relative py-24 overflow-hidden bg-black w-full">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 px-4">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30 mb-8">
            <Users className="w-4 h-4 text-green-400 mr-2" />
            <span className="text-sm text-green-300 font-medium">
              Success Stories
            </span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-6">
            Trusted by Industry Leaders
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            See how leading manufacturers and repair shops are transforming their operations with SpareFinder's AI-powered part identification
          </p>
        </div>

        {/* Testimonials Component */}
        <StaggerTestimonials />

        {/* Bottom CTA */}
        <div className="text-center mt-16 px-4">
          <p className="text-gray-400 mb-6">
            Join 500+ companies already transforming their operations
          </p>
        </div>
      </div>
    </section>
  );
};

export default StaggerTestimonialsDemo;

