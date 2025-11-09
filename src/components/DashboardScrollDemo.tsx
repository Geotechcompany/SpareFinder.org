import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

export function DashboardScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-gray-100 mb-4">
              Experience the power of <br />
              <span className="text-5xl md:text-[6rem] font-bold mt-1 leading-none bg-gradient-to-r from-violet-400 via-purple-400 to-sky-400 bg-clip-text text-transparent filter drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]">
                AI-Powered Part Recognition
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mt-6">
              Instantly identify any automotive or industrial part with our advanced AI technology
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

