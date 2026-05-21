import { Link } from "react-router-dom";
import { HelpCircle, MessageCircle, ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: string;
  meta?: string;
}

export interface FaqSectionProps {
  faqs: FaqItem[];
  title?: string;
  subtitle?: string;
  description?: string;
  className?: string;
}

export function FaqSection({
  faqs,
  title = "Find the answers you're looking for",
  subtitle = "SpareFinder FAQ",
  description = "Everything you need to know about AI-powered part identification and how SpareFinder can transform your operations.",
  className,
}: FaqSectionProps) {
  return (
    <section
      id="faq"
      className={cn(
        "relative overflow-hidden bg-background py-20 sm:py-24",
        className
      )}
    >
      <div className="pointer-events-none absolute left-0 top-1/4 h-96 w-96 rounded-full bg-[#6A2D95]/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#8F39BB]/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(260px,340px)_1fr] lg:gap-16 lg:items-start">
          <header className="lg:sticky lg:top-24">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6A2D95]/25 bg-gradient-to-r from-[#6A2D95]/10 via-[#8F39BB]/10 to-[#6A2D95]/5 px-4 py-2 text-sm font-medium text-[#6A2D95]">
              <HelpCircle className="h-4 w-4" />
              <span>{subtitle}</span>
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Questions
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              {title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
            <Link
              to="/contact"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#6A2D95] transition-colors hover:text-[#8F39BB]"
            >
              <MessageCircle className="h-4 w-4" />
              Contact support
              <ChevronRight className="h-4 w-4" />
            </Link>
          </header>

          <Accordion
            type="single"
            collapsible
            defaultValue="faq-0"
            className="space-y-3"
          >
            {faqs.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className={cn(
                  "overflow-hidden rounded-2xl border border-b-0 border-border/70 bg-card/90 px-0 shadow-sm backdrop-blur-sm",
                  "transition-all duration-300",
                  "data-[state=open]:border-[#6A2D95]/25 data-[state=open]:bg-gradient-to-br data-[state=open]:from-[#6A2D95]/[0.06] data-[state=open]:to-card data-[state=open]:shadow-md data-[state=open]:shadow-[#6A2D95]/10"
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-5 py-5 text-left hover:no-underline sm:px-6 sm:py-6",
                    "[&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:text-[#6A2D95]"
                  )}
                >
                  <span className="flex flex-1 flex-col gap-3 pr-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                      {item.question}
                    </span>
                    {item.meta && (
                      <span className="inline-flex w-fit shrink-0 rounded-full bg-gradient-to-r from-[#6A2D95] to-[#8F39BB] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white">
                        {item.meta}
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-6 pt-0 text-muted-foreground sm:px-6">
                  <p className="max-w-2xl text-sm leading-relaxed sm:text-base">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
