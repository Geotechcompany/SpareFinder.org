export const HERO_FRAMES = {
  /** Total JPEG files on disk (from ffmpeg extract) */
  sourceFrameCount: 903,
  /** Skip frames during scroll scrub — 4 ≈ 226 displayed frames, much faster */
  frameStep: 4,
  fps: 60,
  width: 1280,
  height: 720,
  pattern: "/hero-frames/frame_%05d.jpg",
  startIndex: 0,
} as const;

export const HERO_DISPLAY_FRAME_COUNT = Math.ceil(
  HERO_FRAMES.sourceFrameCount / HERO_FRAMES.frameStep
);

/** @deprecated Use HERO_DISPLAY_FRAME_COUNT */
export const HERO_FRAME_COUNT = HERO_DISPLAY_FRAME_COUNT;

export const heroFrameSrc = (displayIndex: number) => {
  const fileIndex = Math.min(
    HERO_FRAMES.sourceFrameCount - 1,
    displayIndex * HERO_FRAMES.frameStep
  );
  return HERO_FRAMES.pattern.replace(
    "%05d",
    String(HERO_FRAMES.startIndex + fileIndex).padStart(5, "0")
  );
};

export const HERO_POSTER_SRC = heroFrameSrc(0);
