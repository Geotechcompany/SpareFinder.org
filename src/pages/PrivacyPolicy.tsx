import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Mail, Building2, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sectionNum = (n: number) => (
  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
    {n}
  </span>
);

const PrivacyPolicy = () => {
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
              <Shield className="h-4 w-4" />
              Legal
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Data Protection & Privacy Policy
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">Sparefinder.org</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-700 dark:text-green-300">
              <Shield className="h-4 w-4" />
              Last updated: January 9th, 2026
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* 1. Introduction */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(1)}
              <h2 className="text-xl font-bold text-foreground">Introduction</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Sparefinder.org (“Sparefinder”, “we”, “us”, or “our”) is committed to protecting and
              respecting your privacy. This Data Protection & Privacy Policy explains how we
              collect, use, store, and protect your personal data when you use our website and
              services, in accordance with the UK General Data Protection Regulation (UK GDPR) and
              the Data Protection Act 2018. Sparefinder is owned and operated by TPS E&P
              International Ltd.
            </p>
          </motion.article>

          {/* 2. Data Controller */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(2)}
              <h2 className="text-xl font-bold text-foreground">Data Controller</h2>
            </div>
            <p className="text-muted-foreground mb-4">For the purposes of data protection law, the Data Controller is:</p>
            <div className="rounded-xl bg-muted/50 px-4 py-4 text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                TPS E&P International Ltd
              </span>
              <p className="text-muted-foreground">Registered Address: Durham Workspace, Abbey Road, Pity Me. DH1 5JZ Durham. UK</p>
              <a href="mailto:email@sparefinder.org" className="text-primary hover:underline">email@sparefinder.org</a>
              <br />
              <a href="https://sparefinder.org" className="text-primary hover:underline">https://sparefinder.org</a>
            </div>
          </motion.article>

          {/* 3. What Personal Data We Collect */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(3)}
              <h2 className="text-xl font-bold text-foreground">What Personal Data We Collect</h2>
            </div>
            <p className="text-muted-foreground mb-4">We may collect and process the following categories of personal data:</p>
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">3.1 Information You Provide Directly</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Name</li>
              <li>Email address</li>
              <li>Company name</li>
              <li>Enquiry or support messages</li>
              <li>Account registration details (if applicable)</li>
            </ul>
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">3.2 Technical & Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device type and operating system</li>
              <li>Time zone, location (approximate)</li>
              <li>Pages visited and interaction data</li>
            </ul>
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">3.3 Uploaded Content</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Images of spare parts uploaded for identification</li>
              <li>Text prompts or part descriptions</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Uploaded images are analysed by our AI system solely for identification purposes and
              are not used for unrelated profiling.
            </p>
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">3.4 Cookies & Tracking</h3>
            <p className="text-muted-foreground">Please see Section 10 for details on cookies.</p>
          </motion.article>

          {/* 4. Lawful Basis Table */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(4)}
              <h2 className="text-xl font-bold text-foreground">How We Use Your Data (Lawful Basis)</h2>
            </div>
            <p className="text-muted-foreground mb-4">We process personal data only where we have a lawful basis under UK GDPR:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-3 px-4 font-semibold text-foreground">Purpose</th>
                    <th className="py-3 px-4 font-semibold text-foreground">Lawful Basis</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">To provide and operate the Sparefinder service</td>
                    <td className="py-3 px-4">Performance of a contract</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">To analyse uploaded images and identify spare parts</td>
                    <td className="py-3 px-4">Performance of a contract</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">To respond to enquiries</td>
                    <td className="py-3 px-4">Legitimate interests</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">To improve platform performance and security</td>
                    <td className="py-3 px-4">Legitimate interests</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">To comply with legal obligations</td>
                    <td className="py-3 px-4">Legal obligation</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">Marketing communications (if applicable)</td>
                    <td className="py-3 px-4">Consent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.article>

          {/* 5. AI Processing */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(5)}
              <h2 className="text-xl font-bold text-foreground">AI Processing & Automated Decision‑Making</h2>
            </div>
            <p className="text-muted-foreground">
              Sparefinder uses AI‑powered systems to analyse uploaded images and data for
              spare‑part identification.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-muted-foreground">
              <li>No automated decisions are made that have legal or significant effects on individuals.</li>
              <li>Human oversight is available upon request.</li>
              <li>AI processing is limited to the intended technical purpose.</li>
            </ul>
          </motion.article>

          {/* 6. Data Sharing */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(6)}
              <h2 className="text-xl font-bold text-foreground">Data Sharing & Third Parties</h2>
            </div>
            <p className="text-muted-foreground">We do not sell your personal data. We may share data only with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-muted-foreground">
              <li>Cloud hosting providers</li>
              <li>Analytics and performance tools</li>
              <li>Security and fraud‑prevention services</li>
              <li>Payment processors (if applicable)</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              All third‑party providers are contractually required to comply with UK GDPR and
              maintain appropriate security measures.
            </p>
          </motion.article>

          {/* 7. International Transfers */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(7)}
              <h2 className="text-xl font-bold text-foreground">International Data Transfers</h2>
            </div>
            <p className="text-muted-foreground">Where personal data is transferred outside the UK:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-muted-foreground">
              <li>Appropriate safeguards are applied (such as Standard Contractual Clauses)</li>
              <li>Data is transferred only to compliant jurisdictions or providers</li>
            </ul>
          </motion.article>

          {/* 8. Data Retention */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(8)}
              <h2 className="text-xl font-bold text-foreground">Data Retention</h2>
            </div>
            <p className="text-muted-foreground">We retain personal data only for as long as necessary, including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-muted-foreground">
              <li><strong className="text-foreground">Account data:</strong> for the duration of the account</li>
              <li><strong className="text-foreground">Uploaded images:</strong> temporarily for processing unless retention is required for service improvement (anonymised where possible)</li>
              <li><strong className="text-foreground">Legal and compliance data:</strong> as required by law</li>
            </ul>
          </motion.article>

          {/* 9. Data Security */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(9)}
              <h2 className="text-xl font-bold text-foreground">Data Security</h2>
            </div>
            <p className="text-muted-foreground">
              We implement appropriate technical and organisational measures to protect your data,
              including:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-muted-foreground">
              <li>Encryption in transit and at rest</li>
              <li>Secure cloud infrastructure</li>
              <li>Restricted access controls</li>
              <li>Regular security monitoring</li>
              <li>Protection of server IP addresses and credentials</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Despite our efforts, no system is completely secure. We continuously improve our
              security practices.
            </p>
          </motion.article>

          {/* 10. Cookies */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(10)}
              <h2 className="text-xl font-bold text-foreground">Cookies</h2>
            </div>
            <p className="text-muted-foreground">Sparefinder uses cookies to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-muted-foreground">
              <li>Ensure website functionality</li>
              <li>Improve user experience</li>
              <li>Analyse website traffic</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              You can manage or disable cookies via your browser settings. Where required, cookie
              consent is obtained.
            </p>
          </motion.article>

          {/* 11. Your Rights */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(11)}
              <h2 className="text-xl font-bold text-foreground">Your Data Protection Rights</h2>
            </div>
            <p className="text-muted-foreground">Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure (“right to be forgotten”)</li>
              <li>Restrict processing</li>
              <li>Object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              To exercise your rights, contact:{' '}
              <a href="mailto:email@sparefinder.org" className="text-primary hover:underline">email@sparefinder.org</a>
            </p>
          </motion.article>

          {/* 12. Complaints */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(12)}
              <h2 className="text-xl font-bold text-foreground">Complaints</h2>
            </div>
            <p className="text-muted-foreground">
              If you are unhappy with how we handle your data, you have the right to lodge a
              complaint with:
            </p>
            <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm">
              <span className="font-medium text-foreground">Information Commissioner’s Office (ICO)</span>
              <br />
              <a href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.ico.org.uk</a>
              <br />
              <span className="text-muted-foreground">Telephone: 0303 123 1113</span>
            </div>
          </motion.article>

          {/* 13. Children's Data */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(13)}
              <h2 className="text-xl font-bold text-foreground">Children’s Data</h2>
            </div>
            <p className="text-muted-foreground">
              Sparefinder is not intended for use by individuals under the age of 18. We do not
              knowingly collect children’s personal data.
            </p>
          </motion.article>

          {/* 14. Changes */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-lg shadow-black/5 dark:bg-card/50 dark:shadow-none dark:ring-1 dark:ring-white/5"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(14)}
              <h2 className="text-xl font-bold text-foreground">Changes to This Policy</h2>
            </div>
            <p className="text-muted-foreground">
              We may update this policy from time to time. Any changes will be published on this
              page with an updated revision date.
            </p>
          </motion.article>

          {/* 15. Contact */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 dark:bg-primary/10"
          >
            <div className="flex items-center gap-3 mb-4">
              {sectionNum(15)}
              <h2 className="text-xl font-bold text-foreground">Contact Us</h2>
            </div>
            <p className="text-muted-foreground">For all data protection enquiries:</p>
            <p className="mt-2">
              <a href="mailto:email@sparefinder.org" className="text-primary hover:underline">email@sparefinder.org</a>
              <br />
              <a href="https://sparefinder.org" className="text-primary hover:underline">https://sparefinder.org</a>
            </p>
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
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">Questions About Your Privacy?</h2>
          <p className="mt-2 text-muted-foreground">Contact us for any data protection enquiries.</p>
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

export default PrivacyPolicy;
