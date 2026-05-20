/** Supademo interactive product tour — https://supademo.com */
export const SUPADEMO_TOUR_ID = "cmpe4p27k1c2qqm8qg9cgos7c";

const SCRIPT_URL = "https://script.supademo.com/supademo.js";

let loadPromise: Promise<void> | null = null;

export function loadSupademoScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.Supademo?.open) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_URL}"]`
    );
    if (existing) {
      if (window.Supademo?.open) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Supademo"));
    document.body.appendChild(script);
  });

  return loadPromise;
}

export async function openSupademoTour(): Promise<void> {
  await loadSupademoScript();
  if (!window.Supademo?.open) {
    throw new Error("Supademo is not available");
  }
  window.Supademo.open(SUPADEMO_TOUR_ID);
}
