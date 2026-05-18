import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AdminPageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
