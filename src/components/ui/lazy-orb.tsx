import { lazy, Suspense } from "react";
import { useDeferCanvasMount } from "@/hooks/use-defer-canvas-mount";

const Orb = lazy(() => import("@/components/ui/Orb"));

/** Mirrors props on `Orb` without a synchronous import of the WebGL bundle. */
export type LazyOrbProps = {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
  className?: string;
};

export function LazyOrb(props: LazyOrbProps) {
  const mountHeavy = useDeferCanvasMount();
  const fallback = (
    <div
      className={props.className}
      style={{ minHeight: "12rem" }}
      aria-hidden
    />
  );
  if (!mountHeavy) return fallback;

  return (
    <Suspense fallback={fallback}>
      <Orb {...props} />
    </Suspense>
  );
}
