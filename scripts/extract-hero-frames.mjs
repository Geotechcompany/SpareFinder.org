/**
 * Regenerate 60fps hero frames from public/herovideo.mp4
 * Requires ffmpeg on PATH: ffmpeg -version
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = join(root, "public", "herovideo.mp4");
const outDir = join(root, "public", "hero-frames");

mkdirSync(outDir, { recursive: true });

execSync(
  `ffmpeg -y -i "${input}" -vf "fps=60,scale=1280:-2:flags=lanczos" -q:v 3 -start_number 0 "${join(outDir, "frame_%05d.jpg")}"`,
  { stdio: "inherit" }
);

const count = Number(
  execSync(`ls "${outDir}" | grep -c "^frame_"`, { encoding: "utf8" }).trim()
);

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(
    {
      frameCount: count,
      fps: 60,
      width: 1280,
      height: 720,
      pattern: "/hero-frames/frame_%05d.jpg",
      startIndex: 0,
    },
    null,
    2
  )
);

console.log(`Done: ${count} frames at 60fps → public/hero-frames/`);
