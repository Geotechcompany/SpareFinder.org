import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, Eye, Lock, Database, UserCheck, Globe, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  const sections = [
    {
      title: "Information We Collect",
      icon: Database,
      content: [
        "Personal Information: Name, email address, company details when you register",
        "Usage Data: How you interact with our AI part recognition system",
        "Technical Data: IP address, browser type, device information",
        "Part Images: Photos and files you upload for identification",
        "Communication Data: Support requests and feedback"
      ]
    },
    {
      title: "How We Use Your Information",
      icon: UserCheck,
      content: [
        "Provide and improve our AI part identification services",
        "Process your requests and provide customer support",
        "Send important updates about your account and our services",
        "Analyze usage patterns to enhance our AI algorithms",
        "Ensure security and prevent fraudulent activities"
      ]
    },
    {
      title: "Data Security",
      icon: Lock,
      content: [
        "End-to-end encryption for all data transmission",
        "SOC 2 Type II compliant infrastructure",
        "Regular security audits and penetration testing",
        "Secure cloud storage with enterprise-grade protection",
        "Access controls and employee security training"
      ]
    },
    {
      title: "Data Sharing",
      icon: Globe,
      content: [
        "We do not sell your personal information to third parties",
        "Limited sharing with trusted service providers under strict agreements",
        "Legal compliance when required by law enforcement",
        "Anonymous usage statistics for industry research",
        "Your explicit consent for any other sharing"
      ]
    },
    {
      title: "Your Rights",
      icon: Eye,
      content: [
        "Access your personal data and request copies",
        "Correct inaccurate or incomplete information",
        "Delete your account and associated data",
        "Opt-out of marketing communications",
        "Data portability to other services"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Your Privacy,
              <span className="block bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Our Priority
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              We're committed to protecting your data and being transparent about how we collect, 
              use, and secure your information in our AI-powered part identification platform.
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
              <Shield className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-green-300 font-medium">Last updated: December 2024</span>
            </div>
          </motion.div>
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
                <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 p-8 hover:border-purple-500/30 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                      <section.icon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  </div>
                  <ul className="space-y-4">
                    {section.content.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
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

      {/* Contact Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-900/50 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-white mb-6">
              Questions About Your Privacy?
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Our privacy team is here to help. Contact us for any questions about how we handle your data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 text-lg">
                Contact Privacy Team
              </Button>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3 text-lg">
                Download Privacy Policy PDF
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy; 