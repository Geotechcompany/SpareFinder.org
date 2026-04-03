import { lazy, Suspense } from "react";
import { useDeferCanvasMount } from "@/hooks/use-defer-canvas-mount";

const Scene = lazy(async () => {
  const m = await import("@/components/ui/hero-section");
  return { default: m.Scene };
});

const heroFallback = (
  <div
    className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-black"
    aria-hidden
  />
);

export function LazyHeroScene() {
  const mountHeavy = useDeferCanvasMount();
  if (!mountHeavy) return heroFallback;

  return (
    <Suspense fallback={heroFallback}>
      <Scene />
    </Suspense>
  );
}
