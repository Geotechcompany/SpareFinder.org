import React from "react";

/**
 * A simple "Latest Blog" cards section.
 * Note: uses Tailwind only (no external fonts injected).
 */
export default function LatestBlogCards() {
  return (
    <div className="flex w-full flex-col items-center">
      <h2 className="text-3xl font-semibold">Latest Blog</h2>
      <p className="mt-2 max-w-lg text-center text-sm text-slate-500">
        Stay ahead of the curve with fresh content on code, design, startups,
        and everything in between.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-8">
        <div className="w-full max-w-72 transition duration-300 hover:-translate-y-0.5">
          <img
            className="h-48 w-full rounded-xl object-cover"
            src="https://images.unsplash.com/photo-1590650516494-0c8e4a4dd67e?w=1200&h=800&auto=format&fit=crop&q=60"
            alt="Color Psychology in UI"
            loading="lazy"
          />
          <h3 className="mt-3 text-base font-medium text-slate-900">
            Color Psychology in UI: How to Choose the Right Palette
          </h3>
          <p className="mt-1 text-xs font-medium text-indigo-600">UI/UX design</p>
        </div>

        <div className="w-full max-w-72 transition duration-300 hover:-translate-y-0.5">
          <img
            className="h-48 w-full rounded-xl object-cover"
            src="https://images.unsplash.com/photo-1714974528646-ea024a3db7a7?w=1200&h=800&auto=format&fit=crop&q=60"
            alt="Understanding Typography"
            loading="lazy"
          />
          <h3 className="mt-3 text-base font-medium text-slate-900">
            Understanding Typography: Crafting a Visual Voice for Your Brand
          </h3>
          <p className="mt-1 text-xs font-medium text-indigo-600">Branding</p>
        </div>

        <div className="w-full max-w-72 transition duration-300 hover:-translate-y-0.5">
          <img
            className="h-48 w-full rounded-xl object-cover"
            src="https://images.unsplash.com/photo-1713947501966-34897f21162e?w=1200&h=800&auto=format&fit=crop&q=60"
            alt="Design Thinking in Practice"
            loading="lazy"
          />
          <h3 className="mt-3 text-base font-medium text-slate-900">
            Design Thinking in Practice: How to Solve Real User Problems
          </h3>
          <p className="mt-1 text-xs font-medium text-indigo-600">
            Product Design
          </p>
        </div>
      </div>
    </div>
  );
}


