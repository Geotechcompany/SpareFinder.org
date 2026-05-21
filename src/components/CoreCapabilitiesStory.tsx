import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import FlowArt, { FlowSection } from "@/components/ui/story-scroll";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SectionRule({ className }: { className?: string }) {
  return (
    <hr
      className={cn(
        "my-[2vw] border-none border-t border-current opacity-100",
        className
      )}
    />
  );
}

function FeatureBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="min-w-[180px] flex-1">
      <p className="mb-2 text-sm font-bold uppercase tracking-wider">{title}</p>
      <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-80">
        {body}
      </p>
    </div>
  );
}

function FeatureRow({ items }: { items: { title: string; body: string }[] }) {
  return (
    <>
      <SectionRule className="opacity-40" />
      <div className="flex flex-wrap gap-[3vw]">
        {items.map((item) => (
          <FeatureBlock key={item.title} title={item.title} body={item.body} />
        ))}
      </div>
    </>
  );
}

const headlineClass =
  "text-[clamp(3rem,11vw,12rem)] font-bold leading-[0.88] uppercase tracking-tight";

const bodyClass =
  "max-w-[50ch] text-[clamp(1rem,2.5vw,1.75rem)] font-normal leading-relaxed opacity-95";

const labelClass =
  "text-xs font-bold uppercase tracking-[0.2em] text-current opacity-90";

