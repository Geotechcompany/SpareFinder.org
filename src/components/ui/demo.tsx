import { Scene } from "@/components/ui/hero-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cpu, ShieldCheck, Layers, Zap } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "Performance",
    description: "Ultra-fast data processing in every situation.",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description: "Advanced protection for complete peace of mind.",
  },
  {
    icon: Layers,
    title: "Modularity",
    description: "Easy integration with existing architecture.",
  },
  {
    icon: Zap,
    title: "Responsiveness",
    description: "Instant response to every command.",
  },
];

const DemoOne = () => (
  <div className="min-h-[90vh] w-full bg-gradient-to-br from-[#000] to-[#1A2428] text-white flex flex-col items-center justify-center pt-0 px-4 sm:px-6 lg:px-8 pb-8 relative">
    <div className="w-full max-w-6xl space-y-8 relative z-10">
      <div className="flex flex-col items-center text-center space-y-6">
        <Badge
          variant="secondary"
          className="backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 px-4 py-2 rounded-full"
        >
          ✨ Next Generation Tools
        </Badge>

        <div className="space-y-4 flex items-center justify-center flex-col">
          <h1 className="text-3xl md:text-6xl font-semibold tracking-tight max-w-3xl">
            Next-Generation AI Technology
          </h1>
          <p className="text-lg text-neutral-300 max-w-2xl">
            Revolutionary computer vision technology that identifies industrial
            parts with 99.9% accuracy in milliseconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Button className="text-sm px-8 py-3 rounded-xl bg-white text-black border border-white/10 hover:bg-white/90 transition-none">
              Get Started
            </Button>
            <Button className="text-sm px-8 py-3 rounded-xl bg-transparent text-white border border-white/20 hover:bg-white/10 transition-none">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 h-36 md:h-40 flex flex-col justify-start items-start space-y-2"
          >
            <feature.icon size={18} className="text-white/80" />
            <h3 className="text-sm md:text-base font-medium">
              {feature.title}
            </h3>
            <p className="text-xs md:text-sm text-neutral-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
    <div className="absolute inset-0">
      <Scene />
    </div>
  </div>
);

export { DemoOne };
