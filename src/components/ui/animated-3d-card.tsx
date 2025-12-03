"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface Animated3DCardProps {
  title: string;
  subtitle: string;
  image: string;
  className?: string;
}

export function Animated3DCard({
  title,
  subtitle,
  image,
  className,
}: Animated3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-50, 50], [15, -15]);
  const rotateY = useTransform(x, [-50, 50], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const posX = e.clientX - rect.left - rect.width / 2;
    const posY = e.clientY - rect.top - rect.height / 2;

    x.set(posX);
    y.set(posY);
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "group relative h-full w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-card/95 text-foreground shadow-soft-elevated backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80",
        className
      )}
      style={{
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
        }}
        className="h-full w-full rounded-xl transition-transform duration-75"
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent dark:from-gray-900 dark:via-gray-900/50" />
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="mb-3 text-2xl font-bold text-foreground transition-colors duration-300 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-300">
            {title}
          </h3>
          <p className="leading-relaxed text-muted-foreground transition-colors duration-300 group-hover:text-foreground dark:text-gray-400 dark:group-hover:text-gray-300">
            {subtitle}
          </p>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </motion.div>
    </motion.div>
  );
}
