import { Factory } from "lucide-react";
import FeatureCarousel from "@/components/ui/feature-carousel";

const IndustrialApplications = () => {
  return (
    <section
      id="industries"
      className="relative overflow-hidden bg-background px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-12 text-center md:mb-16">
          <div className="mb-8 inline-flex items-center rounded-full border border-[#6A2D95]/25 bg-gradient-to-r from-[#6A2D95]/10 via-[#8F39BB]/10 to-[#6A2D95]/5 px-4 py-2 text-sm font-medium text-[#6A2D95] shadow-sm backdrop-blur-xl">
            <Factory className="mr-2 h-4 w-4" />
            <span>Industry Applications</span>
          </div>
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Serving Every Industry
          </h2>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-muted-foreground">
            From automotive to aerospace, our AI-powered part identification works
            across all major industrial sectors
          </p>
        </div>

        <FeatureCarousel />

        <p className="mt-12 text-center text-lg text-muted-foreground md:mt-16">
          Don&apos;t see your industry? Our AI recognizes parts across 50+ categories
        </p>
      </div>
    </section>
  );
};

export default IndustrialApplications;