export default function CoreCapabilitiesStory() {
  return (
    <div id="capabilities" className="relative w-full">
      <FlowArt aria-label="SpareFinder core capabilities">
        {/* Brand purple — sidebar / logo accent (no primary blue) */}
        <FlowSection
          aria-label="Core capabilities introduction"
          className="bg-accent text-accent-foreground"
        >
          <p className={labelClass}>Core capabilities</p>
          <SectionRule className="opacity-50" />
          <div>
            <h2 className={headlineClass}>
              Identify
              <br />
              Without
              <br />
              Limits
            </h2>
          </div>
          <SectionRule className="opacity-50" />
          <p className={cn(bodyClass, "mt-auto")}>
            Revolutionary AI part recognition for maintenance, procurement, and
            engineering teams. Upload a photo or keywords — get specs, suppliers,
            and alternatives in seconds.
          </p>
        </FlowSection>

        {/* Inverted foreground — same slate as body text, works in light & dark */}
        <FlowSection
          aria-label="AI recognition and speed"
          className="bg-foreground text-background"
        >
          <p className={labelClass}>01 — Intelligence</p>
          <SectionRule className="opacity-35" />
          <div>
            <h2 className={headlineClass}>
              AI
              <br />
              First
              <br />
              Always
            </h2>
          </div>
          <SectionRule className="opacity-35" />
          <p className={bodyClass}>
            Computer vision and deep research agents identify parts across 50+
            industrial categories with industry-leading accuracy.
          </p>
          <FeatureRow
            items={[
              {
                title: "99.9% accuracy",
                body: "Neural models trained on millions of industrial parts — bearings, hydraulics, pneumatics, and more.",
              },
              {
                title: "Deep research",
                body: "Multi-agent Crew AI runs supplier search, spec validation, and compatibility checks automatically.",
              },
              {
                title: "Instant results",
                body: "Complete part profiles, pricing signals, and PDF reports in minutes — not days.",
              },
            ]}
          />
          <FeatureRow
            items={[
              {
                title: "Confidence scores",
                body: "Every match ships with transparent confidence so your team knows when to verify.",
              },
              {
                title: "Keyword + image",
                body: "Combine photos with part numbers or descriptions for ambiguous or worn components.",
              },
              {
                title: "Workspace history",
                body: "Every analysis is saved, searchable, and shareable across your team workspace.",
              },
            ]}
          />
          <SectionRule className="opacity-35" />
          <p className={cn(bodyClass, "mt-auto ml-auto text-right")}>
            Built for technicians on the shop floor and buyers at the desk — same
            platform, same truth.
          </p>
        </FlowSection>

        {/* Surface 2 / muted — matches dashboard workspace panels */}
        <FlowSection
          aria-label="Data and uploads"
          className="bg-secondary text-foreground"
        >
          <p className={cn(labelClass, "text-muted-foreground")}>02 — Data &amp; inputs</p>
          <SectionRule className="border-border opacity-60" />
          <div>
            <h2 className={headlineClass}>
              Any
              <br />
              Part.
              <br />
              Any Format.
            </h2>
          </div>
          <SectionRule className="border-border opacity-60" />
          <p className={cn(bodyClass, "text-foreground/90")}>
            Ten million-plus parts from verified manufacturers. Upload however
            your workflow already works.
          </p>
          <FeatureRow
            items={[
              {
                title: "10M+ parts",
                body: "Comprehensive catalog with OEM references, cross-references, and technical specifications.",
              },
              {
                title: "Photo upload",
                body: "Snap or drag images from the line — mobile, tablet, or desktop.",
              },
              {
                title: "PDF & documents",
                body: "Extract part data from datasheets, labels, and legacy documentation.",
              },
            ]}
          />
          <FeatureRow
            items={[
              {
                title: "Keyword search",
                body: "Start from a description when you do not have a clear photo yet.",
              },
              {
                title: "Multi-workspace",
                body: "Separate sites, fleets, or business units — shared plan limits, isolated history.",
              },
              {
                title: "Export & share",
                body: "Download PDF reports and share links with procurement or field teams.",
              },
            ]}
          />
        </FlowSection>

        {/* Muted surface — avoids repeating accent purple from intro */}
        <FlowSection
          aria-label="Enterprise and trust"
          className="bg-muted text-foreground"
        >
          <p className={cn(labelClass, "text-muted-foreground")}>03 — Enterprise ready</p>
          <SectionRule className="border-border opacity-60" />
          <div>
            <h2 className={headlineClass}>
              Scale
              <br />
              With
              <br />
              Trust
            </h2>
          </div>
          <SectionRule className="border-border opacity-60" />
          <p className={cn(bodyClass, "text-foreground/90")}>
            From single-site maintenance shops to global MRO operations — secure,
            integrable, and built for production.
          </p>
          <FeatureRow
            items={[
              {
                title: "REST APIs",
                body: "Webhook and API access for ERP, CMMS, and inventory systems.",
              },
              {
                title: "Verified suppliers",
                body: "Authentic parts with warranty and sourcing signals — fewer wrong orders.",
              },
              {
                title: "24/7 support",
                body: "Engineers and identification specialists when your line is down.",
              },
            ]}
          />
          <FeatureRow
            items={[
              {
                title: "500+ enterprises",
                body: "Trusted by manufacturers, MRO providers, and industrial operators worldwide.",
              },
              {
                title: "Role-based access",
                body: "Workspaces, billing, and admin controls aligned to how your team works.",
              },
              {
                title: "Audit trail",
                body: "Full history of uploads, reviews, and crew analysis jobs for compliance.",
              },
            ]}
          />
          <SectionRule className="border-border opacity-60" />
          <p className={cn(bodyClass, "text-foreground/90")}>
            Security, uptime, and data isolation are not add-ons — they are the
            foundation of every deployment.
          </p>
        </FlowSection>

        {/* Brand gradient — purple to slate, no primary blue */}
        <FlowSection
          aria-label="Get started"
          className="bg-gradient-to-br from-accent via-brand-dark to-foreground text-white dark:text-accent-foreground"
        >
          <p className={labelClass}>04 — Get started</p>
          <SectionRule className="opacity-45" />
          <div>
            <h2 className={headlineClass}>
              Ready
              <br />
              To
              <br />
              Identify?
            </h2>
          </div>
          <SectionRule className="opacity-45" />
          <p className={cn(bodyClass, "mt-auto")}>
            Start with a free trial. Upload your first part, run deep research,
            and see why teams switch to SpareFinder for critical spares.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-accent-foreground text-accent shadow-lg hover:bg-accent-foreground/90"
            >
              <Link to="/register">
                Start free trial
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-accent-foreground/50 bg-transparent text-accent-foreground hover:bg-accent-foreground/10"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </FlowSection>
      </FlowArt>
    </div>
  );
}
