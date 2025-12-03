import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background text-foreground dark:border-gray-800/50 dark:bg-gradient-to-br dark:from-black dark:via-gray-900/80 dark:to-black">
      <div className="absolute inset-0 bg-gradient-to-t from-[#3A5AFE0A] via-transparent to-[#06B6D40A] dark:from-purple-900/5 dark:to-blue-900/5" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/6 h-96 w-96 rounded-full bg-[#3A5AFE14] blur-3xl dark:bg-purple-500/5" />
        <div className="absolute bottom-1/4 right-1/6 h-96 w-96 rounded-full bg-[#06B6D414] blur-3xl dark:bg-blue-500/5" />
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Top Section */}
        <div className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="mb-6 flex items-center justify-center">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <img 
                  src="/sparefinderlogo.png" 
                  alt="SpareFinder Logo" 
                  className="h-20 w-auto object-contain"
                />
              </motion.div>
            </div>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground dark:text-gray-300">
              Revolutionizing industrial part identification through advanced computer vision and AI
            </p>
          </motion.div>
        </div>

        <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Solutions Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="space-y-6"
          >
            <h4 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground dark:text-white">
              <div className="h-8 w-2 rounded-full bg-gradient-to-b from-purple-500 to-blue-500" />
              Solutions
            </h4>
            <ul className="space-y-4">
              {[
                { name: 'AI Computer Vision', desc: 'Advanced image recognition' },
                { name: 'Part Database', desc: '10M+ verified components' },
                { name: 'Quality Control', desc: 'Automated defect detection' },
                { name: 'Supply Chain', desc: 'Real-time availability' }
              ].map((item) => (
                <li key={item.name} className="group">
                  <a
                    href="#"
                    className="block -m-3 rounded-lg p-3 transition-all duration-300 hover:bg-muted dark:hover:bg-gray-800/30"
                  >
                    <div className="font-medium text-foreground group-hover:text-foreground dark:text-gray-300 dark:group-hover:text-white">
                      {item.name}
                    </div>
                    <div className="text-sm text-muted-foreground group-hover:text-foreground/80 dark:text-gray-500 dark:group-hover:text-gray-400">
                      {item.desc}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Industries Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-6"
          >
            <h4 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground dark:text-white">
              <div className="h-8 w-2 rounded-full bg-gradient-to-b from-green-500 to-emerald-500" />
              Industries
            </h4>
            <ul className="space-y-4">
              {[
                { name: 'Automotive', desc: 'Vehicle components' },
                { name: 'Aerospace', desc: 'Aviation parts' },
                { name: 'Manufacturing', desc: 'Industrial equipment' },
                { name: 'Electronics', desc: 'Circuit components' }
              ].map((item) => (
                <li key={item.name} className="group">
                  <a
                    href="#"
                    className="block -m-3 rounded-lg p-3 transition-all duration-300 hover:bg-muted dark:hover:bg-gray-800/30"
                  >
                    <div className="font-medium text-foreground group-hover:text-foreground dark:text-gray-300 dark:group-hover:text-white">
                      {item.name}
                    </div>
                    <div className="text-sm text-muted-foreground group-hover:text-foreground/80 dark:text-gray-500 dark:group-hover:text-gray-400">
                      {item.desc}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-6"
          >
            <h4 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground dark:text-white">
              <div className="h-8 w-2 rounded-full bg-gradient-to-b from-orange-500 to-red-500" />
              Resources
            </h4>
            <ul className="space-y-4">
              {[
                { name: 'Documentation', desc: 'Complete API guide' },
                { name: 'Case Studies', desc: 'Success stories' },
                { name: 'Support Center', desc: '24/7 assistance' },
                { name: 'Developer API', desc: 'Integration tools' }
              ].map((item) => (
                <li key={item.name} className="group">
                  <a
                    href="#"
                    className="block -m-3 rounded-lg p-3 transition-all duration-300 hover:bg-muted dark:hover:bg-gray-800/30"
                  >
                    <div className="font-medium text-foreground group-hover:text-foreground dark:text-gray-300 dark:group-hover:text-white">
                      {item.name}
                    </div>
                    <div className="text-sm text-muted-foreground group-hover:text-foreground/80 dark:text-gray-500 dark:group-hover:text-gray-400">
                      {item.desc}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Newsletter Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="space-y-6"
          >
            <h4 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground dark:text-white">
              <div className="h-8 w-2 rounded-full bg-gradient-to-b from-yellow-500 to-orange-500" />
              Stay Connected
            </h4>
            <div className="space-y-4">
              <p className="text-muted-foreground dark:text-gray-400">
                Get the latest updates on AI technology and industry insights.
              </p>
              <div className="relative group">
                <input 
                  type="email"
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-border bg-card py-4 px-5 text-sm text-foreground placeholder:text-muted-foreground shadow-soft-elevated backdrop-blur-xl focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500"
                />
                <Button className="absolute right-2 top-2 rounded-lg bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#06B6D4] px-6 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:from-[#324EDC] hover:via-[#3A5AFE] hover:to-[#0891B2] dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700">
                  Subscribe
                </Button>
              </div>
              <p className="text-sm text-muted-foreground dark:text-gray-500">
                Join 25,000+ professionals • No spam, unsubscribe anytime
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4 pt-4">
                {[
                  { name: 'GitHub', icon: '🔗', color: 'from-gray-600 to-gray-700' },
                  { name: 'LinkedIn', icon: '💼', color: 'from-blue-600 to-blue-700' },
                  { name: 'Twitter', icon: '🐦', color: 'from-cyan-500 to-blue-500' },
                  { name: 'Discord', icon: '💬', color: 'from-indigo-600 to-purple-600' }
                ].map((social) => (
                  <motion.a
                    key={social.name}
                    href="#"
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${social.color} text-white font-semibold shadow-lg transition-transform duration-300 hover:scale-110`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Divider */}
        <div className="relative mb-12">
            <div className="absolute inset-0 flex items-center">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent dark:via-gray-700" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background px-4 dark:bg-black">
              <div className="h-px w-12 bg-gradient-to-r from-[#3A5AFE] to-[#8B5CF6] dark:from-purple-500 dark:to-blue-500" />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between space-y-8 lg:flex-row lg:space-y-0">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col items-center space-y-4 text-center sm:flex-row sm:space-x-8 sm:space-y-0 sm:text-left"
          >
            <span className="font-medium text-muted-foreground dark:text-gray-400">
              © 2025 SpareFinder. All rights reserved.
            </span>
            <div className="flex space-x-6">
              <Link
                to="/privacy-policy"
                className="text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-primary dark:text-gray-500 dark:hover:text-purple-400"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-of-service"
                className="text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-primary dark:text-gray-500 dark:hover:text-purple-400"
              >
                Terms of Service
              </Link>
              <Link
                to="/security"
                className="text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-primary dark:text-gray-500 dark:hover:text-purple-400"
              >
                Security
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex items-center space-x-4"
          >
            <span className="text-sm font-medium text-muted-foreground dark:text-gray-500">
              Secured by
            </span>
            <div className="flex space-x-3">
              {["SSL", "SOC2", "GDPR"].map((cert) => (
                <motion.div
                  key={cert}
                  className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm dark:border-gray-700/30 dark:bg-gray-800/50 dark:text-gray-400"
                  whileHover={{ scale: 1.05, borderColor: '#8B5CF6' }}
                  transition={{ duration: 0.2 }}
                >
                  {cert}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 