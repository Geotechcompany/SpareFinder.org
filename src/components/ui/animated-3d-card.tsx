import React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface Animated3DCardProps {
  title?: string;
  subtitle?: string;
  image?: string;
  className?: string;
}

export const Animated3DCard: React.FC<Animated3DCardProps> = ({
  title = "3D Product Card",
  subtitle = "This card tilts dynamically based on cursor movement.",
  image = "https://images.unsplash.com/photo-1545239705-1560b1df47de?q=80&w=1000&auto=format",
  className,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);

    x.set(offsetX);
    y.set(offsetY);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={cn(
        "relative h-96 w-full rounded-2xl bg-gray-900/80 backdrop-blur-sm p-4 shadow-xl border border-gray-800 flex flex-col items-center justify-between cursor-pointer select-none hover:border-purple-500/50 transition-colors duration-300",
        className
      )}
      style={{
        perspective: 1000,
      }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={reset}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative h-full w-full rounded-xl bg-gray-950 overflow-hidden border border-gray-800"
      >
        {/* Image */}
        <div className="h-56 w-full overflow-hidden rounded-t-lg">
          <motion.img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            style={{ transform: "translateZ(40px)" }}
          />
        </div>

        {/* Text */}
        <motion.div
          className="p-6"
          style={{
            transform: "translateZ(50px)",
          }}
        >
          <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{subtitle}</p>
        </motion.div>

        {/* Bottom Shadow Element */}
        <motion.div
          className="absolute inset-0 rounded-xl shadow-2xl opacity-20 bg-gradient-to-t from-purple-900/50 to-transparent"
          style={{
            zIndex: -1,
            transform: "translateZ(-20px)",
          }}
        />
      </motion.div>
    </motion.div>
  );
};


