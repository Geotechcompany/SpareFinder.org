import { useEffect, useState } from "react";

type UseDeferCanvasMountOptions = {
  /** Max wait before running even if the main thread stays busy (requestIdleCallback). */
  idleTimeoutMs?: number;
};

/**
 * Delays mounting heavy WebGL/canvas subtrees until after paint and an idle slice
 * (or a short timeout fallback), so initial metrics are less likely to wait on large chunks.
 */
export function useDeferCanvasMount({
  idleTimeoutMs = 1500,
}: UseDeferCanvasMountOptions = {}) {
  const [mountHeavy, setMountHeavy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf2Id = 0;
    let idleCallbackId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const enable = () => {
      if (!cancelled) setMountHeavy(true);
    };

    const raf1Id = requestAnimationFrame(() => {
      raf2Id = requestAnimationFrame(() => {
        if (cancelled) return;
        if (typeof requestIdleCallback === "function") {
          idleCallbackId = requestIdleCallback(enable, {
            timeout: idleTimeoutMs,
          });
        } else {
          timeoutId = setTimeout(enable, 200);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1Id);
      cancelAnimationFrame(raf2Id);
      if (idleCallbackId !== undefined && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [idleTimeoutMs]);

  return mountHeavy;
}
