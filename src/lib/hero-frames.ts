export const HERO_FRAMES = {
  frameCount: 903,
  fps: 60,
  width: 1280,
  height: 720,
  pattern: "/hero-frames/frame_%05d.jpg",
  startIndex: 0,
} as const;

export const heroFrameSrc = (index: number) =>
  HERO_FRAMES.pattern.replace(
    "%05d",
    String(HERO_FRAMES.startIndex + index).padStart(5, "0")
  );
