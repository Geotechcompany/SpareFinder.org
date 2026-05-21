import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Car,
  Truck,
  Plane,
  Cog,
  Ship,
  Tractor,
  Factory,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureCarouselItem {
  id: string;
  label: string;
  icon: LucideIcon;
  image: string;
  description: string;
}

const IMAGE_PARAMS = "w=1200&h=1600&fit=crop&q=80";
const FALLBACK_IMAGE = `https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?${IMAGE_PARAMS}`;

const unsplash = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?${IMAGE_PARAMS}`;

export const INDUSTRY_FEATURES: FeatureCarouselItem[] = [
  {
    id: "automotive",
    label: "Automotive & OEM",
    icon: Car,
    image: unsplash("1486262715619-67b85e0b08d3"),
    description:
      "Streamline assembly lines with instant identification for vehicles, engines, and transmission systems.",
  },
  {
    id: "heavy-equipment",
    label: "Heavy Equipment",
    icon: Truck,
    image: unsplash("1581094271901-8022df4466f9"),
    description:
      "Identify parts for excavators, bulldozers, and construction machinery in the field.",
  },
  {
    id: "aerospace",
    label: "Aerospace",
    icon: Plane,
    image: unsplash("1436262513933-a0b06755c784"),
    description:
      "Precision matching for aircraft parts, avionics, and critical components with verified OEM specs.",
  },
  {
    id: "industrial",
    label: "Industrial Machinery",
    icon: Cog,
    image: unsplash("1565793298595-6a879b1d9492"),
    description:
      "CNC, automation, and plant equipment spares sourced from verified suppliers worldwide.",
  },
  {
    id: "marine",
    label: "Marine & Ship",
    icon: Ship,
    image: unsplash("1569263979104-865ab7cd8d13"),
    description:
      "Marine engines, navigation systems, and vessel parts with full technical specifications.",
  },
  {
    id: "agriculture",
    label: "Agriculture",
    icon: Tractor,
    image: unsplash("1625246333195-78d9c38ad449"),
    description:
      "Tractors, harvesters, and irrigation systems with compatibility and cross-reference data.",
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    icon: Factory,
    image: unsplash("1581091226825-a6a2a5aee158"),
    description:
      "Production-line downtime cut with fast spare identification across MRO and procurement teams.",
  },
  {
    id: "energy",
    label: "Energy & Utilities",
    icon: Zap,
    image: unsplash("1509391366360-2e959784a276"),
    description:
      "Power generation and utility assets supported with 24/7 identification when outages matter.",
  },
];

const AUTO_PLAY_INTERVAL = 3000;
const ITEM_HEIGHT = 65;
const CAROUSEL_ACCENT = "#6A2D95";
const CAROUSEL_ACCENT_LIGHT = "#8F39BB";
const CAROUSEL_ACCENT_DEEP = "#3D1A54";
const CAROUSEL_PANEL_GRADIENT = `linear-gradient(145deg, ${CAROUSEL_ACCENT_DEEP} 0%, ${CAROUSEL_ACCENT} 42%, ${CAROUSEL_ACCENT_LIGHT} 78%, #5a2d82 100%)`;

function CarouselImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => {
        if (imgSrc !== FALLBACK_IMAGE) setImgSrc(FALLBACK_IMAGE);
      }}
      className={className}
    />
  );
}

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export interface FeatureCarouselProps {
  features?: FeatureCarouselItem[];
  className?: string;
}

