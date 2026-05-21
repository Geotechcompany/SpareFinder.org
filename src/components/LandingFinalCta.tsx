import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CTA_IMAGE = "/images/landing-cta-factory.png";

export function LandingFinalCta() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl ring-1 ring-black/10 lg:rounded-[2.5rem]">
          <img
            src={CTA_IMAGE}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/15" />

          <div className="relative z-10 px-6 py-14 text-center sm:px-12 sm:py-20 lg:py-24">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Get started today
            </div>

            <h2 className="mx-auto mb-5 max-w-3xl text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
              Ready to Revolutionize Your Part Identification?
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              Join hundreds of manufacturers already using our AI-powered
              platform
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
              <Button
                asChild
                size="lg"
                className={cn(
                  "group h-auto gap-2 rounded-full border-0 px-8 py-6 text-base font-semibold text-white shadow-lg",
                  "bg-gradient-to-r from-[#6A2D95] to-[#8F39BB]",
                  "shadow-[#6A2D95]/40 hover:from-[#5a2580] hover:to-[#7d33a8] hover:shadow-xl hover:shadow-[#6A2D95]/35"
                )}
              >
                <Link to="/register">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className={cn(
                  "h-auto rounded-full border-white/35 bg-white/10 px-8 py-6 text-base font-medium text-white backdrop-blur-md",
                  "hover:border-white/55 hover:bg-white/20 hover:text-white"
                )}
              >
                <Link to="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingFinalCta;
