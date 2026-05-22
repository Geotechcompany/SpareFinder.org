import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HERO_DISPLAY_FRAME_COUNT,
  HERO_POSTER_SRC,
  heroFrameSrc,
} from "@/lib/hero-frames";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = HERO_DISPLAY_FRAME_COUNT;
const PRELOAD_NEIGHBOR_RADIUS = 2;
const IDLE_PRELOAD_STRIDE = 6;

export interface HeroScene {
  badge: string;
  title: string;
  subtitle: string;
}

/** Per-scene headline gradient accents (brand violet + modern neutrals) */
const HERO_TITLE_GRADIENTS = [
  "bg-gradient-to-br from-white via-violet-100 to-violet-300",
  "bg-gradient-to-br from-white via-fuchsia-100 to-[#c084fc]",
  "bg-gradient-to-br from-zinc-50 via-purple-200 to-[#6A2D95]",
  "bg-gradient-to-br from-white via-indigo-100 to-violet-400",
  "bg-gradient-to-br from-white via-[#ede9fe] to-[#a78bfa]",
  "bg-gradient-to-br from-cyan-50 via-violet-100 to-[#8F39BB]",
] as const;

/** Shared eyebrow across all hero scroll scenes */
const HERO_EYEBROW = "AI-Powered Industrial Intelligence";

const HERO_SCENES: HeroScene[] = [
  {
    badge: HERO_EYEBROW,
    title: "One photo.\nInstant ID.",
    subtitle:
      "Identify any spare, verify specs, and find trusted suppliers without the guesswork.",
  },
  {
    badge: HERO_EYEBROW,
    title: "IDENTIFY\nANY PART.\nIN SECONDS.",
    subtitle:
      "Advanced AI computer vision for engineering spares, heavy equipment, and industrial machinery. From worn components to unlabeled assemblies, with instant matches and confidence scoring.",
  },
  {
    badge: HERO_EYEBROW,
    title: "THE AI ENGINE\nFOR INDUSTRIAL\nPART IDENTIFICATION.",
    subtitle:
      "Deep AI analysis trained on millions of industrial components. Detect. Verify. Source. Replace. All from a single image.",
  },
  {
    badge: HERO_EYEBROW,
    title: "FROM SHOP\nFLOOR TO\nSUPPLY CHAIN.",
    subtitle:
      "AI-powered recognition for engineering spares, industrial machinery, and critical replacement parts. Reduce downtime with instant identification, verified suppliers, and procurement-ready insights.",
  },
  {
    badge: HERO_EYEBROW,
    title: "INDUSTRIAL AI\nTHAT THINKS\nLIKE AN ENGINEER.",
    subtitle:
      "SpareFinder transforms photos into actionable procurement intelligence using next-generation computer vision and deep research agents.",
  },
  {
    badge: HERO_EYEBROW,
    title: "DETECT. VERIFY.\nSOURCE. REPLACE.",
    subtitle:
      "Upload a photo. Instantly identify components, verify compatibility, and locate trusted suppliers worldwide.",
  },
];

const SCENE_COUNT = HERO_SCENES.length;

