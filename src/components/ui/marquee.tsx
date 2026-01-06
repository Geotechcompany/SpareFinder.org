import React, { useEffect, useMemo, useState } from "react";
import { BadgeCheck, User } from "lucide-react";
import { reviewsApi } from "@/lib/api";

type CardT = {
  name: string;
  // Legacy prop used by older callers; prefer subtitle/message below.
  handle?: string;
  subtitle?: string;
  message?: string;
  verified?: boolean;
};

const DEFAULT_DATA: CardT[] = [
  {
    name: "Sarah Johnson",
    subtitle: "AutoParts Pro",
    message:
      "The part recognition is incredibly accurate. Saved us hours of manual identification work and improved our workflow significantly.",
    verified: true,
  },
  {
    name: "Michael Chen",
    subtitle: "Industrial Tech Solutions",
    message:
      "Revolutionized our inventory management. The speed and accuracy are unmatched in the industry.",
    verified: true,
  },
  {
    name: "David Kumar",
    subtitle: "Kumar Auto Repair",
    message:
      "This platform has transformed how we identify parts. What used to take hours now takes minutes.",
    verified: true,
  },
  {
    name: "Lisa Thompson",
    subtitle: "Global Logistics Corp",
    message:
      "The AI capabilities are remarkable. Great tool for our parts procurement team.",
    verified: true,
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

const Avatar = ({ name }: { name: string }) => (
  <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
    {initials(name) || <User className="h-5 w-5" />}
  </div>
);

const Card = ({ card }: { card: CardT }) => (
  <div className="mx-4 w-72 shrink-0 rounded-lg bg-white p-4 shadow transition-all duration-200 hover:shadow-lg">
    <div className="flex gap-2">
      <Avatar name={card.name} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <p className="font-medium">{card.name}</p>
          {card.verified !== false && (
            <BadgeCheck className="h-4 w-4 text-sky-500" />
          )}
        </div>
        <span className="text-xs text-slate-500">
          {card.subtitle ?? card.handle ?? ""}
        </span>
      </div>
    </div>
    <p className="pt-4 text-sm text-gray-800">
      {card.message ||
        "SpareFinder made identifying parts and sharing results with our team a breeze."}
    </p>
  </div>
);

function MarqueeRow({
  data,
  reverse = false,
  speed = 25,
}: {
  data: CardT[];
  reverse?: boolean;
  speed?: number;
}) {
  const doubled = React.useMemo(() => [...data, ...data], [data]);
  return (
    <div className="relative w-full overflow-hidden isolation-isolate">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent blur-md md:w-40" />
      <div
        className={`flex min-w-[200%] transform-gpu ${
          reverse ? "pb-10 pt-5" : "pb-5 pt-10"
        }`}
        style={{
          animation: `marqueeScroll ${speed}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {doubled.map((c, i) => (
          <Card key={i} card={c} />
        ))}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent blur-md md:w-40" />
    </div>
  );
}

export default function Marquee({
  row1 = DEFAULT_DATA,
  row2 = DEFAULT_DATA,
}: {
  row1?: CardT[];
  row2?: CardT[];
}) {
  const hasCustomRows = (row1 !== DEFAULT_DATA || row2 !== DEFAULT_DATA) && !!row1?.length;
  const [row1Data, setRow1Data] = useState<CardT[]>(row1);
  const [row2Data, setRow2Data] = useState<CardT[]>(row2);

  const normalizedProvided = useMemo(() => {
    return {
      row1: row1?.map((c) => ({
        ...c,
        subtitle: c.subtitle ?? c.handle,
      })),
      row2: row2?.map((c) => ({
        ...c,
        subtitle: c.subtitle ?? c.handle,
      })),
    };
  }, [row1, row2]);

  useEffect(() => {
    // If caller provided custom rows, use them as-is.
    if (hasCustomRows) {
      setRow1Data(normalizedProvided.row1 || DEFAULT_DATA);
      setRow2Data(normalizedProvided.row2 || DEFAULT_DATA);
      return;
    }

    // Otherwise, pull real reviews from the DB-backed API (public GET endpoint).
    const load = async () => {
      try {
        const res = await reviewsApi.getAll({ limit: 18 });
        const reviews = res.success && res.data ? res.data.reviews || [] : [];

        if (!reviews.length) {
          setRow1Data(DEFAULT_DATA);
          setRow2Data(DEFAULT_DATA);
          return;
        }

        const cards: CardT[] = reviews.map((r) => ({
          name: r.name,
          subtitle: r.company || "Verified customer",
          message: r.message,
          verified: r.verified,
        }));

        const mid = Math.ceil(cards.length / 2);
        setRow1Data(cards.slice(0, mid));
        setRow2Data(cards.slice(mid).length ? cards.slice(mid) : cards.slice(0, mid));
      } catch (e) {
        console.warn("Failed to load marquee reviews; falling back to defaults.", e);
        setRow1Data(DEFAULT_DATA);
        setRow2Data(DEFAULT_DATA);
      }
    };

    load();
  }, [hasCustomRows, normalizedProvided.row1, normalizedProvided.row2]);

  return (
    <>
      <style>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="flex flex-col gap-6">
        <MarqueeRow data={row1Data} reverse={false} speed={25} />
        <MarqueeRow data={row2Data} reverse={true} speed={25} />
      </div>
    </>
  );
}