export function FeatureCarousel({
  features = INDUSTRY_FEATURES,
  className,
}: FeatureCarouselProps) {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentIndex =
    ((step % features.length) + features.length) % features.length;

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + features.length) % features.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const len = features.length;

    let normalizedDiff = diff;
    if (diff > len / 2) normalizedDiff -= len;
    if (diff < -len / 2) normalizedDiff += len;

    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  return (
    <div className={cn("mx-auto w-full max-w-7xl md:p-8", className)}>
      <div className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-background shadow-[0_28px_90px_-20px_rgba(61,26,84,0.55)] ring-1 ring-[#6A2D95]/10 lg:aspect-video lg:flex-row lg:rounded-[4rem]">
        <div
          className="relative z-30 flex min-h-[350px] w-full flex-col items-start justify-center overflow-hidden px-8 md:min-h-[450px] md:px-16 lg:h-full lg:w-[40%] lg:pl-16"
          style={{ background: CAROUSEL_PANEL_GRADIENT }}
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#8F39BB]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-[#3D1A54]/50 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(255,255,255,0.14)_0%,transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(143,57,187,0.35)_0%,transparent_50%)]" />
          <div className="absolute inset-x-0 top-0 z-40 h-14 bg-gradient-to-b from-[#3D1A54]/80 via-[#6A2D95]/30 to-transparent md:h-24 lg:h-20" />
          <div className="absolute inset-x-0 bottom-0 z-40 h-14 bg-gradient-to-t from-[#3D1A54]/80 via-[#6A2D95]/30 to-transparent md:h-24 lg:h-20" />
          <div className="relative z-20 flex h-full w-full items-center justify-center lg:justify-start">
            {features.map((feature, index) => {
              const isActive = index === currentIndex;
              const distance = index - currentIndex;
              const wrappedDistance = wrap(
                -(features.length / 2),
                features.length / 2,
                distance
              );

              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.id}
                  style={{
                    height: ITEM_HEIGHT,
                    width: "fit-content",
                  }}
                  animate={{
                    y: wrappedDistance * ITEM_HEIGHT,
                    opacity: 1 - Math.abs(wrappedDistance) * 0.25,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 90,
                    damping: 22,
                    mass: 1,
                  }}
                  className="absolute flex items-center justify-start"
                >
                  <button
                    type="button"
                    onClick={() => handleChipClick(index)}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-full border px-6 py-3.5 text-left transition-all duration-500 md:px-10 md:py-5 lg:px-8 lg:py-4",
                      isActive
                        ? "z-10 border-white/90 bg-gradient-to-br from-white via-white to-violet-50/90 text-[#6A2D95] shadow-[0_10px_40px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]"
                        : "border-white/25 bg-white/10 text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md hover:border-white/45 hover:bg-white/15 hover:text-white"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center transition-colors duration-500",
                        !isActive && "text-white/40"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    </div>

                    <span className="whitespace-nowrap text-sm font-normal uppercase tracking-tight md:text-[15px]">
                      {feature.label}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="relative flex min-h-[500px] flex-1 flex-col items-center justify-center overflow-hidden border-t border-[#6A2D95]/10 bg-gradient-to-br from-muted/50 via-background to-secondary/40 px-6 py-16 md:min-h-[600px] md:px-12 md:py-24 lg:h-full lg:border-l lg:border-t-0 lg:px-10 lg:py-16">
          <div className="pointer-events-none absolute right-0 top-1/4 h-48 w-48 rounded-full bg-[#8F39BB]/8 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-[#6A2D95]/10 blur-3xl" />
          <div className="relative flex aspect-[4/5] w-full max-w-[420px] items-center justify-center">
            {features.map((feature, index) => {
              const status = getCardStatus(index);
              const isActive = status === "active";
              const isPrev = status === "prev";
              const isNext = status === "next";

              return (
                <motion.div
                  key={feature.id}
                  initial={false}
                  animate={{
                    x: isActive ? 0 : isPrev ? -100 : isNext ? 100 : 0,
                    scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                    opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0,
                    rotate: isPrev ? -3 : isNext ? 3 : 0,
                    zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 origin-center overflow-hidden rounded-[2rem] border-4 border-white/20 bg-background shadow-[0_20px_60px_-15px_rgba(61,26,84,0.35)] ring-1 ring-[#6A2D95]/15 md:rounded-[2.8rem] md:border-8"
                >
                  <CarouselImage
                    src={feature.image}
                    alt={feature.label}
                    priority={isActive}
                    className={cn(
                      "h-full w-full object-cover transition-all duration-700",
                      isActive
                        ? "grayscale-0 blur-0"
                        : "brightness-75 blur-[2px] grayscale"
                    )}
                  />

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-10 pt-32"
                      >
                        <div className="mb-3 w-fit rounded-full border border-white/20 bg-gradient-to-r from-[#6A2D95] to-[#8F39BB] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white shadow-lg shadow-[#6A2D95]/30">
                          {index + 1} • {feature.label}
                        </div>
                        <p className="text-xl font-normal leading-tight tracking-tight text-white drop-shadow-md md:text-2xl">
                          {feature.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    className={cn(
                      "absolute left-8 top-8 flex items-center gap-3 transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                    <span className="font-mono text-[10px] font-normal uppercase tracking-[0.3em] text-white/80">
                      AI Identification
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
