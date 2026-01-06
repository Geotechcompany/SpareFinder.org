import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallBannerProps {
  className?: string;
}

export const InstallBanner = ({ className }: InstallBannerProps) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed
    if (localStorage.getItem("pwa-banner-dismissed") === "true") {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsVisible(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (isInstalled || !isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg sm:left-auto",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold">Install SpareFinder</h3>
          <p className="text-xs text-muted-foreground">
            Get faster access and use SpareFinder offline. Install now for the
            best experience.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-6 w-6"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
};