/** One headline per equal slice of hero scroll (0–1). */
function sceneIndexFromProgress(progress: number) {
  if (progress >= 1) return SCENE_COUNT - 1;
  return Math.min(SCENE_COUNT - 1, Math.max(0, Math.floor(progress * SCENE_COUNT)));
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (ir > cr) {
    sw = sh * cr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = sw / cr;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
}

type HeroCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Bold headline rotates through each corner as you scroll */
const TITLE_CORNERS: HeroCorner[] = [
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
  "top-left",
  "top-right",
];

/** Subtitle sits on the opposite corner from the headline */
const SUBTITLE_CORNERS: HeroCorner[] = [
  "bottom-right",
  "bottom-left",
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
];

function cornerPositionClass(corner: HeroCorner) {
  switch (corner) {
    case "top-left":
      return "left-4 top-[4.75rem] sm:left-8 sm:top-24 md:left-14 md:top-28";
    case "top-right":
      return "right-4 top-[4.75rem] sm:right-8 sm:top-24 md:right-14 md:top-28";
    case "bottom-left":
      return "left-4 bottom-28 sm:left-8 sm:bottom-32 md:left-14 md:bottom-36";
    case "bottom-right":
      return "right-4 bottom-28 sm:right-8 sm:bottom-32 md:right-14 md:bottom-36";
  }
}

function cornerAlignClass(corner: HeroCorner) {
  return corner.includes("right") ? "text-right" : "text-left";
}

function HeroSceneCopy({ scene, index }: { scene: HeroScene; index: number }) {
  const titleCorner = TITLE_CORNERS[index % TITLE_CORNERS.length];
  const subtitleCorner = SUBTITLE_CORNERS[index % SUBTITLE_CORNERS.length];
  const titleAlign = cornerAlignClass(titleCorner);
  const subtitleAlign = cornerAlignClass(subtitleCorner);
  const titleGradient = HERO_TITLE_GRADIENTS[index % HERO_TITLE_GRADIENTS.length];
  const displayFont =
    index % 2 === 0 ? "hero-font-display" : "hero-font-display-alt";

  return (
    <>
      <div
        className={cn(
          "absolute z-20 max-w-[min(94vw,40rem)]",
          cornerPositionClass(titleCorner),
          titleAlign
        )}
      >
        <div
          className={cn(
            "hero-font-body mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-gradient-to-r from-[#6A2D95]/40 via-black/45 to-black/35 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-100/95 shadow-[0_0_28px_rgba(106,45,149,0.35)] backdrop-blur-md",
            titleAlign === "text-right" && "ml-auto"
          )}
        >
          <Sparkles className="h-3 w-3 shrink-0 text-[#c4b5fd]" aria-hidden />
          {scene.badge}
        </div>
        <p
          className={cn(
            displayFont,
            "hero-text-gradient whitespace-pre-line text-[clamp(1.75rem,8vw,4.75rem)] font-bold leading-[0.92] tracking-[-0.02em] drop-shadow-[0_8px_32px_rgba(106,45,149,0.45)]",
            index === 0 ? "normal-case" : "uppercase",
            titleGradient
          )}
        >
          {scene.title}
        </p>
      </div>

      <div
        className={cn(
          "absolute z-20 max-w-[min(88vw,30rem)]",
          cornerPositionClass(subtitleCorner),
          subtitleAlign
        )}
      >
        <p
          className="hero-font-body mb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-300/70"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")} / {String(SCENE_COUNT).padStart(2, "0")}
        </p>
        <p
          className={cn(
            "hero-font-body text-[clamp(0.9rem,3.5vw,1.65rem)] font-medium leading-relaxed text-violet-50/90 drop-shadow-[0_2px_20px_rgba(0,0,0,0.45)]",
            "max-w-prose [&_strong]:font-semibold [&_strong]:text-white"
          )}
        >
          {scene.subtitle}
        </p>
      </div>
    </>
  );
}

function HeroScrollButton({
  reducedMotion,
  onScroll,
}: {
  reducedMotion: boolean;
  onScroll: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onScroll}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={
        reducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, 6, 0] }
      }
      transition={
        reducedMotion
          ? { delay: 0.5, duration: 0.5 }
          : {
              opacity: { delay: 0.5, duration: 0.5 },
              y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }
      }
      aria-label="Scroll to continue"
      className={cn(
        "hero-font-body pointer-events-auto z-30 flex flex-col items-center gap-1.5 rounded-full border border-white/25",
        "bg-white/10 px-5 py-3 text-violet-100/90 shadow-[0_8px_28px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150",
        "transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.35em]">
        Scroll
      </span>
      <ChevronDown className="h-5 w-5" aria-hidden />
    </motion.button>
  );
}

