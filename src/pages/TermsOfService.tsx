import { motion } from 'framer-motion';
import { Scale, ArrowLeft, Mail, Building2, FileText, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sectionNum = (n: number) => (
  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
    {n}
  </span>
);

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10 dark:from-blue-900/20 dark:via-background dark:to-purple-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Scale className="h-4 w-4" />
              Legal
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Terms of Use
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">Sparefinder.org</p>
            <p className="mt-2 text-sm text-muted-foreground/80">Last updated: January 9, 2026</p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Intro */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/50 px-6 py-6 shadow-sm backdrop-blur-sm dark:bg-card/30"
          >
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Use govern your access to and use of Sparefinder.org (the “Service”).
              By accessing or using the Service, you agree to be bound by these Terms.
            </p>
          </motion.div>

          {/* Section 1 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(1)}
              <h2 className="text-xl font-bold text-foreground">Who we are</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Sparefinder.org is owned and operated by TPS E&P International Ltd, a company
              registered in England and Wales, Company Number 15607982.
            </p>
            <div className="mt-4 flex flex-col gap-1 rounded-xl bg-muted/50 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                Registered Office: Durham Workspace, Abbey Road, Pity Me, DH1 5JZ, UK
              </span>
              <a href="mailto:email@sparefinder.org" className="text-primary hover:underline">
                email@sparefinder.org
              </a>
              <a href="https://sparefinder.org" className="text-primary hover:underline">
                https://sparefinder.org
              </a>
            </div>
          </motion.article>

          {/* Section 2 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(2)}
              <h2 className="text-xl font-bold text-foreground">Additional service‑specific terms</h2>
            </div>
            <p className="text-muted-foreground mb-2"><strong className="text-foreground">2.1</strong> Certain features or services may be subject to additional terms, including:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>Paid subscription terms</li>
              <li>API usage terms</li>
              <li>Enterprise or business agreements</li>
            </ul>
            <p className="text-muted-foreground">
              <strong className="text-foreground">2.2</strong> Where additional terms apply, they shall form part of these Terms. In the event of conflict, the additional terms shall prevail.
            </p>
          </motion.article>

          {/* Section 3 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(3)}
              <h2 className="text-xl font-bold text-foreground">Registration and access</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">3.1</strong> You may need to create an account to access certain features.</li>
              <li><strong className="text-foreground">3.2</strong> You must provide accurate, current, and complete information during registration.</li>
              <li><strong className="text-foreground">3.3</strong> You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li><strong className="text-foreground">3.4</strong> We reserve the right to refuse or revoke access at our discretion.</li>
            </ul>
          </motion.article>

          {/* Section 4 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(4)}
              <h2 className="text-xl font-bold text-foreground">Using our services</h2>
            </div>
            <p className="text-muted-foreground"><strong className="text-foreground">4.1</strong> You agree to use the Service only for lawful purposes.</p>
            <p className="mt-2 text-muted-foreground"><strong className="text-foreground">4.2</strong> You must not:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-2">
              <li>Misuse or interfere with the Service</li>
              <li>Attempt unauthorised access</li>
              <li>Reverse engineer or duplicate the Service</li>
              <li>Use the Service for fraudulent or misleading activities</li>
            </ul>
            <p className="mt-2 text-muted-foreground"><strong className="text-foreground">4.3</strong> We may modify or discontinue any part of the Service without notice.</p>
          </motion.article>

          {/* Section 5 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(5)}
              <h2 className="text-xl font-bold text-foreground">Content</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">5.1</strong> You retain ownership of content you upload.</li>
              <li><strong className="text-foreground">5.2</strong> By uploading content, you grant Sparefinder a non‑exclusive, royalty‑free licence to process such content solely to provide the Service.</li>
              <li><strong className="text-foreground">5.3</strong> You warrant that you have the right to upload such content and that it does not infringe third‑party rights.</li>
            </ul>
          </motion.article>

          {/* Section 6 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(6)}
              <h2 className="text-xl font-bold text-foreground">Our intellectual property rights</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">6.1</strong> All intellectual property rights in the Service, including software, AI models, branding, and content, are owned by TPS E&P International Ltd.</li>
              <li><strong className="text-foreground">6.2</strong> You may not copy, modify, distribute, or create derivative works without written permission.</li>
            </ul>
          </motion.article>

          {/* Section 7 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(7)}
              <h2 className="text-xl font-bold text-foreground">Paid accounts</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">7.1</strong> Certain features may require payment.</li>
              <li><strong className="text-foreground">7.2</strong> Fees are payable in advance and are non‑refundable unless required by law.</li>
              <li><strong className="text-foreground">7.3</strong> We may change pricing with reasonable notice.</li>
              <li><strong className="text-foreground">7.4</strong> Failure to pay may result in suspension or termination.</li>
            </ul>
          </motion.article>

          {/* Section 8 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(8)}
              <h2 className="text-xl font-bold text-foreground">Termination and suspension</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">8.1</strong> We may suspend or terminate access immediately if you breach these Terms.</li>
              <li><strong className="text-foreground">8.2</strong> Upon termination, your right to use the Service ceases.</li>
              <li><strong className="text-foreground">8.3</strong> Clauses relating to IP, liability, and disputes shall survive termination.</li>
            </ul>
          </motion.article>

          {/* Section 9 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(9)}
              <h2 className="text-xl font-bold text-foreground">Dispute resolution</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">9.1</strong> We encourage informal resolution in the first instance.</li>
              <li><strong className="text-foreground">9.2</strong> These Terms are governed by the laws of England and Wales.</li>
              <li><strong className="text-foreground">9.3</strong> The courts of England and Wales have exclusive jurisdiction.</li>
            </ul>
          </motion.article>

          {/* Section 10 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(10)}
              <h2 className="text-xl font-bold text-foreground">Copyright complaints</h2>
            </div>
            <p className="text-muted-foreground"><strong className="text-foreground">10.1</strong> If you believe content infringes your copyright, contact: <a href="mailto:copyright@sparefinder.org" className="text-primary hover:underline">copyright@sparefinder.org</a></p>
            <p className="mt-2 text-muted-foreground"><strong className="text-foreground">10.2</strong> Include: identification of the copyrighted work, description of the infringement, and your contact details.</p>
          </motion.article>

          {/* Section 11 */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(11)}
              <h2 className="text-xl font-bold text-foreground">General terms</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">11.1</strong> We may update these Terms from time to time.</li>
              <li><strong className="text-foreground">11.2</strong> If any provision is found unenforceable, the remainder shall remain in force.</li>
              <li><strong className="text-foreground">11.3</strong> No waiver shall be deemed a waiver of any subsequent breach.</li>
            </ul>
          </motion.article>

          {/* Business Addendum */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 dark:bg-primary/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                <FileText className="h-4 w-4 text-primary" />
              </span>
              <h2 className="text-xl font-bold text-foreground">Business use of service addendum</h2>
            </div>
            <p className="text-muted-foreground mb-4">This Addendum applies where the Service is used for business, commercial, or professional purposes.</p>
            <p className="text-muted-foreground"><strong className="text-foreground">B1.</strong> Business users acknowledge that consumer protection laws (including the Consumer Rights Act 2015) do not apply.</p>
            <p className="mt-2 text-muted-foreground"><strong className="text-foreground">B2.</strong> To the fullest extent permitted by law, Sparefinder excludes liability for: loss of profits, business interruption, loss of data.</p>
            <p className="mt-2 text-muted-foreground"><strong className="text-foreground">B3.</strong> Business users are responsible for ensuring compliance with applicable laws and regulations.</p>
          </motion.article>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-background to-primary/5 dark:from-primary/10 dark:to-primary/10" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-2xl rounded-3xl border border-border bg-card/80 px-8 py-10 text-center shadow-xl shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
        >
          <Shield className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">Questions about these terms?</h2>
          <p className="mt-2 text-muted-foreground">Contact us for any questions regarding the Terms of Use.</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href="mailto:email@sparefinder.org"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-blue-700 hover:to-purple-700 hover:shadow-purple-500/30"
            >
              <Mail className="h-5 w-5" />
              email@sparefinder.org
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 font-semibold text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Home
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsOfService;
