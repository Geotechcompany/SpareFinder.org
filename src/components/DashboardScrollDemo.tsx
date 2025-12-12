import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

export function DashboardScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="mb-4 text-4xl font-semibold text-foreground md:text-5xl dark:text-gray-100">
              Experience the power of <br />
              <span className="mt-1 text-5xl font-bold leading-none text-foreground md:text-[6rem] dark:bg-gradient-to-r dark:from-violet-400 dark:via-purple-400 dark:to-sky-400 dark:bg-clip-text dark:text-transparent dark:filter dark:drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]">
                AI-Powered Part Recognition
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground dark:text-gray-400">
              Instantly identify any Engineering spares or industrial part with our advanced AI technology
            </p>
          </>
        }
      >
        <img
          src="/dashboard.png"
          alt="SpareFinder Dashboard"
          className="mx-auto rounded-2xl object-cover h-full object-left-top w-full"
          draggable={false}
        />
      </ContainerScroll>
    </div>
  );
}

