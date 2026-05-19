import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronLeft,
  FileImage,
  Loader2,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

export type AnalysisMode = "image" | "keywords" | "both";

const MODE_LABELS: Record<AnalysisMode, string> = {
  image: "Image only",

  keywords: "Keywords only",

  both: "Image + keywords",
};

const PIPELINE_STEPS = [
  { icon: ScanSearch, label: "Identify" },

  { icon: Brain, label: "Research" },

  { icon: CheckCircle2, label: "Report" },
] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type AnalysisSummaryReviewProps = {
  mode: AnalysisMode;

  uploadedFile?: File | null;

  imagePreview?: string | null;

  keywords?: string[];

  isAnalyzing?: boolean;

  onBack: () => void;

  onStartOver: () => void;

  onAnalyze: () => void;

  analyzeDisabled?: boolean;
};

export function AnalysisSummaryReview({
  mode,

  uploadedFile,

  imagePreview,

  keywords = [],

  isAnalyzing = false,

  onBack,

  onStartOver,

  onAnalyze,

  analyzeDisabled = false,
}: AnalysisSummaryReviewProps) {
  const hasImage = (mode === "image" || mode === "both") && uploadedFile;

  const hasKeywords =
    (mode === "keywords" || mode === "both") && keywords.length > 0;

  const nextStepCopy =
    mode === "both"
      ? "We combine vision AI with your keywords for the highest-confidence match, then compile suppliers and a PDF report."
      : mode === "image"
        ? "Vision AI identifies the part, runs technical research, finds suppliers, and delivers a structured PDF to your History."
        : "Our agents search and research from your keywords, then build a full spare-part report you can download or share.";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-soft-elevated dark:border-white/10 dark:bg-gradient-to-b dark:from-zinc-950/90 dark:to-black/40">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl"
        aria-hidden
      />

      <header className="relative border-b border-border/60 px-6 py-5 sm:px-8 sm:py-6 dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-violet-600 shadow-lg shadow-brand/25">
              <Sparkles className="h-6 w-6 text-white" aria-hidden />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Review & launch
              </h2>

              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Confirm your submission before SpareFinder AI Research begins.
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="w-fit shrink-0 border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand dark:text-brand-light"
          >
            {MODE_LABELS[mode]}
          </Badge>
        </div>
      </header>

      <div className="relative grid md:grid-cols-2">
        <section className="flex flex-col border-b border-border/60 p-6 sm:p-8 md:border-b-0 md:border-r dark:border-white/10">
          {hasImage && imagePreview ? (
            <div className="flex flex-1 flex-col">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Uploaded image
              </p>

              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-3 ring-1 ring-inset ring-white/5 dark:bg-black/40">
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                  aria-hidden
                />

                <img
                  src={imagePreview}
                  alt="Part preview"
                  className="relative z-[1] max-h-[280px] w-full rounded-xl object-contain shadow-2xl sm:max-h-[320px]"
                />

                <span className="absolute bottom-3 left-3 z-[2] inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 backdrop-blur-md dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Ready
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10 px-6 py-12 text-center dark:bg-black/20">
              <FileImage className="mb-3 h-10 w-10 text-muted-foreground/70" />

              <p className="text-sm font-medium text-foreground">
                Keyword search
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                No image attached for this run
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-6 p-6 sm:p-8">
          {hasImage && uploadedFile && (
            <dl className="grid grid-cols-2 gap-3">
              <div className="col-span-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  File name
                </dt>

                <dd className="mt-1 truncate text-sm font-medium text-foreground">
                  {uploadedFile.name}
                </dd>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Size
                </dt>

                <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
                  {formatFileSize(uploadedFile.size)}
                </dd>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Type
                </dt>

                <dd className="mt-1 truncate text-sm font-medium text-foreground">
                  {uploadedFile.type || "image"}
                </dd>
              </div>
            </dl>
          )}

          {hasKeywords && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" aria-hidden />

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Keywords ({keywords.length})
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={`${keyword}-${index}`}
                    className="inline-flex rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Analysis pipeline
            </p>

            <ol className="grid grid-cols-3 gap-2">
              {PIPELINE_STEPS.map(({ icon: Icon, label }, i) => (
                <li
                  key={label}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center",
                    i === 0
                      ? "border-brand/40 bg-brand/10"
                      : "border-border/60 bg-muted/10 dark:bg-white/[0.02]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      i === 0 ? "text-brand" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />

                  <span className="text-[11px] font-medium text-foreground">
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <footer className="relative border-t border-border/60 px-6 py-6 sm:px-8 dark:border-white/10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
          aria-hidden
        />

        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mb-5 flex gap-3 rounded-2xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/20 to-violet-500/20 ring-1 ring-brand/20">
            <Sparkles
              className="h-4 w-4 text-brand dark:text-brand-light"
              aria-hidden
            />
          </div>

          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-brand-light">
              What happens next
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {nextStepCopy}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col gap-3 rounded-2xl border border-border/50 bg-muted/30 p-2 shadow-inner backdrop-blur-md dark:border-white/10 dark:bg-black/30 sm:flex-row sm:items-center sm:justify-between sm:p-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isAnalyzing}
            className="h-10 gap-1.5 rounded-xl px-3 text-muted-foreground hover:bg-background/80 hover:text-foreground sm:px-4"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onStartOver}
              disabled={isAnalyzing}
              className="h-11 rounded-xl border-border/70 bg-background/80 px-5 shadow-sm backdrop-blur-sm hover:bg-background dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            >
              <RotateCcw className="mr-2 h-4 w-4 opacity-70" aria-hidden />
              Start over
            </Button>

            <Button
              type="button"
              size="lg"
              onClick={onAnalyze}
              disabled={analyzeDisabled}
              aria-busy={isAnalyzing}
              className={cn(
                "premium-button group relative h-11 min-w-[180px] overflow-hidden rounded-xl px-6 text-base font-semibold text-white",

                "bg-gradient-to-r from-brand to-brand-dark",

                "shadow-[0_12px_32px_rgba(143,57,187,0.35)]",

                "transition-all duration-200 hover:from-brand-dark hover:to-brand-dark hover:shadow-[0_16px_40px_rgba(143,57,187,0.45)]",

                "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",

                "disabled:pointer-events-none disabled:opacity-50",

                isAnalyzing && "pointer-events-none",
              )}
            >
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden
              />

              {isAnalyzing ? (
                <>
                  <Loader2
                    className="relative mr-2 h-4 w-4 animate-spin"
                    aria-hidden
                  />

                  <span className="relative">Launching analysis…</span>
                </>
              ) : (
                <>
                  <Zap className="relative mr-2 h-4 w-4" aria-hidden />

                  <span className="relative">Start analysis</span>

                  <ArrowRight
                    className="relative ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
