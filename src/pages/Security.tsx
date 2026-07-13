import { motion, useReducedMotion } from "framer-motion";
import { Building2, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const controls = [
  "Risk assessment and treatment",
  "Access control and identity management",
  "Data protection and privacy",
  "Incident management and business continuity",
  "Supplier and third-party management",
  "Employee awareness and role-based training",
  "Internal audits, management reviews, and corrective actions",
];

const Security = () => {
  const shouldReduceMotion = useReducedMotion();
  const entrance = shouldReduceMotion ? false : { opacity: 0, y: 12 };

  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-black dark:text-white">
      <Header />
      <main className="relative overflow-hidden bg-gradient-to-b from-background via-emerald-50/60 to-background py-16 dark:via-emerald-950/20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(16,185,129,0.15),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.header
            initial={entrance}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/25 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Information security
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Commitment to ISO 27001
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground dark:text-slate-300">
              SpareFinder.org is establishing and maintaining an Information Security Management System aligned with ISO/IEC 27001:2022.
            </p>
          </motion.header>

          <section className="mt-12 rounded-2xl border border-border bg-card/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
            <h2 className="text-2xl font-semibold">Our commitment</h2>
            <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground dark:text-slate-300">
              <p>Robust information security protects customer data, intellectual property, and the integrity of our operations. Our goal is to achieve formal ISO 27001 certification within the next 12-18 months.</p>
              <p>Until certification is achieved, we are implementing the controls and processes set out in the standard across relevant areas of the organisation.</p>
            </div>
          </section>

          <motion.section
            initial={entrance}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35 }}
            className="mt-6 rounded-2xl border border-border bg-card/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8"
          >
            <h2 className="text-2xl font-semibold">Security programme coverage</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {controls.map((control) => (
                <li key={control} className="flex items-start gap-3 text-muted-foreground dark:text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{control}</span>
                </li>
              ))}
            </ul>
          </motion.section>

          <section className="mt-6 rounded-2xl border border-border bg-card/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
            <h2 className="text-2xl font-semibold">Document details</h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground dark:text-slate-400">Document owner</dt><dd className="mt-1 flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-primary" />TPS E&amp;P International Ltd</dd></div>
              <div><dt className="text-muted-foreground dark:text-slate-400">Approval date</dt><dd className="mt-1 font-medium">June 12, 2026</dd></div>
              <div><dt className="text-muted-foreground dark:text-slate-400">Review date</dt><dd className="mt-1 font-medium">December 16, 2026</dd></div>
            </dl>
            <p className="mt-6 text-muted-foreground dark:text-slate-300">
              For security-roadmap or data-protection enquiries, contact{" "}
              <a className="inline-flex items-center gap-1 font-medium text-primary hover:underline" href="mailto:email@sparefinder.org"><Mail className="h-4 w-4" />email@sparefinder.org</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Security;