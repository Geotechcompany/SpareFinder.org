import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FileText, Scale, AlertTriangle, Users, CreditCard, Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TermsOfService = () => {
  const sections = [
    {
      title: "Service Description",
      icon: FileText,
      content: [
        "SpareFinder provides AI-powered industrial part identification services",
        "Access to our comprehensive database of 10+ million verified parts",
        "Real-time part specifications and supplier information",
        "API access for enterprise integration and automation",
        "24/7 customer support and technical assistance"
      ]
    },
    {
      title: "User Responsibilities",
      icon: Users,
      content: [
        "Provide accurate information during registration and use",
        "Use the service only for legitimate business purposes",
        "Comply with all applicable laws and regulations",
        "Respect intellectual property rights of part manufacturers",
        "Report any security vulnerabilities or misuse to our team"
      ]
    },
    {
      title: "Acceptable Use Policy",
      icon: Scale,
      content: [
        "Do not attempt to reverse engineer our AI algorithms",
        "No automated scraping or bulk downloading without permission",
        "Respect rate limits and fair usage guidelines",
        "Do not upload malicious files or attempt system intrusion",
        "Commercial use requires appropriate licensing agreement"
      ]
    },
    {
      title: "Payment Terms",
      icon: CreditCard,
      content: [
        "Subscription fees are billed monthly or annually in advance",
        "Free tier includes 5 part identifications per month",
        "Enterprise plans include custom pricing and SLA agreements",
        "Refunds available within 30 days of initial subscription",
        "Price changes will be communicated 30 days in advance"
      ]
    },
    {
      title: "Intellectual Property",
      icon: Shield,
      content: [
        "SpareFinder retains all rights to our AI models and algorithms",
        "Part data remains property of respective manufacturers",
        "Users retain rights to their uploaded images and data",
        "Limited license granted to use our service as intended",
        "Trademark and brand names are property of their owners"
      ]
    },
    {
      title: "Limitation of Liability",
      icon: AlertTriangle,
      content: [
        "Service provided 'as is' without warranties of any kind",
        "We strive for 99.9% accuracy but cannot guarantee perfection",
        "Users responsible for verifying part compatibility and safety",
        "Maximum liability limited to fees paid in the last 12 months",
        "Not liable for indirect or consequential damages"
      ]
    }
  ];

  const highlights = [
    {
      title: "Service Availability",
      desc: "99.9% uptime SLA with enterprise plans",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Data Security",
      desc: "SOC 2 Type II compliance and encryption",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Fair Usage",
      desc: "Reasonable limits to ensure quality for all",
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Terms of
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Service
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Clear, fair terms that protect both you and SpareFinder. 
              We believe in transparency and building trust through our service agreements.
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30">
              <Scale className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-blue-300 font-medium">Effective: December 2024</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Highlights */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {highlights.map((highlight, index) => (
              <motion.div
                key={highlight.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                className="text-center"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${highlight.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <Scale className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{highlight.title}</h3>
                <p className="text-gray-400">{highlight.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-16">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                className="group"
              >
                <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 p-8 hover:border-blue-500/30 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                      <section.icon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  </div>
                  <ul className="space-y-4">
                    {section.content.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-900/20 to-red-900/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-orange-500/30 p-8"
          >
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-orange-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Important Notice</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  While our AI achieves 99.9% accuracy, always verify part compatibility and safety requirements 
                  for your specific application. SpareFinder is a tool to assist in part identification, 
                  not a substitute for professional engineering judgment.
                </p>
                <p className="text-gray-400 text-sm">
                  These terms may be updated periodically. Continued use of our service constitutes acceptance of any changes.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-white mb-6">
              Questions About These Terms?
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Our legal team is available to clarify any aspects of our terms of service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg">
                Contact Legal Team
              </Button>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3 text-lg">
                Download Terms PDF
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsOfService; 