import React, { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Button } from "@/components/ui/button";
import { openSupademoTour } from "@/lib/supademo";
import { cn } from "@/lib/utils";

export function DashboardScrollDemo() {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenTour = async () => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      await openSupademoTour();
    } catch (err) {
      console.warn("Could not open Supademo tour:", err);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="flex flex-col overflow-visible">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="mb-4 text-4xl font-semibold text-foreground md:text-5xl dark:text-gray-100">
              Experience the power of <br />
              <span className="mt-1 text-5xl font-bold leading-none text-foreground md:text-[6rem] dark:bg-gradient-to-r dark:from-brand-light dark:via-brand-light dark:to-sky-400 dark:bg-clip-text dark:text-transparent dark:filter dark:drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]">
                AI-Powered Part Recognition
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground dark:text-gray-400">
              Instantly identify any Engineering spares or industrial part with our
              advanced AI technology
            </p>
            <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                size="lg"
                disabled={isOpening}
                onClick={() => void handleOpenTour()}
                className="gap-2 bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg hover:opacity-95"
              >
                <Play className="h-5 w-5 fill-current" />
                {isOpening ? "Opening tour…" : "Try the tour"}
              </Button>
              <p className="w-full text-center text-sm text-muted-foreground">
                Interactive walkthrough — upload, analyze, and review results
              </p>
            </div>
          </>
        }
      >
        <button
          type="button"
          onClick={() => void handleOpenTour()}
          disabled={isOpening}
          aria-label="Play interactive product tour"
          className={cn(
            "group relative block h-full min-h-[28rem] w-full overflow-hidden rounded-2xl",
            "bg-zinc-950 shadow-2xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            "hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70 md:min-h-0"
          )}
        >
          <img
            src="/dashboard.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-left-top opacity-95 transition-opacity group-hover:opacity-80"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-xl ring-4 ring-brand/30 transition-transform group-hover:scale-110">
              <Play className="h-10 w-10 fill-brand text-brand" />
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="h-5 w-5 text-brand-light" />
                See how SpareFinder works
              </p>
              <p className="mt-1 text-sm text-white/80">
                Click to open the guided demo in a popup
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/25">
              {isOpening ? "Loading tour…" : "Try the tour"}
            </span>
          </div>
        </button>
      </ContainerScroll>
    </div>
  );
}