function HeroTextLayers({
  activeIndex,
  visible,
}: {
  activeIndex: number;
  visible: boolean;
}) {
  const scene = HERO_SCENES[activeIndex];
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20"
      aria-live="polite"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      key={activeIndex}
    >
      <HeroSceneCopy scene={scene} index={activeIndex} />
    </motion.div>
  );
}

function SceneProgress({
  activeIndex,
  progress,
}: {
  activeIndex: number;
  progress: number;
}) {
  return (
    <div className="absolute left-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex">
      {HERO_SCENES.map((_, i) => {
        const segmentStart = i / SCENE_COUNT;
        const segmentEnd = (i + 1) / SCENE_COUNT;
        const fill = Math.min(
          1,
          Math.max(0, (progress - segmentStart) / (segmentEnd - segmentStart))
        );
        const isActive = i === activeIndex;

        return (
          <div
            key={i}
            className={cn(
              "h-10 w-1 overflow-hidden rounded-full bg-violet-950/50 ring-1 ring-violet-500/20 transition-colors duration-300",
              isActive && "bg-violet-900/60 ring-violet-400/40"
            )}
            title={`Scene ${i + 1}`}
          >
            <div
              className="w-full rounded-full bg-gradient-to-b from-[#6A2D95] to-[#8F39BB] transition-all duration-150"
              style={{ height: `${fill * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function HeroFrameScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());
  const frameRef = useRef(0);
  const sceneIndexRef = useRef(0);
  const scrollRafRef = useRef(0);
  const pendingProgressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();

  const preloadNeighbors = useCallback((index: number) => {
    for (let d = 1; d <= PRELOAD_NEIGHBOR_RADIUS; d++) {
      if (index - d >= 0) void loadFrameRef.current(index - d);
      if (index + d < FRAME_COUNT) void loadFrameRef.current(index + d);
    }
  }, []);

  const loadFrameRef = useRef<(index: number) => Promise<HTMLImageElement | null>>(
    async () => null
  );

  const loadFrame = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(FRAME_COUNT - 1, index));
    const cached = cacheRef.current.get(clamped);
    if (cached?.complete) return Promise.resolve(cached);
    if (loadingRef.current.has(clamped)) {
      return new Promise((resolve) => {
        const check = () => {
          const hit = cacheRef.current.get(clamped);
          if (hit?.complete) resolve(hit);
          else setTimeout(check, 16);
        };
        check();
      });
    }

    loadingRef.current.add(clamped);
    return new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        cacheRef.current.set(clamped, img);
        loadingRef.current.delete(clamped);
        resolve(img);
      };
      img.onerror = () => {
        loadingRef.current.delete(clamped);
        resolve(null);
      };
      img.src = heroFrameSrc(clamped);
    });
  }, []);

  loadFrameRef.current = loadFrame;

  const drawFrameToCanvas = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const img = cacheRef.current.get(index);
    if (!img?.complete) return false;

    const w = Number(canvas.dataset.logicalW) || canvas.clientWidth;
    const h = Number(canvas.dataset.logicalH) || canvas.clientHeight;
    drawCover(ctx, img, w, h);
    frameRef.current = index;
    return true;
  }, []);

  const renderFrame = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(FRAME_COUNT - 1, index));
      if (drawFrameToCanvas(clamped)) {
        if (!ready) setReady(true);
        preloadNeighbors(clamped);
        return;
      }

      void loadFrame(clamped).then((img) => {
        if (!img) return;
        if (drawFrameToCanvas(clamped)) {
          if (!ready) setReady(true);
          preloadNeighbors(clamped);
        }
      });
    },
    [drawFrameToCanvas, loadFrame, preloadNeighbors, ready]
  );

  const flushScrollProgress = useCallback(() => {
    scrollRafRef.current = 0;
    const clamped = pendingProgressRef.current;
    const frameIdx = Math.round(clamped * (FRAME_COUNT - 1));
    renderFrame(frameIdx);

    const nextScene = sceneIndexFromProgress(clamped);
    if (nextScene !== sceneIndexRef.current) {
      sceneIndexRef.current = nextScene;
      setSceneIndex(nextScene);
    }
    setProgress(clamped);
  }, [renderFrame]);

  const applyScrollProgress = useCallback(
    (p: number) => {
      pendingProgressRef.current = Math.min(1, Math.max(0, p));
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(flushScrollProgress);
    },
    [flushScrollProgress]
  );

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = HERO_POSTER_SRC;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
      canvas.dataset.logicalW = String(w);
      canvas.dataset.logicalH = String(h);
      renderFrame(frameRef.current);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [renderFrame]);

  useEffect(() => {
    void loadFrame(0).then(() => renderFrame(0));
  }, [loadFrame, renderFrame]);

  useEffect(() => {
    let cursor = IDLE_PRELOAD_STRIDE;
    let cancelled = false;

    const idlePreload = (deadline: IdleDeadline) => {
      while (!cancelled && cursor < FRAME_COUNT && deadline.timeRemaining() > 4) {
        void loadFrame(cursor);
        cursor += IDLE_PRELOAD_STRIDE;
      }
      if (!cancelled && cursor < FRAME_COUNT) {
        requestIdleCallback(idlePreload, { timeout: 2500 });
      }
    };

    const startId = requestIdleCallback(idlePreload, { timeout: 1200 });
    return () => {
      cancelled = true;
      cancelIdleCallback(startId);
    };
  }, [loadFrame]);

  useGSAP(
    () => {
      if (!scrollRef.current || reducedMotion) return;

      const trigger = ScrollTrigger.create({
        trigger: scrollRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.35,
        onUpdate: (self) => applyScrollProgress(self.progress),
      });

      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        trigger.kill();
        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      };
    },
    { scope: scrollRef, dependencies: [reducedMotion, applyScrollProgress] }
  );

  useEffect(() => {
    if (!reducedMotion) return;
    applyScrollProgress(0);
  }, [reducedMotion, applyScrollProgress]);

  const scrollHeroForward = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      return;
    }
    const scrollable = el.offsetHeight - window.innerHeight;
    const nextTop = Math.min(
      el.offsetTop + scrollable,
      window.scrollY + window.innerHeight * 0.85
    );
    window.scrollTo({ top: nextTop, behavior: "smooth" });
  }, []);

  return (
    <div
      ref={scrollRef}
      id="hero"
      className={cn(
        "relative w-full",
        reducedMotion ? "min-h-[90vh]" : "h-[420vh] sm:h-[520vh] lg:h-[600vh]"
      )}
      aria-label="SpareFinder hero"
    >
      <div className="sticky top-0 h-[100dvh] min-h-[100svh] w-full overflow-hidden bg-black">
        <h1 className="sr-only">
          SpareFinder — {HERO_EYEBROW}. One photo, instant industrial part
          identification.
        </h1>
        <img
          src={HERO_POSTER_SRC}
          alt=""
          fetchPriority="high"
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            ready ? "pointer-events-none opacity-0" : "opacity-100"
          )}
          aria-hidden
        />
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 h-full w-full will-change-transform",
            ready ? "opacity-100" : "opacity-0"
          )}
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1a0a28]/70 via-black/20 to-black/75" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_72%_18%,rgba(106,45,149,0.22)_0%,transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

        <HeroTextLayers
          activeIndex={sceneIndex}
          visible={ready || reducedMotion}
        />

        {!reducedMotion && (
          <SceneProgress activeIndex={sceneIndex} progress={progress} />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-8">
          <HeroScrollButton
            reducedMotion={reducedMotion}
            onScroll={scrollHeroForward}
          />
        </div>
      </div>
    </div>
  );
}

export default HeroFrameScroll;
