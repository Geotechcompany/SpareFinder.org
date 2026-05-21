import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

function cx(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(" ");
}

export interface FlowSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  "aria-label"?: string;
}

export const FlowSection: React.FC<FlowSectionProps> = ({
  className,
  style = {},
  children,
  "aria-label": ariaLabel,
}) => (
  <section
    data-flow-section
    aria-label={ariaLabel}
    className="relative min-h-[100dvh] min-h-screen w-full overflow-hidden"
  >
    <div
      data-flow-inner
      className={cn(
        "flow-art-container relative flex min-h-[100dvh] min-h-screen w-full flex-col justify-between gap-6 px-[4vw] pt-[clamp(2rem,8vw,4vw)] pb-[4vw]",
        "will-change-transform",
        className
      )}
      style={{ transformOrigin: "bottom left", ...style }}
    >
      {children}
    </div>
  </section>
);

export interface FlowArtProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

const childCount = (children: React.ReactNode) => React.Children.count(children);

const FlowArt: React.FC<FlowArtProps> = ({
  children,
  className,
  "aria-label": ariaLabel = "Story scroll",
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current || reducedMotion) return;

      const sections = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>("[data-flow-section]")
      );
      if (sections.length === 0) return;

      const triggers: ScrollTrigger[] = [];

      sections.forEach((section, i) => {
        gsap.set(section, { zIndex: i + 1 });

        const inner = section.querySelector<HTMLElement>(".flow-art-container");
        if (!inner) return;

        gsap.set(inner, {
          transformOrigin: "bottom left",
          force3D: true,
          rotation: i === 0 ? 0 : 30,
        });

        if (i > 0) {
          const tween = gsap.to(inner, {
            rotation: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top 25%",
              scrub: true,
            },
          });
          if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        }

        if (i < sections.length - 1) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: "bottom bottom",
              end: "bottom top",
              pin: true,
              pinSpacing: false,
              pinReparent: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            })
          );
        }
      });

      const refresh = () => ScrollTrigger.refresh();
      refresh();
      requestAnimationFrame(refresh);

      return () => {
        triggers.forEach((t) => t.kill());
        ScrollTrigger.getAll().forEach((st) => {
          const trigger = st.trigger;
          if (
            trigger instanceof Node &&
            containerRef.current?.contains(trigger)
          ) {
            st.kill();
          }
        });
      };
    },
    { scope: containerRef, dependencies: [childCount(children), reducedMotion] }
  );

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const refresh = () => ScrollTrigger.refresh();
    const t1 = window.setTimeout(refresh, 100);
    const t2 = window.setTimeout(refresh, 600);
    const t3 = window.setTimeout(refresh, 1500);
    window.addEventListener("resize", refresh);
    window.addEventListener("load", refresh);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) refresh();
      },
      { threshold: 0, rootMargin: "200px 0px" }
    );
    observer.observe(containerRef.current);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("load", refresh);
      observer.disconnect();
    };
  }, [reducedMotion, childCount(children)]);

  return (
    <main
      ref={containerRef}
      data-flow-art
      aria-label={ariaLabel}
      className={cx("relative w-full overflow-x-hidden", className)}
    >
      {children}
    </main>
  );
};

export default FlowArt;
