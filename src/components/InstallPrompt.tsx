import { useCallback, useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "pwa-install-dismissed";
const BANNER_HEIGHT = "2.375rem"; /* 38px — sits flush above hero nav */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const isVisible =
    showBanner && !dismissed && !isInstalled && !isStandalone;

  const setBannerLayoutActive = useCallback((active: boolean) => {
    if (active) {
      document.body.classList.add("pwa-banner-visible");
      document.documentElement.style.setProperty(
        "--pwa-banner-height",
        BANNER_HEIGHT
      );
    } else {
      document.body.classList.remove("pwa-banner-visible");
      document.documentElement.style.removeProperty("--pwa-banner-height");
    }
  }, []);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    ) {
      setIsInstalled(true);
      setIsStandalone(true);
      return;
    }

    try {
      if (localStorage.getItem(DISMISS_KEY) === "true") {
        setDismissed(true);
        return;
      }
    } catch {
      /* private mode */
    }
    setDismissed(false);

    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) &&
      !(window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIsIOS(ios);

    const reveal = () => {
      window.setTimeout(() => setShowBanner(true), 1200);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      reveal();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
    });

    if (ios) reveal();

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  useEffect(() => {
    setBannerLayoutActive(isVisible);
    return () => setBannerLayoutActive(false);
  }, [isVisible, setBannerLayoutActive]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  const canInstall = Boolean(deferredPrompt);
  const subtitle = isIOS
    ? "Add to Home Screen for quick access"
    : "Faster access · works offline";

  return (
    <div
      role="region"
      aria-label="Install SpareFinder app"
      className={cn(
        "fixed left-0 right-0 top-0 z-[110] flex h-[var(--pwa-banner-height,2.375rem)] items-center",
        "border-b border-white/20 bg-black/35 px-3 backdrop-blur-xl backdrop-saturate-150"
      )}
      style={{ height: BANNER_HEIGHT }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 sm:gap-3">
        <img
          src="/sparefinder_logo_light.png"
          alt=""
          className="h-7 w-auto shrink-0 object-contain"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white sm:text-[13px]">
            Install SpareFinder
          </p>
          <p className="hidden truncate text-[10px] text-white/65 sm:block">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {canInstall ? (
            <button
              type="button"
              onClick={() => void handleInstallClick()}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-gradient-to-r from-[#6A2D95] to-[#8F39BB] px-3 text-[11px] font-semibold text-white shadow-md shadow-[#6A2D95]/30 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-3 w-3" aria-hidden />
              Install
            </button>
          ) : (
            <span className="hidden text-[10px] text-white/70 sm:inline">
              Share → Add to Home Screen
            </span>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Dismiss install banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
