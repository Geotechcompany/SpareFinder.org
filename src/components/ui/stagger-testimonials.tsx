import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SQRT_5000 = Math.sqrt(5000);

const testimonials = [
  {
    tempId: 0,
    testimonial:
      "SpareFinder cut our part identification time from hours to seconds. The AI accuracy is incredible!",
    by: "Marcus Chen, Operations Director at AutoTech Solutions",
    imgSrc:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop",
  },
  {
    tempId: 1,
    testimonial:
      "We've identified over 10,000 parts with 99% accuracy. This platform transformed our entire inventory process.",
    by: "Sarah Williams, Supply Chain Manager at Industrial Parts Co",
    imgSrc:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop",
  },
  {
    tempId: 2,
    testimonial:
      "The supplier network is exceptional. We found OEM parts we couldn't source anywhere else!",
    by: "David Rodriguez, Procurement Lead at MechTech Industries",
    imgSrc:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
  },
  {
    tempId: 3,
    testimonial:
      "Game-changer for our repair shop. Customers are amazed at how quickly we identify and source parts now.",
    by: "Emily Johnson, Owner at Precision Auto Repair",
    imgSrc:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop",
  },
  {
    tempId: 4,
    testimonial:
      "The SpareFinder AI Research feature saved us thousands on a critical machinery part. Paid for itself in one order!",
    by: "James Mitchell, Maintenance Manager at Heavy Equipment Corp",
    imgSrc:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop",
  },
];

interface TestimonialCardProps {
  position: number;
  testimonial: (typeof testimonials)[0];
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  position,
  testimonial,
  handleMove,
  cardSize,
}) => {
  const isCenter = position === 0;
  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out rounded-2xl",
        isCenter
          ? "z-10 bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-500 shadow-2xl shadow-purple-500/50"
          : "z-0 bg-gray-900/80 backdrop-blur-sm text-white border-gray-800 hover:border-purple-500/50"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter
          ? "0px 8px 0px 4px rgba(139, 92, 246, 0.3)"
          : "0px 0px 0px 0px transparent",
      }}
    >
      <span
        className={cn(
          "absolute block origin-top-right rotate-45",
          isCenter ? "bg-purple-400" : "bg-gray-700"
        )}
        style={{
          right: -2,
          top: 48,
          width: SQRT_5000,
          height: 2,
        }}
      />
      <img
        src={testimonial.imgSrc}
        alt={`${testimonial.by.split(",")[0]}`}
        className="mb-4 h-14 w-14 rounded-full object-cover border-2 border-white/20"
        style={{ boxShadow: "3px 3px 0px rgba(0, 0, 0, 0.3)" }}
      />
      <h3
        className={cn(
          "text-base sm:text-lg font-medium leading-relaxed",
          isCenter ? "text-white" : "text-gray-200"
        )}
      >
        "{testimonial.testimonial}"
      </h3>
      <p
        className={cn(
          "absolute bottom-8 left-8 right-8 mt-2 text-sm italic font-medium",
          isCenter ? "text-white/90" : "text-gray-400"
        )}
      >
        - {testimonial.by}
      </p>
    </div>
  );
};

export const StaggerTestimonials: React.FC = () => {
  const [cardSize, setCardSize] = useState(365);
  const [testimonialsList, setTestimonialsList] = useState(testimonials);

  const handleMove = (steps: number) => {
    const newList = [...testimonialsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setTestimonialsList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 365 : 290);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ height: 600 }}
    >
      {testimonialsList.map((testimonial, index) => {
        const position =
          testimonialsList.length % 2
            ? index - (testimonialsList.length + 1) / 2
            : index - testimonialsList.length / 2;
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-all rounded-lg",
            "bg-gray-900 border-2 border-gray-800 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:border-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/50"
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-all rounded-lg",
            "bg-gray-900 border-2 border-gray-800 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:border-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/50"
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
