import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      setIsStandalone(true);
      return;
    }

    // Check if dismissed
    if (sessionStorage.getItem("pwa-install-dismissed") === "true") {
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window.navigator as any).standalone;
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after a short delay to not interrupt initial page load
      setTimeout(() => {
        setIsVisible(true);
      }, 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if already installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsVisible(false);
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // Add/remove body class when banner visibility changes
  useEffect(() => {
    if (isVisible && !isInstalled && !isStandalone) {
      document.body.classList.add("pwa-banner-visible");
    } else {
      document.body.classList.remove("pwa-banner-visible");
    }
    return () => {
      document.body.classList.remove("pwa-banner-visible");
    };
  }, [isVisible, isInstalled, isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsVisible(false);
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Don't show again for this session
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already installed or dismissed in this session
  if (
    isInstalled ||
    isStandalone ||
    !isVisible ||
    sessionStorage.getItem("pwa-install-dismissed") === "true"
  ) {
    return null;
  }

  // iOS-specific instructions banner
  if (isIOS && !deferredPrompt) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src="/sparefinderlogodark.png"
              alt="SpareFinder"
              className="h-10 w-10 flex-shrink-0 rounded-lg object-contain"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Install SpareFinder on iOS</p>
              <p className="text-xs text-muted-foreground">
                Tap Share → Add to Home Screen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Maybe Later
            </Button>
            <Button size="sm" onClick={handleDismiss}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Standard install banner for Android/Desktop
  if (deferredPrompt) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src="/sparefinderlogodark.png"
              alt="SpareFinder"
              className="h-10 w-10 flex-shrink-0 rounded-lg object-contain"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Install SpareFinder App</p>
              <p className="text-xs text-muted-foreground">
                Get faster access and use SpareFinder offline. Works offline and loads instantly.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Maybe Later
            </Button>
            <Button size="sm" onClick={handleInstallClick} className="gap-2">
              <Download className="h-4 w-4" />
              Install Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

