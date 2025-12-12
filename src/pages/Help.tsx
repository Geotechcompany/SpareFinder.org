import { motion } from "framer-motion";
import {
  HelpCircle,
  Camera,
  UploadCloud,
  Sparkles,
  History,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Help = () => {
  const steps = [
    {
      icon: Camera,
      title: "Capture the right image",
      points: [
        "Place one part per image with a neutral background.",
        "Use good lighting so edges, labels and markings are visible.",
        "Include any labels, stamps or part numbers where possible.",
      ],
    },
    {
      icon: UploadCloud,
      title: "Upload & run the analysis",
      points: [
        "Go to Dashboard → Upload and drag & drop your photo.",
        "Optionally add keywords like manufacturer or machine line.",
        "Each analysis uses one credit – you’ll see your balance at the top.",
      ],
    },
    {
      icon: Sparkles,
      title: "Review the AI result",
      points: [
        "Check the identified part name, category and confidence score.",
        "Compare suggested alternatives and compatible replacements.",
        "Use the description and specs to brief purchasing or suppliers.",
      ],
    },
    {
      icon: History,
      title: "Save, export and share",
      points: [
        "All searches are saved in History for your whole team.",
        "Open a previous analysis to export a PDF summary.",
        "Share links securely with engineers, stores or suppliers.",
      ],
    },
    {
      icon: CreditCard,
      title: "Understand credits & plans",
      points: [
        "Every image or keyword search consumes one credit.",
        "Your monthly credits refresh automatically with your plan.",
        "Upgrade or manage billing any time from Dashboard → Billing.",
      ],
    },
    {
      icon: ShieldCheck,
      title: "Best practices for accuracy",
      points: [
        "Take photos square-on, not at extreme angles.",
        "Capture multiple sides of complex parts as separate uploads.",
        "Avoid heavy reflections, motion blur or partially hidden parts.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:from-black dark:via-[#050816] dark:to-black dark:text-white">
      <Header />

      <main className="relative px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
          <div className="pointer-events-none absolute -right-10 top-40 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/15" />
        </div>

        <section className="relative z-10 mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-300">
              <HelpCircle className="h-3.5 w-3.5 text-cyan-500" />
              SpareFinder · Getting started guide
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl dark:text-white">
              How to get the best results from{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                SpareFinder AI
              </span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg dark:text-gray-300">
              Follow these steps to go from a photo of an unknown spare part to a
              clean, shareable identification in under a minute.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard/upload">Upload a part now</Link>
              </Button>
              <Button asChild variant="outline" className="border-border bg-background/80 text-foreground hover:bg-muted dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-100 dark:hover:bg-gray-800">
                <Link to="/dashboard/history">View your history</Link>
              </Button>
            </div>
          </motion.div>

          <section className="grid gap-6 md:grid-cols-2">
            {steps.map((step, index) => (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card/95 p-6 shadow-soft-elevated backdrop-blur-sm hover:border-cyan-500/60 hover:shadow-[0_24px_70px_rgba(8,47,73,0.35)] dark:border-gray-800 dark:bg-gradient-to-b dark:from-gray-900/70 dark:to-black/80"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background opacity-80 dark:from-slate-950 dark:via-slate-950 dark:to-black" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-lg">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-base font-semibold text-foreground sm:text-lg dark:text-white">
                      {step.title}
                    </h2>
                  </div>
                  <ul className="space-y-2.5 text-sm text-muted-foreground dark:text-gray-300">
                    {step.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            ))}
          </section>

          <section className="mt-12 rounded-2xl border border-emerald-300/50 bg-emerald-50 p-6 text-sm text-emerald-900 shadow-[0_20px_50px_rgba(16,185,129,0.25)] sm:p-7 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-100">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
              Quick troubleshooting
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-medium text-emerald-900 dark:text-emerald-50">
                  Low confidence or “Unknown part”
                </p>
                <ul className="mt-1 space-y-1.5 text-emerald-800/90 dark:text-emerald-100/90">
                  <li>• Re-take the photo closer and in better light.</li>
                  <li>• Make sure the full part is inside the frame.</li>
                  <li>• Add a short keyword like OEM, line or machine type.</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-emerald-900 dark:text-emerald-50">
                  Credits run out quickly
                </p>
                <ul className="mt-1 space-y-1.5 text-emerald-800/90 dark:text-emerald-100/90">
                  <li>• Avoid uploading near-identical photos repeatedly.</li>
                  <li>• Use History when reusing a confirmed identification.</li>
                  <li>• Check Dashboard → Billing to see plan limits.</li>
                </ul>
              </div>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Help;


