import * as React from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type DockItemData = {
  to: string;
  Icon: React.ReactNode;
  label?: string;
  external?: boolean;
};

export type AnimatedDockProps = {
  className?: string;
  items: DockItemData[];
};

export function AnimatedDock({ className, items }: AnimatedDockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 items-end gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 pb-3 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]",
        className
      )}
    >
      {items.map((item, index) => (
        <DockItem key={`${item.to}-${index}`} mouseX={mouseX} label={item.label}>
          {item.external ? (
            <a
              href={item.to}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full w-full grow items-center justify-center text-white"
              aria-label={item.label}
            >
              {item.Icon}
            </a>
          ) : (
            <Link
              to={item.to}
              className="flex h-full w-full grow items-center justify-center text-white"
              aria-label={item.label}
            >
              {item.Icon}
            </Link>
          )}
        </DockItem>
      ))}
    </motion.div>
  );
}

type DockItemProps = {
  mouseX: MotionValue<number>;
  label?: string;
  children: React.ReactNode;
};

function DockItem({ mouseX, label, children }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const iconScale = useTransform(width, [40, 80], [1, 1.45]);
  const iconSpring = useSpring(iconScale, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const icon = (
    <motion.div
      ref={ref}
      style={{ width }}
      className="flex aspect-square w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25 ring-1 ring-white/20"
    >
      <motion.div
        style={{ scale: iconSpring }}
        className="flex h-full w-full grow items-center justify-center"
      >
        {children}
      </motion.div>
    </motion.div>
  );

  if (!label) return icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{icon}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
