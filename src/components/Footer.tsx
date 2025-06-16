import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="relative border-t border-gray-800/50 bg-gradient-to-br from-black via-gray-900/80 to-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/5 via-transparent to-blue-900/5" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        {/* Top Section */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center space-x-4 mb-6">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-60" />
                <div className="relative w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-8 h-8 text-white" />
                  </motion.div>
                </div>
              </motion.div>
              <div>
                <h3 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  SpareFinder
                </h3>
                <p className="text-gray-400 text-sm">Industrial AI Excellence</p>
              </div>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Revolutionizing industrial part identification through advanced computer vision and AI
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* Solutions Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="space-y-6"
          >
            <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
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
                  <a href="#" className="block hover:bg-gray-800/30 rounded-lg p-3 -m-3 transition-all duration-300">
                    <div className="text-gray-300 group-hover:text-white font-medium">{item.name}</div>
                    <div className="text-gray-500 text-sm group-hover:text-gray-400">{item.desc}</div>
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
            <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
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
                  <a href="#" className="block hover:bg-gray-800/30 rounded-lg p-3 -m-3 transition-all duration-300">
                    <div className="text-gray-300 group-hover:text-white font-medium">{item.name}</div>
                    <div className="text-gray-500 text-sm group-hover:text-gray-400">{item.desc}</div>
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
            <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full" />
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
                  <a href="#" className="block hover:bg-gray-800/30 rounded-lg p-3 -m-3 transition-all duration-300">
                    <div className="text-gray-300 group-hover:text-white font-medium">{item.name}</div>
                    <div className="text-gray-500 text-sm group-hover:text-gray-400">{item.desc}</div>
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
            <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full" />
              Stay Connected
            </h4>
            <div className="space-y-4">
              <p className="text-gray-400">Get the latest updates on AI technology and industry insights.</p>
              <div className="relative group">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="w-full bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-xl py-4 px-5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                />
                <Button className="absolute right-2 top-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-2 rounded-lg text-sm font-semibold transform hover:scale-105 transition-all duration-300">
                  Subscribe
                </Button>
              </div>
              <p className="text-gray-500 text-sm">
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
                    className={`w-12 h-12 bg-gradient-to-r ${social.color} rounded-xl flex items-center justify-center text-white font-semibold hover:scale-110 transition-transform duration-300 shadow-lg`}
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
            <div className="w-full border-t border-gradient-to-r from-transparent via-gray-700 to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <div className="px-4 bg-black">
              <div className="w-12 h-px bg-gradient-to-r from-purple-500 to-blue-500" />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center space-y-8 lg:space-y-0">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8 text-center sm:text-left"
          >
            <span className="text-gray-400 font-medium">© 2025 SpareFinder. All rights reserved.</span>
            <div className="flex space-x-6">
              <Link to="/privacy-policy" className="text-gray-500 hover:text-purple-400 text-sm font-medium transition-colors duration-300">Privacy Policy</Link>
              <Link to="/terms-of-service" className="text-gray-500 hover:text-purple-400 text-sm font-medium transition-colors duration-300">Terms of Service</Link>
              <Link to="/security" className="text-gray-500 hover:text-purple-400 text-sm font-medium transition-colors duration-300">Security</Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex items-center space-x-4"
          >
            <span className="text-gray-500 text-sm font-medium">Secured by</span>
            <div className="flex space-x-3">
              {['SSL', 'SOC2', 'GDPR'].map((cert, index) => (
                <motion.div
                  key={cert}
                  className="px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700/30 text-gray-400 text-xs font-semibold"
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